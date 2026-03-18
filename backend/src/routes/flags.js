const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

// GET /api/flags (admin)
router.get('/', auth, async (req, res, next) => {
  try {
    const { status } = req.query

    let sql = `
      SELECT f.*,
             p.name AS place_name,
             u.name AS user_name
      FROM flags f
      LEFT JOIN places p ON p.id = f.place_id
      LEFT JOIN users u ON u.id = f.user_id
      WHERE 1=1
    `
    const values = []
    let idx = 1

    if (status) {
      sql += ` AND f.status = $${idx++}`
      values.push(status)
    }

    sql += ' ORDER BY f.created_at DESC'
    const result = await db.query(sql, values)
    ok(res, result.rows)
  } catch (e) { next(e) }
})

// POST /api/flags — anyone can flag (auth optional for public users)
router.post('/', async (req, res, next) => {
  try {
    const { place_id, type, notes } = req.body
    if (!place_id) return err(res, 'place_id is required')
    if (!type) return err(res, 'type is required')

    const validTypes = ['incorrect_location', 'closed', 'duplicate', 'incomplete', 'other']
    if (!validTypes.includes(type)) return err(res, 'Invalid flag type')

    const placeCheck = await db.query('SELECT id FROM places WHERE id = $1', [place_id])
    if (!placeCheck.rows.length) return err(res, 'Place not found', 404)

    const userId = req.user?.id || null

    const result = await db.query(`
      INSERT INTO flags (place_id, user_id, type, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [place_id, userId, type, notes || null])

    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// PUT /api/flags/:id — resolve/dismiss (admin only)
router.put('/:id', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.body
    if (!status || !['open', 'resolved', 'dismissed'].includes(status)) {
      return err(res, 'Invalid status')
    }

    const result = await db.query(
      'UPDATE flags SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    if (!result.rows.length) return err(res, 'Flag not found', 404)
    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// POST /api/flags/auto — auto-flag incomplete places (admin)
router.post('/auto', auth, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await db.query(`
      INSERT INTO flags (place_id, type, notes)
      SELECT p.id, 'incomplete', 'Auto-flagged: missing phone, hours, and address'
      FROM places p
      WHERE p.phone IS NULL AND p.opening_hours IS NULL AND p.address IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM flags f WHERE f.place_id = p.id AND f.type = 'incomplete' AND f.status = 'open'
      )
      RETURNING id
    `)
    ok(res, { flagged: result.rowCount })
  } catch (e) { next(e) }
})

module.exports = router
