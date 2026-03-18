const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')

const ok  = (res, data) => res.json({ success: true, data })
const err = (res, msg, status = 400) => res.status(status).json({ success: false, error: msg })

router.use(auth)

// GET /api/tasks
router.get('/', async (req, res, next) => {
  try {
    const { status, assigned_to } = req.query

    let sql = `
      SELECT t.*,
             u1.name AS assigned_to_name,
             u2.name AS created_by_name,
             r.name AS region_name
      FROM tasks t
      LEFT JOIN users u1 ON u1.id = t.assigned_to
      LEFT JOIN users u2 ON u2.id = t.created_by
      LEFT JOIN regions r ON r.id = t.region_id
      WHERE 1=1
    `
    const values = []
    let idx = 1

    if (status) {
      sql += ` AND t.status = $${idx++}`
      values.push(status)
    }
    if (assigned_to) {
      sql += ` AND t.assigned_to = $${idx++}`
      values.push(assigned_to)
    }

    // Collectors can only see their own tasks
    if (req.user.role === 'collector') {
      sql += ` AND t.assigned_to = $${idx++}`
      values.push(req.user.id)
    }

    sql += ' ORDER BY t.created_at DESC'
    const result = await db.query(sql, values)
    ok(res, result.rows)
  } catch (e) { next(e) }
})

// POST /api/tasks
router.post('/', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { title, description, assigned_to, region_id, priority, due_date } = req.body
    if (!title) return err(res, 'title is required')

    const result = await db.query(`
      INSERT INTO tasks (title, description, assigned_to, created_by, region_id, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, description || null, assigned_to || null, req.user.id,
        region_id || null, priority || 'medium', due_date || null])

    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// PUT /api/tasks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, assigned_to, region_id, status, priority, due_date } = req.body

    const fields = []
    const values = []
    let idx = 1

    if (title !== undefined)       { fields.push(`title = $${idx++}`);       values.push(title) }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description) }
    if (assigned_to !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(assigned_to || null) }
    if (region_id !== undefined)   { fields.push(`region_id = $${idx++}`);   values.push(region_id || null) }
    if (status !== undefined)      { fields.push(`status = $${idx++}`);      values.push(status) }
    if (priority !== undefined)    { fields.push(`priority = $${idx++}`);    values.push(priority) }
    if (due_date !== undefined)    { fields.push(`due_date = $${idx++}`);    values.push(due_date || null) }

    if (!fields.length) return err(res, 'No fields to update')

    values.push(id)
    const result = await db.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    if (!result.rows.length) return err(res, 'Task not found', 404)
    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

// DELETE /api/tasks/:id
router.delete('/:id', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id])
    if (!result.rows.length) return err(res, 'Task not found', 404)
    ok(res, { deleted: true })
  } catch (e) { next(e) }
})

module.exports = router
