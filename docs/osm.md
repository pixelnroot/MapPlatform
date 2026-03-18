# docs/osm.md — OSM Import Script & Overpass API

> Read this before touching osmImport.js or anything related to
> OpenStreetMap data. The full Overpass API query format, OSM element
> parsing logic, tag-to-category mapping, and script flow are all
> defined here. Do not call the Overpass API from anywhere except
> the import script.

---

## 1. Core Concept

We never call OpenStreetMap in real time during user requests.
The import is a one-time offline script per region:

```
Run script with region name + bbox
        ↓
Call Overpass API → get raw OSM JSON
        ↓
Parse nodes → insert into places table
Parse ways (highway) → insert into roads table
        ↓
Log results. Done.
```

The script is **idempotent**. Run it 10 times on the same region —
the database stays the same. Duplicate prevention is via
`ON CONFLICT (osm_id) DO NOTHING`.

---

## 2. Script Usage

```bash
# Format
node backend/src/scripts/osmImport.js "<region_name>" "<bbox>"

# bbox format: minLat,minLng,maxLat,maxLng
node backend/src/scripts/osmImport.js "Dhaka City" "23.65,90.27,23.88,90.50"
node backend/src/scripts/osmImport.js "Chattogram City" "22.20,91.70,22.45,91.95"
node backend/src/scripts/osmImport.js "Los Angeles" "33.70,-118.67,34.34,-118.15"
```

**Arguments:**
- `argv[2]` — region name (must match exactly a `name` in regions table)
- `argv[3]` — bounding box string `minLat,minLng,maxLat,maxLng`

---

## 3. Overpass API Details

| Property | Value |
|---|---|
| Endpoint | `https://overpass-api.de/api/interpreter` |
| Method | `POST` |
| Content-Type | `application/x-www-form-urlencoded` |
| Body key | `data` |
| Response format | JSON |
| Timeout | 60 seconds per request |
| Docs | https://wiki.openstreetmap.org/wiki/Overpass_API |
| Query language | https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL |
| Interactive tester | https://overpass-turbo.eu/ |

**Overpass bbox order:** `south,west,north,east`
Which equals our: `minLat,minLng,maxLat,maxLng` — same order, no conversion needed.

---

## 4. Overpass Query

Use this exact query template. Replace `{S}`, `{W}`, `{N}`, `{E}`
with the parsed bbox values.

```
[out:json][timeout:60];
(
  node["name"]({S},{W},{N},{E});
  node["amenity"]({S},{W},{N},{E});
  node["shop"]({S},{W},{N},{E});
  node["tourism"]({S},{W},{N},{E});
  node["healthcare"]({S},{W},{N},{E});
  way["highway"]({S},{W},{N},{E});
  way["building"]["name"]({S},{W},{N},{E});
);
out body;
>;
out skel qt;
```

**What each line fetches:**
- `node["name"]` — any named point (shops, landmarks, etc.)
- `node["amenity"]` — hospitals, schools, banks, mosques, etc.
- `node["shop"]` — all shop types
- `node["tourism"]` — tourist attractions, hotels, viewpoints
- `node["healthcare"]` — clinics, pharmacies, doctors
- `way["highway"]` — all road and path lines
- `way["building"]["name"]` — named buildings as polygons

**`out body;` + `>;` + `out skel qt;`** — This fetches both
element data (tags, metadata) AND the node coordinates that
make up ways (roads/buildings). Required to reconstruct geometries.

---

## 5. OSM Response Structure

The Overpass API returns JSON like this:

```json
{
  "elements": [
    {
      "type": "node",
      "id": 123456789,
      "lat": 23.7749,
      "lon": 90.3994,
      "tags": {
        "name": "Ahmed Store",
        "amenity": "marketplace",
        "phone": "+880 1711-000000",
        "opening_hours": "Mo-Sa 09:00-22:00"
      }
    },
    {
      "type": "way",
      "id": 987654321,
      "nodes": [111, 222, 333],
      "tags": {
        "highway": "primary",
        "name": "Mirpur Road"
      }
    },
    {
      "type": "node",
      "id": 111,
      "lat": 23.77,
      "lon": 90.39
    }
  ]
}
```

**Important:** Ways do not contain coordinates directly.
Their `nodes` array contains node IDs. To get the coordinates
of a way, look up each node ID in the elements array.
This is why `>;` is in the query — it fetches those referenced nodes.

---

## 6. Import Script Logic (Step by Step)

```js
// backend/src/scripts/osmImport.js

const fetch = require('node-fetch')
const { v4: uuidv4 } = require('uuid')
const db = require('../db')
require('dotenv').config()

async function main() {
  // Step 1 — Parse arguments
  const regionName = process.argv[2]
  const bboxStr    = process.argv[3]

  if (!regionName || !bboxStr) {
    console.error('Usage: node osmImport.js "<region>" "<minLat,minLng,maxLat,maxLng>"')
    process.exit(1)
  }

  const [minLat, minLng, maxLat, maxLng] = bboxStr.split(',').map(Number)
  if ([minLat, minLng, maxLat, maxLng].some(isNaN)) {
    console.error('Invalid bbox. Must be minLat,minLng,maxLat,maxLng')
    process.exit(1)
  }

  // Step 2 — Find region in database
  const regionResult = await db.query(
    'SELECT id FROM regions WHERE name = $1', [regionName]
  )
  if (!regionResult.rows.length) {
    console.error(`Region "${regionName}" not found in database.`)
    console.error('Run seed.sql first or add the region via admin panel.')
    process.exit(1)
  }
  const regionId = regionResult.rows[0].id
  console.log(`Found region: ${regionName} (${regionId})`)

  // Step 3 — Load categories from DB
  const catResult = await db.query('SELECT id, name FROM categories')
  const categories = catResult.rows // [{id, name}, ...]

  // Step 4 — Fetch from Overpass API
  const query = buildOverpassQuery(minLat, minLng, maxLat, maxLng)
  console.log('Fetching from Overpass API...')
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  })

  if (!response.ok) {
    console.error('Overpass API error:', response.status)
    process.exit(1)
  }

  const osmData = await response.json()
  const elements = osmData.elements || []
  console.log(`Received ${elements.length} elements from OSM`)

  // Step 5 — Separate nodes and ways, build node lookup map
  const nodeMap = {}   // id → {lat, lon} for way coordinate lookup
  const nodes   = []   // nodes with tags (actual places)
  const ways    = []   // ways (roads and buildings)

  for (const el of elements) {
    if (el.type === 'node') {
      nodeMap[el.id] = { lat: el.lat, lon: el.lon }
      if (el.tags && Object.keys(el.tags).length > 0) {
        nodes.push(el)
      }
    } else if (el.type === 'way') {
      ways.push(el)
    }
    // Skip relations for MVP
  }

  // Step 6 — Import nodes as places
  let placesInserted = 0
  let placesSkipped  = 0

  for (const node of nodes) {
    const name = node.tags.name || node.tags['name:en']
    if (!name) continue                  // skip unnamed nodes
    if (!node.lat || !node.lon) continue // skip nodes without coordinates

    const categoryId = mapTagsToCategory(node.tags, categories)

    try {
      const result = await db.query(`
        INSERT INTO places (
          id, name, category_id, region_id,
          lat, lng, geometry,
          phone, opening_hours, address,
          source, osm_id, is_verified
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326),
          $7, $8, $9,
          'osm', $10, FALSE
        )
        ON CONFLICT (osm_id) DO NOTHING
      `, [
        uuidv4(), name, categoryId, regionId,
        node.lat, node.lon,
        node.tags.phone || node.tags['contact:phone'] || null,
        node.tags.opening_hours || null,
        node.tags['addr:full'] || node.tags['addr:street'] || null,
        node.id
      ])

      if (result.rowCount > 0) placesInserted++
      else placesSkipped++
    } catch (e) {
      console.error(`Failed to insert place ${name}:`, e.message)
    }
  }

  // Step 7 — Import ways as roads
  let roadsInserted = 0
  let roadsSkipped  = 0

  for (const way of ways) {
    if (!way.tags) continue

    const isHighway  = !!way.tags.highway
    const isBuilding = !!way.tags.building

    if (!isHighway && !isBuilding) continue
    if (!way.nodes || way.nodes.length < 2) continue

    // Build coordinate array from node IDs
    const coords = way.nodes
      .map(nodeId => nodeMap[nodeId])
      .filter(Boolean)

    if (coords.length < 2) continue  // not enough coords to make a line

    if (isHighway) {
      // Build GeoJSON LineString
      const geojson = JSON.stringify({
        type: 'LineString',
        coordinates: coords.map(n => [n.lon, n.lat]) // GeoJSON = [lng, lat]
      })

      try {
        const result = await db.query(`
          INSERT INTO roads (
            id, name, type, region_id,
            geometry, source, osm_id
          ) VALUES (
            $1, $2, $3, $4,
            ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
            'osm', $6
          )
          ON CONFLICT (osm_id) DO NOTHING
        `, [
          uuidv4(),
          way.tags.name || null,
          way.tags.highway,
          regionId,
          geojson,
          way.id
        ])

        if (result.rowCount > 0) roadsInserted++
        else roadsSkipped++
      } catch (e) {
        console.error(`Failed to insert road ${way.tags.name}:`, e.message)
      }
    }
    // Skip building ways for MVP — only roads matter for map display
  }

  // Step 8 — Print summary
  console.log('\n========== Import Complete ==========')
  console.log(`Places inserted : ${placesInserted}`)
  console.log(`Places skipped  : ${placesSkipped} (already existed)`)
  console.log(`Roads inserted  : ${roadsInserted}`)
  console.log(`Roads skipped   : ${roadsSkipped} (already existed)`)
  console.log('=====================================')

  process.exit(0)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
```

---

## 7. Helper Functions

### buildOverpassQuery
```js
function buildOverpassQuery(minLat, minLng, maxLat, maxLng) {
  const S = minLat, W = minLng, N = maxLat, E = maxLng
  return `
    [out:json][timeout:60];
    (
      node["name"](${S},${W},${N},${E});
      node["amenity"](${S},${W},${N},${E});
      node["shop"](${S},${W},${N},${E});
      node["tourism"](${S},${W},${N},${E});
      node["healthcare"](${S},${W},${N},${E});
      way["highway"](${S},${W},${N},${E});
      way["building"]["name"](${S},${W},${N},${E});
    );
    out body;
    >;
    out skel qt;
  `
}
```

### mapTagsToCategory
```js
function mapTagsToCategory(tags, categories) {
  // categories = [{id, name}, ...] from DB
  const find = (name) => {
    const cat = categories.find(c =>
      c.name.toLowerCase() === name.toLowerCase()
    )
    return cat ? cat.id : null
  }

  // Check OSM tags in priority order
  if (tags.amenity === 'restaurant' ||
      tags.amenity === 'cafe' ||
      tags.amenity === 'fast_food')        return find('Restaurant')

  if (tags.amenity === 'hospital' ||
      tags.amenity === 'clinic')           return find('Hospital')

  if (tags.amenity === 'school' ||
      tags.amenity === 'university' ||
      tags.amenity === 'college')          return find('School')

  if (tags.amenity === 'place_of_worship' &&
      tags.religion === 'muslim')          return find('Mosque')

  if (tags.amenity === 'place_of_worship') return find('Landmark')

  if (tags.amenity === 'bank' ||
      tags.amenity === 'atm')             return find('Bank')

  if (tags.amenity === 'hotel' ||
      tags.tourism === 'hotel' ||
      tags.tourism === 'guest_house')      return find('Hotel')

  if (tags.amenity === 'pharmacy' ||
      tags.healthcare === 'pharmacy')      return find('Pharmacy')

  if (tags.amenity === 'parking')          return find('Parking')

  if (tags.leisure === 'park' ||
      tags.leisure === 'garden')           return find('Park')

  if (tags.shop)                           return find('Shop')

  if (tags.tourism === 'attraction' ||
      tags.tourism === 'museum' ||
      tags.historic)                       return find('Landmark')

  return find('Other')
}
```

---

## 8. OSM Tag Reference

Full tag documentation: https://wiki.openstreetmap.org/wiki/Map_features

Key tag families used in this project:

| OSM Tag | Values | Maps To |
|---|---|---|
| `amenity` | restaurant, cafe, fast_food | Restaurant |
| `amenity` | hospital, clinic | Hospital |
| `amenity` | school, university, college | School |
| `amenity` | place_of_worship + religion=muslim | Mosque |
| `amenity` | bank, atm | Bank |
| `amenity` | pharmacy | Pharmacy |
| `amenity` | parking | Parking |
| `amenity` | hotel | Hotel |
| `tourism` | hotel, guest_house | Hotel |
| `tourism` | attraction, museum | Landmark |
| `historic` | any | Landmark |
| `leisure` | park, garden | Park |
| `shop` | any | Shop |
| `highway` | primary, secondary, residential, footway, etc. | Road |
| `healthcare` | pharmacy, doctor, clinic | Hospital/Pharmacy |

Full highway type values:
`motorway`, `trunk`, `primary`, `secondary`, `tertiary`,
`residential`, `service`, `footway`, `cycleway`, `path`, `track`

---

## 9. Rate Limiting & Large Areas

Overpass API is a free public service. Be respectful:

- Do not run the script more than once per region per day
- For very large regions (entire country), split into
  smaller bbox chunks and run multiple imports
- If you get a 429 or timeout, wait 60 seconds and retry
- For a full country import, split by division/district bbox

**Splitting strategy for large areas:**
```bash
# Instead of one import for all of Bangladesh:
node osmImport.js "Dhaka City"      "23.65,90.27,23.88,90.50"
node osmImport.js "Chattogram City" "22.20,91.70,22.45,91.95"
# Add more cities one by one, not the whole country at once
```

---

## 10. Adding a New City Later

No code changes needed. Just:

1. Add the city to the regions table via admin panel or SQL
2. Run the import script with that city's bbox
3. Done — it appears on the map

```bash
# Example: Adding Sylhet later
node osmImport.js "Sylhet City" "24.85,91.80,24.92,91.90"
```

To find the correct bbox for any city:
1. Go to https://www.openstreetmap.org
2. Search for the city
3. Click Export → the bbox is shown as:
   `left (minLng), bottom (minLat), right (maxLng), top (maxLat)`
4. Reorder to our format: `minLat, minLng, maxLat, maxLng`
