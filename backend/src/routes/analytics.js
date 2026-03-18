const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')
const cache   = require('../middleware/cache')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

router.use(auth)

// GET /api/analytics/region/:id
router.get('/region/:id', cache(300), async (req, res, next) => {
  try {
    const { id } = req.params

    // Category breakdown
    const categoryBreakdown = await db.query(`
      SELECT c.name, c.color, c.icon, COUNT(p.id) AS count
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.region_id = $1
      GROUP BY c.name, c.color, c.icon
      ORDER BY count DESC
    `, [id])

    // Source breakdown
    const sourceBreakdown = await db.query(`
      SELECT source, COUNT(*) AS count
      FROM places WHERE region_id = $1
      GROUP BY source
    `, [id])

    // Total places
    const totalPlaces = await db.query(
      'SELECT COUNT(*) AS total FROM places WHERE region_id = $1', [id]
    )

    // Road stats
    const roadStats = await db.query(`
      SELECT type, COUNT(*) AS count,
             ROUND(SUM(ST_Length(geometry::geography))::numeric, 2) AS total_length_m
      FROM roads WHERE region_id = $1
      GROUP BY type ORDER BY count DESC
    `, [id])

    // Coverage density (places per sq km)
    const density = await db.query(`
      SELECT
        CASE WHEN r.boundary IS NOT NULL
          THEN ROUND((COUNT(p.id)::numeric / NULLIF(ST_Area(r.boundary::geography) / 1000000, 0)), 2)
          ELSE NULL
        END AS places_per_sq_km,
        CASE WHEN r.boundary IS NOT NULL
          THEN ROUND((ST_Area(r.boundary::geography) / 1000000)::numeric, 2)
          ELSE NULL
        END AS area_sq_km
      FROM regions r
      LEFT JOIN places p ON p.region_id = r.id
      WHERE r.id = $1
      GROUP BY r.id, r.boundary
    `, [id])

    ok(res, {
      total_places: parseInt(totalPlaces.rows[0].total),
      category_breakdown: categoryBreakdown.rows,
      source_breakdown: sourceBreakdown.rows,
      road_stats: roadStats.rows,
      density: density.rows[0] || {}
    })
  } catch (e) { next(e) }
})

// GET /api/analytics/compare?region_ids=uuid1,uuid2
router.get('/compare', cache(300), async (req, res, next) => {
  try {
    const { region_ids } = req.query
    if (!region_ids) return err(res, 'region_ids query param required')

    const ids = region_ids.split(',').map(s => s.trim())
    const results = []

    for (const id of ids) {
      const region = await db.query('SELECT id, name, type FROM regions WHERE id = $1', [id])
      if (!region.rows.length) continue

      const stats = await db.query(`
        SELECT
          COUNT(*) AS total_places,
          COUNT(*) FILTER (WHERE source = 'manual') AS manual,
          COUNT(*) FILTER (WHERE source = 'osm') AS osm
        FROM places WHERE region_id = $1
      `, [id])

      const roads = await db.query(
        'SELECT COUNT(*) AS total FROM roads WHERE region_id = $1', [id]
      )

      results.push({
        region: region.rows[0],
        ...stats.rows[0],
        total_roads: parseInt(roads.rows[0].total)
      })
    }

    ok(res, results)
  } catch (e) { next(e) }
})

// GET /api/analytics/nearest?lat=&lng=&category_id=&radius=
router.get('/nearest', async (req, res, next) => {
  try {
    const { lat, lng, category_id, radius, limit } = req.query
    if (!lat || !lng) return err(res, 'lat and lng are required')

    const maxDist = parseInt(radius) || 5000
    const maxResults = Math.min(parseInt(limit) || 10, 50)

    let sql = `
      SELECT p.id, p.name, p.lat, p.lng,
             c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             ROUND(ST_Distance(p.geometry::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::numeric, 0) AS distance_m
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ST_DWithin(p.geometry::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
    `
    const values = [parseFloat(lat), parseFloat(lng), maxDist]
    let idx = 4

    if (category_id) {
      sql += ` AND p.category_id = $${idx++}`
      values.push(category_id)
    }

    sql += ` ORDER BY p.geometry <-> ST_SetSRID(ST_MakePoint($2, $1), 4326) LIMIT $${idx}`
    values.push(maxResults)

    const result = await db.query(sql, values)
    ok(res, result.rows)
  } catch (e) { next(e) }
})

// GET /api/analytics/catchment?lat=&lng=&radius=
router.get('/catchment', async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query
    if (!lat || !lng) return err(res, 'lat and lng are required')

    const r = parseInt(radius) || 1000

    const result = await db.query(`
      SELECT c.name, c.color, c.icon, COUNT(p.id) AS count
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ST_DWithin(p.geometry::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      GROUP BY c.name, c.color, c.icon
      ORDER BY count DESC
    `, [parseFloat(lat), parseFloat(lng), r])

    const total = await db.query(`
      SELECT COUNT(*) AS total FROM places
      WHERE ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
    `, [parseFloat(lat), parseFloat(lng), r])

    ok(res, {
      radius: r,
      total: parseInt(total.rows[0].total),
      breakdown: result.rows
    })
  } catch (e) { next(e) }
})

// GET /api/analytics/gaps?region_id=&category_id=&cell_size=
router.get('/gaps', async (req, res, next) => {
  try {
    const { region_id, category_id } = req.query
    if (!region_id) return err(res, 'region_id is required')

    // Find areas with no places of given category within each grid cell
    const result = await db.query(`
      SELECT c.name AS category_name, c.icon,
             COUNT(p.id) AS place_count
      FROM categories c
      LEFT JOIN places p ON p.category_id = c.id AND p.region_id = $1
      GROUP BY c.id, c.name, c.icon
      ORDER BY place_count ASC
    `, [region_id])

    ok(res, result.rows)
  } catch (e) { next(e) }
})

// GET /api/analytics/score/:region_id
router.get('/score/:region_id', cache(300), async (req, res, next) => {
  try {
    const { region_id } = req.params

    // Category diversity (how many different categories have places)
    const catDiversity = await db.query(`
      SELECT COUNT(DISTINCT category_id) AS unique_categories
      FROM places WHERE region_id = $1 AND category_id IS NOT NULL
    `, [region_id])

    const totalCats = await db.query('SELECT COUNT(*) AS total FROM categories')

    // Essential services coverage (hospital, school, pharmacy, bank)
    const essentials = await db.query(`
      SELECT c.name, COUNT(p.id) AS count
      FROM categories c
      LEFT JOIN places p ON p.category_id = c.id AND p.region_id = $2
      WHERE c.name IN ('Hospital', 'School', 'Pharmacy', 'Bank')
      GROUP BY c.name
    `, [region_id])

    // Road density
    const roadDensity = await db.query(`
      SELECT COUNT(*) AS road_count,
             ROUND(SUM(ST_Length(geometry::geography))::numeric / 1000, 2) AS total_km
      FROM roads WHERE region_id = $1
    `, [region_id])

    // Total places
    const placeCount = await db.query(
      'SELECT COUNT(*) AS total FROM places WHERE region_id = $1', [region_id]
    )

    // Land use mix
    const landUseMix = await db.query(`
      SELECT COUNT(DISTINCT type) AS unique_types
      FROM land_use WHERE region_id = $1
    `, [region_id])

    // Compute scores (0-100)
    const uniqueCats = parseInt(catDiversity.rows[0].unique_categories)
    const totalCatsCount = parseInt(totalCats.rows[0].total)
    const diversityScore = Math.min(100, Math.round((uniqueCats / Math.max(totalCatsCount, 1)) * 100))

    const essentialCount = essentials.rows.filter(r => parseInt(r.count) > 0).length
    const essentialScore = Math.round((essentialCount / 4) * 100)

    const roadKm = parseFloat(roadDensity.rows[0].total_km) || 0
    const roadScore = Math.min(100, Math.round(roadKm / 2))

    const landTypes = parseInt(landUseMix.rows[0].unique_types) || 0
    const landUseScore = Math.min(100, landTypes * 15)

    const overallScore = Math.round(
      diversityScore * 0.3 + essentialScore * 0.3 + roadScore * 0.2 + landUseScore * 0.2
    )

    ok(res, {
      overall_score: overallScore,
      breakdown: {
        category_diversity: { score: diversityScore, unique: uniqueCats, total: totalCatsCount },
        essential_services: { score: essentialScore, covered: essentialCount, total: 4, details: essentials.rows },
        road_density: { score: roadScore, total_km: roadKm, count: parseInt(roadDensity.rows[0].road_count) },
        land_use_mix: { score: landUseScore, unique_types: landTypes }
      },
      total_places: parseInt(placeCount.rows[0].total)
    })
  } catch (e) { next(e) }
})

module.exports = router
