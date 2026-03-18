const express = require('express')
const router  = express.Router()
const db      = require('../db')
const cache   = require('../middleware/cache')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })
const err = (res, msg, status = 400) =>
  res.status(status).json({ success: false, error: msg })

router.get('/', cache(120), async (req, res, next) => {
  try {
    const { bbox, type, limit } = req.query

    if (!bbox) return err(res, 'bbox query param is required')

    const parts = bbox.split(',').map(Number)
    if (parts.length !== 4 || parts.some(isNaN)) {
      return err(res, 'Invalid bbox format')
    }

    const [minLat, minLng, maxLat, maxLng] = parts
    const maxResults = Math.min(parseInt(limit) || 200, 1000)

    let sql = `
      SELECT
        id, name, type,
        ST_AsGeoJSON(geometry)::json AS geojson
      FROM roads
      WHERE ST_Intersects(
        geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
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
