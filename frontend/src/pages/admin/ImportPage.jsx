import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import { importPlaces, getRegions } from '../../api'

export default function ImportPage() {
  const [regions, setRegions] = useState([])
  const [regionId, setRegionId] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getRegions().then(res => {
      const data = res.data.data || []
      setRegions(data)
      const cities = data.filter(r => r.type === 'city' || r.type === 'area')
      if (cities.length > 0) setRegionId(cities[0].id)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return setError('Please select a file')
    if (!regionId) return setError('Please select a region')

    setLoading(true)
    setError('')
    setResult(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('region_id', regionId)

    try {
      const res = await importPlaces(fd)
      setResult(res.data.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <h1>Import Places</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.8rem', marginBottom: '1rem' }}>
        Upload a CSV or GeoJSON file to bulk import places.
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <div className="form-group">
          <label>Region</label>
          <select value={regionId} onChange={e => setRegionId(e.target.value)}>
            {regions.filter(r => r.type === 'city' || r.type === 'area').map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>File (CSV or GeoJSON)</label>
          <input type="file" accept=".csv,.geojson,.json" onChange={e => setFile(e.target.files[0])} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Importing...' : 'Import'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px' }}>
          <h3 style={{ color: 'var(--neon-green)', marginBottom: '.5rem' }}>Import Complete</h3>
          <div>Imported: <strong>{result.imported}</strong></div>
          <div>Skipped: <strong>{result.skipped}</strong></div>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: '.5rem' }}>
              <h4>Errors:</h4>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: '.75rem', color: 'var(--neon-pink)' }}>
                  Row {e.row}: {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CSV Format</h3>
        <pre style={{ fontSize: '.7rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '.5rem', borderRadius: '4px', overflow: 'auto' }}>
          name,lat,lng,category_name,phone,opening_hours,address{'\n'}
          "Dhaka Hospital",23.75,90.39,"Hospital","+880123456",,"Mirpur Road"
        </pre>
      </div>
    </AdminLayout>
  )
}
