const express = require('express')
const router  = express.Router()
const db      = require('../db')
const cache   = require('../middleware/cache')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

// GET /api/landuse?bbox=&type=
router.get('/', cache(120), async (req, res, next) => {
  try {
    const { bbox, type, limit } = req.query
    if (!bbox) return err(res, 'bbox query param is required')

    const parts = bbox.split(',').map(Number)
    if (parts.length !== 4 || parts.some(isNaN)) return err(res, 'Invalid bbox format')

    const [minLat, minLng, maxLat, maxLng] = parts
    const maxResults = Math.min(parseInt(limit) || 200, 500)

    let sql = `
      SELECT id, type, name,
             ST_AsGeoJSON(geometry)::json AS geojson
      FROM land_use
      WHERE ST_Intersects(geometry, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    `
    const values = [minLng, minLat, maxLng, maxLat]

    if (type) {
      sql += ` AND type = $5`
      values.push(type)
    }

    sql += ` LIMIT $${values.length + 1}`
    values.push(maxResults)

    const result = await db.query(sql, values)
    ok(res, result.rows)
  } catch (e) { next(e) }
})

module.exports = router
