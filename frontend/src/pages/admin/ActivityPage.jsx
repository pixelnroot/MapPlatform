import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import { getActivity } from '../../api'

export default function ActivityPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActivity(100)
      .then(res => setLogs(res.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <h1>Activity Log</h1>
      {loading ? <div className="loading">Loading...</div> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '.75rem' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td>{log.user_name || 'System'}</td>
                <td>
                  <span className={`source-badge ${log.action === 'delete' ? 'osm' : 'manual'}`}>
                    {log.action}
                  </span>
                </td>
                <td>{log.entity_type}</td>
                <td style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                  {log.details?.name || log.details?.fields?.join(', ') || '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No activity yet</td></tr>
            )}
          </tbody>
        </table>
      )}
    </AdminLayout>
  )
}
