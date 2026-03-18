import { useState } from 'react'
import { exportPlaces } from '../../api'

export default function ExportButton({ regionId, categoryId }) {
  const [loading, setLoading] = useState(false)

  async function handleExport(format) {
    setLoading(true)
    try {
      const params = {}
      if (regionId) params.region_id = regionId
      if (categoryId) params.category_id = categoryId

      if (format === 'csv') {
        const res = await exportPlaces('csv', params)
        const blob = new Blob([res.data], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'places.csv'
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const res = await exportPlaces('geojson', params)
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/geo+json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'places.geojson'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      alert('Export failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '.5rem' }}>
      <button className="btn-primary" onClick={() => handleExport('csv')} disabled={loading}>
        {loading ? 'Exporting...' : 'Export CSV'}
      </button>
      <button className="btn-primary" onClick={() => handleExport('geojson')} disabled={loading}>
        Export GeoJSON
      </button>
    </div>
  )
}
