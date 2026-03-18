const express = require('express')
const router  = express.Router()
const db      = require('../db')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

// GET /api/terrain/elevation?lat=&lng=
router.get('/elevation', async (req, res, next) => {
  try {
    const { lat, lng } = req.query
    if (!lat || !lng) return err(res, 'lat and lng are required')

    const fLat = parseFloat(lat)
    const fLng = parseFloat(lng)

    // Check cache
    const cached = await db.query(
      `SELECT elevation FROM elevation_cache
       WHERE ROUND(lat::numeric, 4) = ROUND($1::numeric, 4)
       AND ROUND(lng::numeric, 4) = ROUND($2::numeric, 4)
       LIMIT 1`,
      [fLat, fLng]
    )

    if (cached.rows.length) {
      return ok(res, { lat: fLat, lng: fLng, elevation: cached.rows[0].elevation })
    }

    // Fetch from Open-Meteo
    const fetch = (await import('node-fetch')).default
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${fLat}&longitude=${fLng}`
    const response = await fetch(url)
    const data = await response.json()
    const elevation = data.elevation?.[0]

    if (elevation === undefined) return err(res, 'Could not get elevation data')

    // Cache it
    await db.query(
      'INSERT INTO elevation_cache (lat, lng, elevation) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [fLat, fLng, elevation]
    )

    ok(res, { lat: fLat, lng: fLng, elevation })
  } catch (e) { next(e) }
})

// POST /api/terrain/profile — body: { points: [{lat, lng}, ...] }
router.post('/profile', async (req, res, next) => {
  try {
    const { points } = req.body
    if (!points || !Array.isArray(points) || points.length < 2) {
      return err(res, 'At least 2 points are required')
    }

    const lats = points.map(p => p.lat).join(',')
    const lngs = points.map(p => p.lng).join(',')

    const fetch = (await import('node-fetch')).default
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`
    const response = await fetch(url)
    const data = await response.json()
    const elevations = data.elevation || []

    const profile = points.map((p, i) => ({
      lat: p.lat,
      lng: p.lng,
      elevation: elevations[i] || 0
    }))

    // Cache all points
    for (const pt of profile) {
      await db.query(
        'INSERT INTO elevation_cache (lat, lng, elevation) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [pt.lat, pt.lng, pt.elevation]
      ).catch(() => {})
    }

    ok(res, profile)
  } catch (e) { next(e) }
})

module.exports = router
