# docs/api.md — API Endpoints & Patterns

> Read this before writing any Express route, any middleware,
> or any frontend API call. Every endpoint is defined here with
> exact request params, response shape, auth requirement, and
> error cases. Do not add endpoints not listed here for MVP.

---

## 1. Express App Setup (backend/src/index.js)

```js
const express = require('express')
const cors    = require('cors')
const path    = require('path')
require('dotenv').config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded photos as static files
app.use('/uploads', express.static(
  path.resolve(process.env.UPLOADS_DIR || './uploads')
))

// Routes
app.use('/api/regions', require('./routes/regions'))
app.use('/api/places',  require('./routes/places'))
app.use('/api/roads',   require('./routes/roads'))
app.use('/api/search',  require('./routes/search'))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ success: false, error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`API running on port ${PORT}`))
```

---

## 2. Admin Auth Middleware (backend/src/middleware/adminAuth.js)

```js
module.exports = function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid x-admin-key header required.'
    })
  }
  next()
}
```

**Usage in routes:**
```js
const adminAuth = require('../middleware/adminAuth')

// Protect a single route
router.post('/', adminAuth, handler)

// Protect all routes in a router
router.use(adminAuth)
```

---

## 3. Standard Response Shape

Every single API response must use this exact shape. No exceptions.

**Success:**
```json
{
  "success": true,
  "data": <payload>
}
```

**Success with pagination:**
```json
{
  "success": true,
  "data": [...],
  "total": 243,
  "limit": 100
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human readable error message"
}
```

**Helper to use in every route:**
```js
const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })

const err = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message })
```

---

## 4. Regions Endpoints

### GET /api/regions
Returns all regions as a flat list. Frontend builds the tree.

**Auth:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Dhaka City",
      "name_bn": null,
      "type": "city",
      "parent_id": "uuid",
      "country_code": null,
      "bbox_sw_lat": 23.65,
      "bbox_sw_lng": 90.27,
      "bbox_ne_lat": 23.88,
      "bbox_ne_lng": 90.50
    }
  ]
}
```

**Route implementation:**
```js
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, name, name_bn, type, parent_id,
             country_code,
             bbox_sw_lat, bbox_sw_lng,
             bbox_ne_lat, bbox_ne_lng
      FROM regions
      ORDER BY type, name
    `)
    ok(res, result.rows)
  } catch (e) { next(e) }
})
```

---

## 5. Places Endpoints

### GET /api/places
Fetch places inside a bounding box with optional filters.

**Auth:** None

**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| bbox | string | Yes | `minLat,minLng,maxLat,maxLng` |
| category_id | uuid | No | Filter by category |
| region_id | uuid | No | Filter by region |
| source | string | No | `osm` or `manual` |
| limit | integer | No | Max results, default 100, max 500 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ahmed Store",
      "lat": 23.7749,
      "lng": 90.3994,
      "phone": "01711000000",
      "opening_hours": "9am - 10pm",
      "address": "Road 5, Dhanmondi",
      "source": "manual",
      "is_verified": true,
      "category_name": "Shop",
      "category_color": "#F59E0B",
      "category_icon": "🛍️"
    }
  ],
  "total": 87,
  "limit": 100
}
```

**Validation:**
- If `bbox` is missing → 400 error: "bbox query param is required"
- If `bbox` does not parse to 4 numbers → 400 error: "Invalid bbox format"
- Parse bbox: `const [minLat, minLng, maxLat, maxLng] = bbox.split(',').map(Number)`
- Pass to ST_MakeEnvelope as: `(minLng, minLat, maxLng, maxLat, 4326)`

---

### GET /api/places/:id
Get a single place with full details and photos.

**Auth:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ahmed Store",
    "name_bn": null,
    "lat": 23.7749,
    "lng": 90.3994,
    "phone": "01711000000",
    "opening_hours": "9am - 10pm",
    "floor_details": "Ground floor, Shop #12",
    "custom_notes": "Best grocery in the area",
    "address": "Road 5, Dhanmondi",
    "website": null,
    "source": "manual",
    "is_verified": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "category_name": "Shop",
    "category_color": "#F59E0B",
    "category_icon": "🛍️",
    "region_name": "Dhaka City",
    "region_type": "city",
    "photos": [
      {
        "id": "uuid",
        "filename": "uuid.jpg",
        "caption": "Front of the shop"
      }
    ]
  }
}
```

**Error cases:**
- Place not found → 404: "Place not found"

---

### POST /api/places
Create a new manual place.

**Auth:** Required (x-admin-key)

**Request body (JSON):**
```json
{
  "name": "Ahmed Store",
  "name_bn": "আহমেদ স্টোর",
  "category_id": "uuid",
  "region_id": "uuid",
  "lat": 23.7749,
  "lng": 90.3994,
  "phone": "01711000000",
  "opening_hours": "9am - 10pm",
  "floor_details": "Ground floor",
  "custom_notes": "Near the main road",
  "address": "Road 5, Dhanmondi",
  "website": "https://example.com"
}
```

**Required fields:** `name`, `region_id`, `lat`, `lng`
**Defaults set by server:** `source = 'manual'`, `is_verified = true`

**Response:**
```json
{
  "success": true,
  "data": { ...full place object... }
}
```

**Validation:**
- Missing `name` → 400: "name is required"
- Missing `region_id` → 400: "region_id is required"
- Missing `lat` or `lng` → 400: "lat and lng are required"
- Invalid `lat` range (-90 to 90) → 400: "Invalid latitude"
- Invalid `lng` range (-180 to 180) → 400: "Invalid longitude"

---

### PUT /api/places/:id
Update an existing place.

**Auth:** Required (x-admin-key)

**Request body (JSON):** Any subset of POST fields.
Only provided fields are updated. Use dynamic SQL to build the SET clause.

**Response:** Updated place object (same shape as GET /api/places/:id)

**Error cases:**
- Place not found → 404: "Place not found"
- No valid fields provided → 400: "No valid fields to update"

**Dynamic update pattern:**
```js
const allowed = [
  'name','name_bn','category_id','region_id',
  'lat','lng','phone','opening_hours',
  'floor_details','custom_notes','address','website'
]
const fields = []
const values = []
let i = 1

for (const key of allowed) {
  if (req.body[key] !== undefined) {
    fields.push(`${key} = $${i++}`)
    values.push(req.body[key])
  }
}

// If lat or lng updated, also update geometry
if (req.body.lat !== undefined || req.body.lng !== undefined) {
  fields.push(`geometry = ST_SetSRID(ST_MakePoint($${i++}, $${i++}), 4326)`)
  values.push(req.body.lng ?? existingLng)
  values.push(req.body.lat ?? existingLat)
}

values.push(id) // last param for WHERE id = $N
const sql = `UPDATE places SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`
```

---

### DELETE /api/places/:id
Delete a place and its photos records.

**Auth:** Required (x-admin-key)

**Response:**
```json
{ "success": true, "data": { "deleted": true } }
```

**Error cases:**
- Place not found → 404: "Place not found"

**Note:** Photos records are deleted automatically via CASCADE.
Physical files in /uploads are NOT deleted (leave for now, clean up later).

---

### POST /api/places/:id/photos
Upload one or more photos for a place.

**Auth:** Required (x-admin-key)

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| photos | file(s) | One or more image files (jpeg, png, webp) |
| captions | string | Optional, comma-separated captions |

**Multer config:** Accept field name `photos`, max 10 files, 5MB each.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "filename": "uuid.jpg", "caption": null }
  ]
}
```

**Error cases:**
- Place not found → 404: "Place not found"
- No files uploaded → 400: "No files uploaded"
- Invalid file type → 400: "Only jpeg, png, webp allowed"

---

## 6. Roads Endpoints

### GET /api/roads
Fetch roads inside a bounding box as GeoJSON features.

**Auth:** None

**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| bbox | string | Yes | `minLat,minLng,maxLat,maxLng` |
| type | string | No | OSM highway type e.g. `primary`, `residential` |
| limit | integer | No | Default 200, max 1000 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mirpur Road",
      "type": "primary",
      "geojson": {
        "type": "LineString",
        "coordinates": [[90.39, 23.77], [90.40, 23.78]]
      }
    }
  ]
}
```

**Note:** `geojson` field contains parsed JSON from `ST_AsGeoJSON(geometry)::json`
Parse in route: `row.geojson = JSON.parse(row.geojson)` if not cast in SQL.

---

## 7. Search Endpoint

### GET /api/search
Full text search across place names.

**Auth:** None

**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| q | string | Yes | Search term, min 2 characters |
| region_id | uuid | No | Limit results to a specific region |
| limit | integer | No | Default 20, max 50 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ahmed Store",
      "lat": 23.7749,
      "lng": 90.3994,
      "category_name": "Shop",
      "category_color": "#F59E0B",
      "category_icon": "🛍️",
      "region_name": "Dhaka City"
    }
  ]
}
```

**Validation:**
- Missing `q` → 400: "q query param is required"
- `q` less than 2 characters → 400: "Search term must be at least 2 characters"

**Search pattern:** Use `ILIKE '%term%'` for MVP.
Do not use full-text search vectors for MVP — keep it simple.

---

## 8. Admin Stats Endpoint

### GET /api/admin/stats
Dashboard counts for admin panel.

**Auth:** Required (x-admin-key)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_places": 1523,
    "manual_places": 87,
    "osm_places": 1436,
    "total_roads": 4210,
    "total_regions": 7,
    "recent_places": [
      {
        "id": "uuid",
        "name": "Ahmed Store",
        "category_name": "Shop",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

**SQL for stats:**
```sql
SELECT
  COUNT(*) AS total_places,
  COUNT(*) FILTER (WHERE source = 'manual') AS manual_places,
  COUNT(*) FILTER (WHERE source = 'osm')    AS osm_places
FROM places;
```

---

## 9. Error Handling Pattern

Use this pattern in every route handler:

```js
const express = require('express')
const router  = express.Router()
const db      = require('../db')
const adminAuth = require('../middleware/adminAuth')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })
const err = (res, msg, status = 400) =>
  res.status(status).json({ success: false, error: msg })

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await db.query(
      'SELECT * FROM places WHERE id = $1', [id]
    )
    if (!result.rows.length) return err(res, 'Place not found', 404)
    ok(res, result.rows[0])
  } catch (e) {
    next(e) // passes to global error handler in index.js
  }
})

module.exports = router
```

---

## 10. CORS Configuration

Allow all origins for MVP:
```js
app.use(cors())
```

This is fine for MVP. Restrict to specific origin in production.

---

## 11. Complete Route File List

| File | Routes mounted at | Auth |
|---|---|---|
| routes/regions.js | /api/regions | None |
| routes/places.js | /api/places | Mixed (GET=none, POST/PUT/DELETE=admin) |
| routes/roads.js | /api/roads | None |
| routes/search.js | /api/search | None |
| routes/admin.js | /api/admin | All admin |
