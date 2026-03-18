const jwt = require('jsonwebtoken')
const db = require('../db')

module.exports = async function auth(req, res, next) {
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
      if (!result.rows.length || !result.rows[0].is_active) {
        return res.status(401).json({ success: false, error: 'User not found or inactive' })
      }
      req.user = result.rows[0]
      return next()
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }
  }

  // Fall back to x-admin-key for backward compat
  const key = req.headers['x-admin-key']
  if (key && key === process.env.ADMIN_KEY) {
    req.user = { id: null, email: 'admin@legacy', name: 'Legacy Admin', role: 'owner' }
    return next()
  }

  // Check for API key
  const apiKey = req.headers['x-api-key']
  if (apiKey) {
    const result = await db.query(
      'SELECT id, name, is_active, rate_limit FROM api_keys WHERE key = $1',
      [apiKey]
    )
    if (result.rows.length && result.rows[0].is_active) {
      await db.query('UPDATE api_keys SET last_used = NOW() WHERE key = $1', [apiKey])
      req.apiKey = result.rows[0]
      req.user = { id: null, email: 'api-key', name: result.rows[0].name, role: 'viewer' }
      return next()
    }
  }

  return res.status(401).json({ success: false, error: 'Authentication required' })
}
