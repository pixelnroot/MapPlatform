const express = require('express')
const router  = express.Router()
const db      = require('../db')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })
const err = (res, msg, status = 400) =>
  res.status(status).json({ success: false, error: msg })

router.get('/', async (req, res, next) => {
  try {
    const { q, region_id, limit } = req.query

    if (!q) return err(res, 'q query param is required')
    if (q.length < 2) return err(res, 'Search term must be at least 2 characters')

    const maxResults = Math.min(parseInt(limit) || 20, 50)

    const result = await db.query(`
      SELECT
        p.id, p.name, p.lat, p.lng,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        r.name AS region_name
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN regions r ON r.id = p.region_id
      WHERE p.name ILIKE $1
      AND ($2::uuid IS NULL OR p.region_id = $2)
      ORDER BY p.name
      LIMIT $3
    `, [`%${q}%`, region_id || null, maxResults])

    ok(res, result.rows)
  } catch (e) { next(e) }
})

module.exports = router
