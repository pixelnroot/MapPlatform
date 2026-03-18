const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const adminAuth = require('../middleware/adminAuth')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })

router.use(adminAuth)

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const placesStats = await db.query(`
      SELECT
        COUNT(*) AS total_places,
        COUNT(*) FILTER (WHERE source = 'manual') AS manual_places,
        COUNT(*) FILTER (WHERE source = 'osm')    AS osm_places
      FROM places
    `)

    const roadsCount = await db.query('SELECT COUNT(*) AS total_roads FROM roads')
    const regionsCount = await db.query('SELECT COUNT(*) AS total_regions FROM regions')

    const recentPlaces = await db.query(`
      SELECT p.id, p.name, c.name AS category_name, p.created_at
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
      LIMIT 10
    `)

    ok(res, {
      total_places:  parseInt(placesStats.rows[0].total_places),
      manual_places: parseInt(placesStats.rows[0].manual_places),
      osm_places:    parseInt(placesStats.rows[0].osm_places),
      total_roads:   parseInt(roadsCount.rows[0].total_roads),
      total_regions: parseInt(regionsCount.rows[0].total_regions),
      recent_places: recentPlaces.rows
    })
  } catch (e) { next(e) }
})

// GET /api/admin/activity
router.get('/activity', async (req, res, next) => {
  try {
    const { limit } = req.query
    const maxResults = Math.min(parseInt(limit) || 50, 200)

    const result = await db.query(`
      SELECT a.*,
             u.name AS user_name,
             u.email AS user_email
      FROM activity_log a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [maxResults])

    ok(res, result.rows)
  } catch (e) { next(e) }
})

module.exports = router
