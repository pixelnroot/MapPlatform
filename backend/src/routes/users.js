const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const db      = require('../db')
const auth    = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

router.use(auth)
router.use(requireRole('owner', 'admin'))

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    )
    ok(res, result.rows)
  } catch (e) { next(e) }
})

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body
    if (!email || !name || !password) return err(res, 'email, name, and password are required')

    const validRoles = ['owner', 'admin', 'collector', 'viewer']
    if (role && !validRoles.includes(role)) return err(res, 'Invalid role')

    const hashed = await bcrypt.hash(password, 10)
    const result = await db.query(
      `INSERT INTO users (email, name, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, is_active, created_at`,
      [email.toLowerCase().trim(), name.trim(), hashed, role || 'viewer']
    )
    ok(res, result.rows[0])
  } catch (e) {
    if (e.code === '23505') return err(res, 'A user with that email already exists', 409)
    next(e)
  }
})

// PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { email, name, password, role, is_active } = req.body

    const fields = []
    const values = []
    let idx = 1

    if (email !== undefined)     { fields.push(`email = $${idx++}`);     values.push(email.toLowerCase().trim()) }
    if (name !== undefined)      { fields.push(`name = $${idx++}`);      values.push(name.trim()) }
    if (role !== undefined)      { fields.push(`role = $${idx++}`);      values.push(role) }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active) }
    if (password)                { fields.push(`password = $${idx++}`);  values.push(await bcrypt.hash(password, 10)) }

    if (!fields.length) return err(res, 'No fields to update')

    values.push(id)
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, email, name, role, is_active, created_at`,
      values
    )
    if (!result.rows.length) return err(res, 'User not found', 404)
    ok(res, result.rows[0])
  } catch (e) {
    if (e.code === '23505') return err(res, 'A user with that email already exists', 409)
    next(e)
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [req.params.id]
    )
    if (!result.rows.length) return err(res, 'User not found', 404)
    ok(res, { deleted: true })
  } catch (e) { next(e) }
})

module.exports = router
