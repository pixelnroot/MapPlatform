import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import { getFlags, updateFlag, autoFlag } from '../../api'

export default function FlagsPage() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')

  useEffect(() => { loadFlags() }, [statusFilter])

  async function loadFlags() {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    getFlags(params)
      .then(res => setFlags(res.data.data || []))
      .finally(() => setLoading(false))
  }

  async function handleResolve(id) {
    await updateFlag(id, { status: 'resolved' })
    loadFlags()
  }

  async function handleDismiss(id) {
    await updateFlag(id, { status: 'dismissed' })
    loadFlags()
  }

  async function handleAutoFlag() {
    const res = await autoFlag()
    alert(`Auto-flagged ${res.data.data.flagged} incomplete places`)
    loadFlags()
  }

  const typeColors = {
    incorrect_location: '#EF4444',
    closed: '#64748B',
    duplicate: '#F97316',
    incomplete: '#F59E0B',
    other: '#94A3B8',
  }

  return (
    <AdminLayout>
      <h1>Data Quality Flags</h1>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['open', 'resolved', 'dismissed', ''].map(s => (
          <button key={s} className={`tile-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
        <button className="btn-primary" onClick={handleAutoFlag}>Auto-Flag Incomplete</button>
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Place</th><th>Type</th><th>Status</th><th>Reporter</th><th>Notes</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(f => (
              <tr key={f.id}>
                <td>{f.place_name}</td>
                <td>
                  <span style={{
                    padding: '.15rem .4rem', borderRadius: '2px', fontSize: '.7rem',
                    background: `${typeColors[f.type]}22`, color: typeColors[f.type],
                    border: `1px solid ${typeColors[f.type]}44`
                  }}>
                    {f.type}
                  </span>
                </td>
                <td>
                  <span className={`source-badge ${f.status === 'open' ? 'osm' : 'manual'}`}>
                    {f.status}
                  </span>
                </td>
                <td>{f.user_name || '-'}</td>
                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.notes || '-'}</td>
                <td style={{ fontSize: '.75rem' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                <td>
                  {f.status === 'open' && (
                    <div style={{ display: 'flex', gap: '.3rem' }}>
                      <button className="btn-primary" style={{ padding: '.2rem .5rem', fontSize: '.65rem' }}
                        onClick={() => handleResolve(f.id)}>Resolve</button>
                      <button className="tile-btn" style={{ fontSize: '.65rem' }}
                        onClick={() => handleDismiss(f.id)}>Dismiss</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {flags.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No flags</td></tr>
            )}
          </tbody>
        </table>
      )}
    </AdminLayout>
  )
}
