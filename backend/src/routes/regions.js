const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })
const err = (res, msg, status = 400) =>
  res.status(status).json({ success: false, error: msg })

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, name, name_bn, type, parent_id,
             country_code,
             bbox_sw_lat, bbox_sw_lng,
             bbox_ne_lat, bbox_ne_lng,
             CASE WHEN boundary IS NOT NULL
               THEN ST_AsGeoJSON(boundary)::json
               ELSE NULL
             END AS boundary_geojson
      FROM regions
      ORDER BY type, name
    `)
    ok(res, result.rows)
  } catch (e) { next(e) }
})

// POST /api/regions — create custom_area (drawn polygon)
router.post('/', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, parent_id, boundary_geojson } = req.body
    if (!name) return err(res, 'name is required')
    if (!boundary_geojson) return err(res, 'boundary_geojson is required')

    const result = await db.query(`
      INSERT INTO regions (name, type, parent_id, boundary)
      VALUES ($1, 'custom_area', $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
      RETURNING id, name, type, parent_id
    `, [name, parent_id || null, JSON.stringify(boundary_geojson)])

    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// DELETE /api/regions/:id — only custom_area can be deleted
router.delete('/:id', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const check = await db.query('SELECT type FROM regions WHERE id = $1', [req.params.id])
    if (!check.rows.length) return err(res, 'Region not found', 404)
    if (check.rows[0].type !== 'custom_area') {
      return err(res, 'Only custom areas can be deleted', 403)
    }

    await db.query('DELETE FROM regions WHERE id = $1', [req.params.id])
    ok(res, { deleted: true })
  } catch (e) { next(e) }
})

module.exports = router
