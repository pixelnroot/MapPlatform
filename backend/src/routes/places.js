const express = require('express')
const router  = express.Router()
const path    = require('path')
const multer  = require('multer')
const { v4: uuidv4 } = require('uuid')
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')
const cache     = require('../middleware/cache')
const logActivity = require('../utils/logActivity')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })
const err = (res, msg, status = 400) =>
  res.status(status).json({ success: false, error: msg })

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOADS_DIR || './uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

// GET /api/places — fetch places inside bounding box
router.get('/', cache(30), async (req, res, next) => {
  try {
    const { bbox, category_id, region_id, source, limit, cluster } = req.query

    if (!bbox) return err(res, 'bbox query param is required')

    const parts = bbox.split(',').map(Number)
    if (parts.length !== 4 || parts.some(isNaN)) {
      return err(res, 'Invalid bbox format')
    }

    const [minLat, minLng, maxLat, maxLng] = parts

    // Server-side clustering mode
    if (cluster === 'true') {
      const zoom = parseInt(req.query.zoom) || 12
      // Cell size decreases as zoom increases
      const cellSize = 360 / Math.pow(2, zoom)

      let clusterSql = `
        SELECT
          COUNT(*) AS count,
          AVG(p.lat) AS lat,
          AVG(p.lng) AS lng,
          FLOOR(p.lat / $5) AS cell_y,
          FLOOR(p.lng / $5) AS cell_x
        FROM places p
        WHERE ST_Within(p.geometry, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      `
      const clusterValues = [minLng, minLat, maxLng, maxLat, cellSize]
      let clusterIdx = 6

      if (category_id) {
        clusterSql += ` AND p.category_id = $${clusterIdx++}`
        clusterValues.push(category_id)
      }

      clusterSql += ` GROUP BY cell_y, cell_x HAVING COUNT(*) > 0 ORDER BY count DESC LIMIT 500`

      const result = await db.query(clusterSql, clusterValues)
      return ok(res, result.rows)
    }

    const maxResults = Math.min(parseInt(limit) || 100, 500)

    let sql = `
      SELECT
        p.id, p.name, p.lat, p.lng,
        p.phone, p.opening_hours, p.address,
        p.source, p.is_verified, p.custom_data,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        (SELECT ph.filename FROM photos ph WHERE ph.place_id = p.id LIMIT 1) AS photo
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ST_Within(
        p.geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `
    const values = [minLng, minLat, maxLng, maxLat]
    let paramIdx = 5

    if (category_id) {
      sql += ` AND p.category_id = $${paramIdx++}`
      values.push(category_id)
    }
    if (region_id) {
      sql += ` AND p.region_id = $${paramIdx++}`
      values.push(region_id)
    }
    if (source) {
      sql += ` AND p.source = $${paramIdx++}`
      values.push(source)
    }

    sql += ` ORDER BY p.name LIMIT $${paramIdx}`
    values.push(maxResults)

    const result = await db.query(sql, values)

    // Get total count
    let countSql = `
      SELECT COUNT(*) AS total FROM places p
      WHERE ST_Within(
        p.geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `
    const countValues = [minLng, minLat, maxLng, maxLat]
    const countResult = await db.query(countSql, countValues)

    ok(res, result.rows, {
      total: parseInt(countResult.rows[0].total),
      limit: maxResults
    })
  } catch (e) { next(e) }
})

// GET /api/places/:id — single place with photos
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await db.query(`
      SELECT
        p.*,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        c.custom_fields AS category_custom_fields,
        r.name AS region_name,
        r.type AS region_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ph.id,
              'filename', ph.filename,
              'caption', ph.caption
            )
          ) FILTER (WHERE ph.id IS NOT NULL),
          '[]'
        ) AS photos
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN regions r ON r.id = p.region_id
      LEFT JOIN photos ph ON ph.place_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name, c.color, c.icon, c.custom_fields, r.name, r.type
    `, [id])

    if (!result.rows.length) return err(res, 'Place not found', 404)
    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// POST /api/places — create manual place
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const { name, name_bn, category_id, region_id, lat, lng,
            phone, opening_hours, floor_details, custom_notes,
            address, website, custom_data } = req.body

    if (!name) return err(res, 'name is required')
    if (!region_id) return err(res, 'region_id is required')
    if (lat === undefined || lng === undefined) return err(res, 'lat and lng are required')
    if (lat < -90 || lat > 90) return err(res, 'Invalid latitude')
    if (lng < -180 || lng > 180) return err(res, 'Invalid longitude')

    const result = await db.query(`
      INSERT INTO places (
        id, name, name_bn, category_id, region_id,
        lat, lng, geometry,
        phone, opening_hours, floor_details, custom_notes,
        address, website, custom_data,
        source, is_verified
      ) VALUES (
        uuid_generate_v4(), $1, $2, $3, $4,
        $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326),
        $7, $8, $9, $10,
        $11, $12, $13,
        'manual', TRUE
      )
      RETURNING *
    `, [name, name_bn || null, category_id || null, region_id,
        lat, lng,
        phone || null, opening_hours || null, floor_details || null,
        custom_notes || null, address || null, website || null,
        custom_data ? JSON.stringify(custom_data) : '{}'])

    const place = result.rows[0]
    logActivity(req.user?.id, 'create', 'place', place.id, { name: place.name })

    ok(res, place)
  } catch (e) { next(e) }
})

// PUT /api/places/:id — update place
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check place exists
    const existing = await db.query('SELECT lat, lng FROM places WHERE id = $1', [id])
    if (!existing.rows.length) return err(res, 'Place not found', 404)

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

    // Handle custom_data separately (JSONB)
    if (req.body.custom_data !== undefined) {
      fields.push(`custom_data = $${i++}`)
      values.push(JSON.stringify(req.body.custom_data))
    }

    if (fields.length === 0) return err(res, 'No valid fields to update')

    // If lat or lng updated, also update geometry
    if (req.body.lat !== undefined || req.body.lng !== undefined) {
      const newLng = req.body.lng ?? existing.rows[0].lng
      const newLat = req.body.lat ?? existing.rows[0].lat
      fields.push(`geometry = ST_SetSRID(ST_MakePoint($${i++}, $${i++}), 4326)`)
      values.push(newLng)
      values.push(newLat)
    }

    values.push(id)
    const sql = `UPDATE places SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`
    await db.query(sql, values)

    logActivity(req.user?.id, 'update', 'place', id, { fields: Object.keys(req.body) })

    // Return full place with joins
    const result = await db.query(`
      SELECT
        p.*,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        r.name AS region_name,
        r.type AS region_type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ph.id,
              'filename', ph.filename,
              'caption', ph.caption
            )
          ) FILTER (WHERE ph.id IS NOT NULL),
          '[]'
        ) AS photos
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN regions r ON r.id = p.region_id
      LEFT JOIN photos ph ON ph.place_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name, c.color, c.icon, r.name, r.type
    `, [id])

    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// DELETE /api/places/:id
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const existing = await db.query('SELECT name FROM places WHERE id = $1', [id])
    const result = await db.query('DELETE FROM places WHERE id = $1 RETURNING id', [id])
    if (!result.rows.length) return err(res, 'Place not found', 404)

    logActivity(req.user?.id, 'delete', 'place', id, { name: existing.rows[0]?.name })

    ok(res, { deleted: true })
  } catch (e) { next(e) }
})

// POST /api/places/:id/photos — upload photos
router.post('/:id/photos', adminAuth, upload.array('photos', 10), async (req, res, next) => {
  try {
    const { id } = req.params

    // Check place exists
    const place = await db.query('SELECT id FROM places WHERE id = $1', [id])
    if (!place.rows.length) return err(res, 'Place not found', 404)

    if (!req.files || req.files.length === 0) {
      return err(res, 'No files uploaded')
    }

    const captions = req.body.captions ? req.body.captions.split(',') : []
    const photos = []

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i]
      const caption = captions[i]?.trim() || null

      const result = await db.query(`
        INSERT INTO photos (id, place_id, filename, caption)
        VALUES (uuid_generate_v4(), $1, $2, $3)
        RETURNING id, filename, caption
      `, [id, file.filename, caption])

      photos.push(result.rows[0])
    }

    ok(res, photos)
  } catch (e) { next(e) }
})

module.exports = router
