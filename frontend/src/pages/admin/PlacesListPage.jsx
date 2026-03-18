import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminPlaces, deletePlace } from '../../api'
import AdminLayout from '../../components/Admin/AdminLayout'
import ExportButton from '../../components/Admin/ExportButton'

export default function PlacesListPage() {
  const [places, setPlaces] = useState([])
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  function loadPlaces() {
    setLoading(true)
    setError(null)
    getAdminPlaces({ bbox: '20.59,88.01,26.63,92.67', limit: 500 })
      .then(res => setPlaces(res.data.data || []))
      .catch(err => setError(err.response?.data?.error || 'Failed to load places'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPlaces() }, [])

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    await deletePlace(id)
    loadPlaces()
  }

  const filtered = places.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchesSource = sourceFilter === 'all' || p.source === sourceFilter
    return matchesSearch && matchesSource
  })

  return (
    <AdminLayout>
      <h1>Places</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px', padding: '.6rem .8rem',
            background: 'var(--bg-secondary)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: '6px'
          }}
        />
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {['all', 'manual', 'osm'].map(s => (
            <button key={s} className={`tile-btn ${sourceFilter === s ? 'active' : ''}`}
              onClick={() => setSourceFilter(s)}>
              {s === 'all' ? 'All' : s === 'manual' ? 'Manual' : 'OSM'}
            </button>
          ))}
        </div>
        <ExportButton />
      </div>

      {loading && <div className="loading">Loading places...</div>}
      {error && <div className="error-msg">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Source</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category_name}</td>
              <td>
                <span className={`source-badge ${p.source}`}>
                  {p.source}
                </span>
              </td>
              <td style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn-primary" onClick={() => navigate(`/admin/places/${p.id}/edit`)}>
                  Edit
                </button>
                <button className="btn-danger" onClick={() => handleDelete(p.id, p.name)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  )
}
