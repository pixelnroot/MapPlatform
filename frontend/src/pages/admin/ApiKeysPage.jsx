import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import EmbedGenerator from '../../components/Admin/EmbedGenerator'
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../../api'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadKeys() }, [])

  async function loadKeys() {
    getApiKeys()
      .then(res => setKeys(res.data.data || []))
      .catch(e => setError(e.response?.data?.error || 'Failed'))
      .finally(() => setLoading(false))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    await createApiKey({ name: name.trim() })
    setName('')
    loadKeys()
  }

  async function handleToggle(key) {
    await updateApiKey(key.id, { is_active: !key.is_active })
    loadKeys()
  }

  async function handleDelete(key) {
    if (!confirm(`Delete API key "${key.name}"?`)) return
    await deleteApiKey(key.id)
    loadKeys()
  }

  return (
    <AdminLayout>
      <h1>API Keys</h1>
      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
        <input placeholder="Key name" value={name} onChange={e => setName(e.target.value)} required />
        <button type="submit" className="btn-primary">Create Key</button>
      </form>

      {loading ? <div className="loading">Loading...</div> : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Key</th><th>Status</th><th>Last Used</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '.7rem' }}>{k.key}</td>
                <td>{k.is_active ? 'Active' : 'Inactive'}</td>
                <td style={{ fontSize: '.75rem' }}>
                  {k.last_used ? new Date(k.last_used).toLocaleString() : 'Never'}
                </td>
                <td style={{ display: 'flex', gap: '.3rem' }}>
                  <button className="tile-btn" onClick={() => handleToggle(k)}>
                    {k.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(k)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <EmbedGenerator />
    </AdminLayout>
  )
}
