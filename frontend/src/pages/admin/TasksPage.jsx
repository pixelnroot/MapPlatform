import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import TaskCard from '../../components/Admin/TaskCard'
import { getTasks, createTask, updateTask, deleteTask, getUsers, getRegions } from '../../api'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' })
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadTasks()
    getUsers().then(r => setUsers(r.data.data || [])).catch(() => {})
    getRegions().then(r => setRegions(r.data.data || [])).catch(() => {})
  }, [])

  async function loadTasks() {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    getTasks(params)
      .then(res => setTasks(res.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [statusFilter])

  async function handleCreate(e) {
    e.preventDefault()
    await createTask(form)
    setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' })
    setShowForm(false)
    loadTasks()
  }

  async function handleStatusChange(id, status) {
    await updateTask(id, { status })
    loadTasks()
  }

  const statusGroups = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  }

  return (
    <AdminLayout>
      <h1>Tasks</h1>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', 'pending', 'in_progress', 'completed'].map(s => (
          <button key={s} className={`tile-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem', maxWidth: '500px' }}>
          <input placeholder="Title" required value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea placeholder="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input type="date" value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>Create Task</button>
        </form>
      )}

      {loading ? <div className="loading">Loading...</div> : (
        statusFilter ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {tasks.map(t => (
              <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
            ))}
            {tasks.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No tasks</p>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {Object.entries(statusGroups).map(([status, items]) => (
              <div key={status}>
                <h3 style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '.5rem' }}>
                  {status.replace('_', ' ')} ({items.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {items.map(t => (
                    <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </AdminLayout>
  )
}
