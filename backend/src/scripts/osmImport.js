const { v4: uuidv4 } = require('uuid')
const db = require('../db')
require('dotenv').config()

function buildOverpassQuery(minLat, minLng, maxLat, maxLng) {
  const S = minLat, W = minLng, N = maxLat, E = maxLng
  return `
    [out:json][timeout:90];
    (
      node["name"](${S},${W},${N},${E});
      node["amenity"](${S},${W},${N},${E});
      node["shop"](${S},${W},${N},${E});
      node["tourism"](${S},${W},${N},${E});
      node["healthcare"](${S},${W},${N},${E});
      way["highway"](${S},${W},${N},${E});
      way["building"]["name"](${S},${W},${N},${E});
      way["landuse"](${S},${W},${N},${E});
      way["natural"](${S},${W},${N},${E});
    );
    out body;
    >;
    out skel qt;
  `
}

function mapTagsToCategory(tags, categories) {
  const find = (name) => {
    const cat = categories.find(c =>
      c.name.toLowerCase() === name.toLowerCase()
    )
    return cat ? cat.id : null
  }

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
  const categories = catResult.rows

  // Step 4 — Fetch from Overpass API (dynamic import for ESM node-fetch)
  const fetch = (await import('node-fetch')).default
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
  const nodeMap = {}
  const nodes   = []
  const ways    = []

  for (const el of elements) {
    if (el.type === 'node') {
      nodeMap[el.id] = { lat: el.lat, lon: el.lon }
      if (el.tags && Object.keys(el.tags).length > 0) {
        nodes.push(el)
      }
    } else if (el.type === 'way') {
      ways.push(el)
    }
  }

  // Step 6 — Import nodes as places
  let placesInserted = 0
  let placesSkipped  = 0

  for (const node of nodes) {
    const name = node.tags.name || node.tags['name:en']
    if (!name) continue
    if (!node.lat || !node.lon) continue

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

  // Step 7 — Import ways as roads + land use
  let roadsInserted  = 0
  let roadsSkipped   = 0
  let landUseInserted = 0
  let landUseSkipped  = 0

  for (const way of ways) {
    if (!way.tags) continue
    if (!way.nodes || way.nodes.length < 2) continue

    const coords = way.nodes
      .map(nodeId => nodeMap[nodeId])
      .filter(Boolean)

    if (coords.length < 2) continue

    const isHighway  = !!way.tags.highway
    const isLandUse  = !!way.tags.landuse || !!way.tags.natural

    if (isHighway) {
      const geojson = JSON.stringify({
        type: 'LineString',
        coordinates: coords.map(n => [n.lon, n.lat])
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

    if (isLandUse && coords.length >= 4) {
      // Close the polygon if not already closed
      const first = coords[0]
      const last = coords[coords.length - 1]
      const polyCoords = [...coords]
      if (first.lat !== last.lat || first.lon !== last.lon) {
        polyCoords.push(first)
      }

      if (polyCoords.length < 4) continue

      const geojson = JSON.stringify({
        type: 'Polygon',
        coordinates: [polyCoords.map(n => [n.lon, n.lat])]
      })

      const luType = way.tags.landuse || way.tags.natural || 'unknown'

      try {
        const result = await db.query(`
          INSERT INTO land_use (
            id, type, name, region_id,
            geometry, source, osm_id
          ) VALUES (
            $1, $2, $3, $4,
            ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
            'osm', $6
          )
          ON CONFLICT (osm_id) DO NOTHING
        `, [
          uuidv4(),
          luType,
          way.tags.name || null,
          regionId,
          geojson,
          way.id
        ])

        if (result.rowCount > 0) landUseInserted++
        else landUseSkipped++
      } catch (e) {
        // Silently skip invalid polygons
      }
    }
  }

  // Step 8 — Print summary
  console.log('\n========== Import Complete ==========')
  console.log(`Places inserted  : ${placesInserted}`)
  console.log(`Places skipped   : ${placesSkipped} (already existed)`)
  console.log(`Roads inserted   : ${roadsInserted}`)
  console.log(`Roads skipped    : ${roadsSkipped} (already existed)`)
  console.log(`Land use inserted: ${landUseInserted}`)
  console.log(`Land use skipped : ${landUseSkipped} (already existed)`)
  console.log('=====================================')

  process.exit(0)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
