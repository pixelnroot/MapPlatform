const db = require('../db')

module.exports = async function logActivity(userId, action, entityType, entityId, details = {}) {
  try {
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    )
  } catch (e) {
    console.error('Failed to log activity:', e.message)
  }
}
