const express   = require('express')
const router    = express.Router()
const db        = require('../db')
const { v4: uuidv4 } = require('uuid')
const adminAuth = require('../middleware/adminAuth')

const ok  = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra })

const err = (res, status, message) =>
  res.status(status).json({ success: false, error: message })

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, icon, color, custom_fields FROM categories ORDER BY name')
    ok(res, result.rows)
  } catch (e) { next(e) }
})

router.post('/', adminAuth, async (req, res, next) => {
  try {
    const { name, icon, color } = req.body
    if (!name || !name.trim()) return err(res, 400, 'Category name is required')
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) return err(res, 400, 'Color must be a valid hex color (e.g. #FF0000)')

    const id = uuidv4()
    const result = await db.query(
      `INSERT INTO categories (id, name, icon, color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, icon, color, custom_fields`,
      [id, name.trim(), icon || null, color || '#94A3B8']
    )
    ok(res, result.rows[0])
  } catch (e) {
    if (e.code === '23505') return err(res, 409, 'A category with that name already exists')
    next(e)
  }
})

router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { name, icon, color, custom_fields } = req.body
    if (name !== undefined && !name.trim()) return err(res, 400, 'Category name cannot be empty')
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) return err(res, 400, 'Color must be a valid hex color (e.g. #FF0000)')

    const fields = []
    const values = []
    let idx = 1

    if (name !== undefined)          { fields.push(`name = $${idx++}`);          values.push(name.trim()) }
    if (icon !== undefined)          { fields.push(`icon = $${idx++}`);          values.push(icon) }
    if (color !== undefined)         { fields.push(`color = $${idx++}`);         values.push(color) }
    if (custom_fields !== undefined) { fields.push(`custom_fields = $${idx++}`); values.push(JSON.stringify(custom_fields)) }

    if (!fields.length) return err(res, 400, 'No fields to update')

    values.push(req.params.id)
    const result = await db.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, icon, color, custom_fields`,
      values
    )
    if (!result.rows.length) return err(res, 404, 'Category not found')
    ok(res, result.rows[0])
  } catch (e) {
    if (e.code === '23505') return err(res, 409, 'A category with that name already exists')
    next(e)
  }
})

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 RETURNING id, name',
      [req.params.id]
    )
    if (!result.rows.length) return err(res, 404, 'Category not found')
    ok(res, result.rows[0])
  } catch (e) { next(e) }
})

module.exports = router
