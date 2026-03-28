import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api'

const FIELD_TYPES = ['text', 'number', 'boolean', 'select', 'date']

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add form state
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')

  // Edit state
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')

  // Custom fields editor
  const [editingFields, setEditingFields] = useState(null)
  const [customFields, setCustomFields] = useState([])

  useEffect(() => { fetchCategories() }, [])

  async function fetchCategories() {
    try {
      const res = await getCategories()
      setCategories(res.data.data)
    } catch {
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      await createCategory({ name: newName.trim(), icon: newIcon || null })
      setNewName('')
      setNewIcon('')
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category')
    }
  }

  function startEdit(cat) {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon || '')
    setEditColor(cat.color)
  }

  async function handleUpdate() {
    if (!editName.trim()) return
    setError('')
    try {
      await updateCategory(editId, { name: editName.trim(), icon: editIcon || null, color: editColor })
      setEditId(null)
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update category')
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete category "${name}"? Places using it will become uncategorized.`)) return
    setError('')
    try {
      await deleteCategory(id)
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete category')
    }
  }

  function startEditFields(cat) {
    setEditingFields(cat.id)
    setCustomFields(cat.custom_fields || [])
  }

  function addField() {
    setCustomFields(prev => [...prev, { name: '', label: '', type: 'text', options: [] }])
  }

  function updateField(index, key, value) {
    setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f))
  }

  function removeField(index) {
    setCustomFields(prev => prev.filter((_, i) => i !== index))
  }

  async function saveFields() {
    setError('')
    try {
      await updateCategory(editingFields, { custom_fields: customFields })
      setEditingFields(null)
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save fields')
    }
  }

  return (
    <AdminLayout>
      <h2>Categories</h2>

      {error && <div className="admin-error error-msg">{error}</div>}

      <form className="category-add-form" onSubmit={handleAdd}
        style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Category name" value={newName}
          onChange={e => setNewName(e.target.value)} required />
        <input type="text" placeholder="Icon (emoji)" value={newIcon}
          onChange={e => setNewIcon(e.target.value)} style={{ width: '80px' }} />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      {loading ? <p>Loading...</p> : (
        <table className="admin-table">
          <thead>
            <tr><th>Icon</th><th>Name</th><th>Color</th><th>Fields</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                {editId === cat.id ? (
                  <>
                    <td><input type="text" value={editIcon} onChange={e => setEditIcon(e.target.value)} style={{ width: '60px' }} /></td>
                    <td><input type="text" value={editName} onChange={e => setEditName(e.target.value)} /></td>
                    <td><input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '50px', height: '30px', padding: '2px', cursor: 'pointer' }} /></td>
                    <td>{(cat.custom_fields || []).length} fields</td>
                    <td>
                      <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
                      <button className="btn" onClick={() => setEditId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{cat.icon}</td>
                    <td>{cat.name}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: '20px', height: '20px', background: cat.color, borderRadius: '4px', verticalAlign: 'middle', marginRight: '6px' }} />
                      {cat.color}
                    </td>
                    <td>
                      <button className="tile-btn" onClick={() => startEditFields(cat)}
                        style={{ fontSize: '.65rem' }}>
                        {(cat.custom_fields || []).length} fields
                      </button>
                    </td>
                    <td>
                      <button className="btn" onClick={() => startEdit(cat)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(cat.id, cat.name)}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Custom Fields Editor Modal */}
      {editingFields && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '.85rem', color: 'var(--accent)', marginBottom: '.5rem' }}>
            Custom Fields for {categories.find(c => c.id === editingFields)?.name}
          </h3>

          {customFields.map((field, i) => (
            <div key={i} style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input placeholder="Field name" value={field.name}
                onChange={e => updateField(i, 'name', e.target.value)}
                style={{ width: '120px' }} />
              <input placeholder="Label" value={field.label}
                onChange={e => updateField(i, 'label', e.target.value)}
                style={{ width: '120px' }} />
              <select value={field.type} onChange={e => updateField(i, 'type', e.target.value)}>
                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {field.type === 'select' && (
                <input placeholder="Options (comma-separated)" value={(field.options || []).join(',')}
                  onChange={e => updateField(i, 'options', e.target.value.split(',').map(s => s.trim()))}
                  style={{ width: '200px' }} />
              )}
              <button className="btn-danger" style={{ padding: '.2rem .5rem', fontSize: '.65rem' }}
                onClick={() => removeField(i)}>X</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
            <button className="tile-btn" onClick={addField}>+ Add Field</button>
            <button className="btn-primary" onClick={saveFields}>Save Fields</button>
            <button className="tile-btn" onClick={() => setEditingFields(null)}>Cancel</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
