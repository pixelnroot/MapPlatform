const db = require('../db')

module.exports = async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required (X-API-Key header)' })
  }

  try {
    const result = await db.query(
      'SELECT id, name, is_active, rate_limit FROM api_keys WHERE key = $1',
      [apiKey]
    )
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, error: 'Invalid or inactive API key' })
    }

    await db.query('UPDATE api_keys SET last_used = NOW() WHERE key = $1', [apiKey])
    req.apiKey = result.rows[0]
    next()
  } catch (e) {
    next(e)
  }
}
