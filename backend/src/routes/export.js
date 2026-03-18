const express = require('express')
const router  = express.Router()
const db      = require('../db')
const auth    = require('../middleware/auth')

router.use(auth)

// GET /api/export/places?format=csv|geojson&region_id=&category_id=
router.get('/places', async (req, res, next) => {
  try {
    const { format, region_id, category_id } = req.query
    if (!format || !['csv', 'geojson'].includes(format)) {
      return res.status(400).json({ success: false, error: 'format must be csv or geojson' })
    }

    let sql = `
      SELECT p.id, p.name, p.name_bn, p.lat, p.lng,
             p.phone, p.opening_hours, p.address, p.floor_details,
             p.custom_notes, p.website, p.source, p.is_verified,
             p.custom_data,
             c.name AS category_name,
             r.name AS region_name,
             p.created_at
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN regions r ON r.id = p.region_id
      WHERE 1=1
    `
    const values = []
    let idx = 1

    if (region_id) {
      sql += ` AND p.region_id = $${idx++}`
      values.push(region_id)
    }
    if (category_id) {
      sql += ` AND p.category_id = $${idx++}`
      values.push(category_id)
    }

    sql += ' ORDER BY p.name'
    const result = await db.query(sql, values)
    const places = result.rows

    if (format === 'csv') {
      const headers = [
        'id','name','name_bn','lat','lng','phone','opening_hours',
        'address','floor_details','custom_notes','website','source',
        'is_verified','category_name','region_name','created_at'
      ]
      let csv = headers.join(',') + '\n'
      for (const p of places) {
        const row = headers.map(h => {
          const val = p[h]
          if (val === null || val === undefined) return ''
          const str = String(val)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"'
          }
          return str
        })
        csv += row.join(',') + '\n'
      }

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=places.csv')
      return res.send(csv)
    }

    // GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: places.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        },
        properties: {
          id: p.id,
          name: p.name,
          name_bn: p.name_bn,
          phone: p.phone,
          opening_hours: p.opening_hours,
          address: p.address,
          floor_details: p.floor_details,
          custom_notes: p.custom_notes,
          website: p.website,
          source: p.source,
          is_verified: p.is_verified,
          category_name: p.category_name,
          region_name: p.region_name,
          custom_data: p.custom_data,
          created_at: p.created_at
        }
      }))
    }

    res.setHeader('Content-Type', 'application/geo+json')
    res.setHeader('Content-Disposition', 'attachment; filename=places.geojson')
    return res.json(geojson)
  } catch (e) { next(e) }
})

module.exports = router
