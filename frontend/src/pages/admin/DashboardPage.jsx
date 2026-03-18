import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStats } from '../../api'
import AdminLayout from '../../components/Admin/AdminLayout'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getStats()
      .then(res => setStats(res.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load dashboard stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <AdminLayout><div className="loading">Loading...</div></AdminLayout>
  if (error) return <AdminLayout><div className="error-msg">{error}</div></AdminLayout>
  if (!stats) return <AdminLayout><div className="error-msg">No data available</div></AdminLayout>

  return (
    <AdminLayout>
      <h1>Dashboard</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total_places}</div>
          <div className="stat-label">Total Places</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.manual_places}</div>
          <div className="stat-label">Manual (Field)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.osm_places}</div>
          <div className="stat-label">From OSM</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_roads}</div>
          <div className="stat-label">Roads</div>
        </div>
      </div>

      <h2>Recently Added</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Added</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {stats.recent_places.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category_name}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
              <td>
                <button className="btn-primary" onClick={() => navigate(`/admin/places/${p.id}/edit`)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  )
}
