const jwt = require('jsonwebtoken')
const db = require('../db')

module.exports = async function adminAuth(req, res, next) {
  // Try JWT first
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const result = await db.query(
        'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
        [payload.userId]
      )
      if (result.rows.length && result.rows[0].is_active) {
        const user = result.rows[0]
        if (['owner', 'admin', 'collector'].includes(user.role)) {
          req.user = user
          return next()
        }
        return res.status(403).json({ success: false, error: 'Insufficient permissions' })
      }
    } catch {
      // Fall through to x-admin-key check
    }
  }

  // Fall back to x-admin-key
  const key = req.headers['x-admin-key']
  if (key && key === process.env.ADMIN_KEY) {
    req.user = { id: null, email: 'admin@legacy', name: 'Legacy Admin', role: 'owner' }
    return next()
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized. Valid x-admin-key header or Bearer token required.'
  })
}
