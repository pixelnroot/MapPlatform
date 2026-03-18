const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const { parse } = require('csv-parse/sync')
const { v4: uuidv4 } = require('uuid')
const db      = require('../db')
const auth    = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

router.use(auth)
router.use(requireRole('owner', 'admin'))

// POST /api/import/places
router.post('/places', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return err(res, 'No file uploaded')

    const { region_id } = req.body
    if (!region_id) return err(res, 'region_id is required')

    // Check region exists
    const regionCheck = await db.query('SELECT id FROM regions WHERE id = $1', [region_id])
    if (!regionCheck.rows.length) return err(res, 'Region not found', 404)

    const content = req.file.buffer.toString('utf-8')
    let places = []

    if (req.file.originalname.endsWith('.geojson') || req.file.originalname.endsWith('.json')) {
      // Parse GeoJSON
      const geojson = JSON.parse(content)
      const features = geojson.features || []
      places = features.map(f => ({
        name: f.properties?.name,
        name_bn: f.properties?.name_bn || null,
        lat: f.geometry?.coordinates?.[1],
        lng: f.geometry?.coordinates?.[0],
        phone: f.properties?.phone || null,
        opening_hours: f.properties?.opening_hours || null,
        address: f.properties?.address || null,
        floor_details: f.properties?.floor_details || null,
        custom_notes: f.properties?.custom_notes || null,
        website: f.properties?.website || null,
        category_name: f.properties?.category_name || null,
        custom_data: f.properties?.custom_data || null,
      }))
    } else {
      // Parse CSV
      const records = parse(content, { columns: true, skip_empty_lines: true, trim: true })
      places = records.map(r => ({
        name: r.name,
        name_bn: r.name_bn || null,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        phone: r.phone || null,
        opening_hours: r.opening_hours || null,
        address: r.address || null,
        floor_details: r.floor_details || null,
        custom_notes: r.custom_notes || null,
        website: r.website || null,
        category_name: r.category_name || null,
        custom_data: null,
      }))
    }

    // Load categories for name lookup
    const catResult = await db.query('SELECT id, name FROM categories')
    const catMap = {}
    for (const c of catResult.rows) catMap[c.name.toLowerCase()] = c.id

    let imported = 0
    let skipped = 0
    const errors = []

    for (let i = 0; i < places.length; i++) {
      const p = places[i]
      if (!p.name || isNaN(p.lat) || isNaN(p.lng)) {
        errors.push({ row: i + 1, error: 'Missing name, lat, or lng' })
        skipped++
        continue
      }

      const categoryId = p.category_name ? (catMap[p.category_name.toLowerCase()] || null) : null

      try {
        await db.query(`
          INSERT INTO places (
            id, name, name_bn, category_id, region_id,
            lat, lng, geometry,
            phone, opening_hours, floor_details, custom_notes,
            address, website, custom_data,
            source, is_verified
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, ST_SetSRID(ST_MakePoint($7, $6), 4326),
            $8, $9, $10, $11,
            $12, $13, $14,
            'manual', TRUE
          )
        `, [
          uuidv4(), p.name, p.name_bn, categoryId, region_id,
          p.lat, p.lng,
          p.phone, p.opening_hours, p.floor_details, p.custom_notes,
          p.address, p.website, p.custom_data ? JSON.stringify(p.custom_data) : '{}'
        ])
        imported++
      } catch (e) {
        errors.push({ row: i + 1, error: e.message })
        skipped++
      }
    }

    ok(res, { imported, skipped, errors: errors.slice(0, 20) })
  } catch (e) { next(e) }
})

module.exports = router
