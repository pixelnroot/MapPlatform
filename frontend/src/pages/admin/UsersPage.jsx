import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import { getUsers, createUser, updateUser, deleteUser } from '../../api'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'collector' })

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    try {
      const res = await getUsers()
      setUsers(res.data.data || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    try {
      await createUser(form)
      setForm({ email: '', name: '', password: '', role: 'collector' })
      setShowForm(false)
      loadUsers()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create user')
    }
  }

  async function handleToggleActive(user) {
    await updateUser(user.id, { is_active: !user.is_active })
    loadUsers()
  }

  async function handleDelete(user) {
    if (!confirm(`Delete user "${user.name}"?`)) return
    await deleteUser(user.id)
    loadUsers()
  }

  return (
    <AdminLayout>
      <h1>Users</h1>
      {error && <div className="error-msg">{error}</div>}

      <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Cancel' : '+ Add User'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} style={{ marginBottom: '1.5rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <input placeholder="Email" type="email" required value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input placeholder="Name" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input placeholder="Password" type="password" required value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="viewer">Viewer</option>
            <option value="collector">Collector</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button type="submit" className="btn-primary">Create</button>
        </form>
      )}

      {loading ? <div className="loading">Loading...</div> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="source-badge manual">{u.role}</span></td>
                <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                <td style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="tile-btn" onClick={() => handleToggleActive(u)}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  )
}
