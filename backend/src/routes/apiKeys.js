const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const db      = require('../db')
const auth    = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

router.use(auth)
router.use(requireRole('owner', 'admin'))

// GET /api/api-keys
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, key, is_active, rate_limit, last_used, created_at
       FROM api_keys ORDER BY created_at DESC`
    )
    ok(res, result.rows)
  } catch (e) { next(e) }
})

// POST /api/api-keys
router.post('/', async (req, res, next) => {
  try {
    const { name, rate_limit } = req.body
    if (!name) return err(res, 'name is required')

    const key = 'mp_' + crypto.randomBytes(24).toString('hex')

    const result = await db.query(
      `INSERT INTO api_keys (name, key, created_by, rate_limit)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key, is_active, rate_limit, created_at`,
      [name, key, req.user.id, rate_limit || 1000]
    )
    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// PUT /api/api-keys/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, is_active, rate_limit } = req.body
    const fields = []
    const values = []
    let idx = 1

    if (name !== undefined)       { fields.push(`name = $${idx++}`);       values.push(name) }
    if (is_active !== undefined)  { fields.push(`is_active = $${idx++}`);  values.push(is_active) }
    if (rate_limit !== undefined) { fields.push(`rate_limit = $${idx++}`); values.push(rate_limit) }

    if (!fields.length) return err(res, 'No fields to update')

    values.push(req.params.id)
    const result = await db.query(
      `UPDATE api_keys SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, key, is_active, rate_limit, last_used, created_at`,
      values
    )
    if (!result.rows.length) return err(res, 'API key not found', 404)
    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// DELETE /api/api-keys/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING id',
      [req.params.id]
    )
    if (!result.rows.length) return err(res, 'API key not found', 404)
    ok(res, { deleted: true })
  } catch (e) { next(e) }
})

module.exports = router
