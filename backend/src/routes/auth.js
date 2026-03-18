const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const db      = require('../db')
const auth    = require('../middleware/auth')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return err(res, 'Email and password are required')

    const result = await db.query(
      'SELECT id, email, name, password, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (!result.rows.length) return err(res, 'Invalid email or password', 401)

    const user = result.rows[0]
    if (!user.is_active) return err(res, 'Account is deactivated', 401)

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return err(res, 'Invalid email or password', 401)

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    ok(res, {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (e) { next(e) }
})

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  ok(res, req.user)
})

module.exports = router
