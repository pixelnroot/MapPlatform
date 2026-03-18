import { useState, useEffect } from 'react'
import { getCategories, getRegions } from '../../api'
import PinPicker from './PinPicker'

export default function PlaceForm({ initialData = {}, onSubmit }) {
  const [form, setForm] = useState({
    name: initialData.name || '',
    name_bn: initialData.name_bn || '',
    category_id: initialData.category_id || '',
    region_id: initialData.region_id || '',
    lat: initialData.lat || '',
    lng: initialData.lng || '',
    phone: initialData.phone || '',
    opening_hours: initialData.opening_hours || '',
    address: initialData.address || '',
    floor_details: initialData.floor_details || '',
    custom_notes: initialData.custom_notes || '',
    website: initialData.website || '',
  })
  const [customData, setCustomData] = useState(initialData.custom_data || {})
  const [files, setFiles] = useState(null)
  const [categories, setCategories] = useState([])
  const [regions, setRegions] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    getCategories()
      .then(res => setCategories(res.data.data || []))
      .catch(() => setLoadError('Failed to load categories'))
    getRegions()
      .then(res => setRegions(res.data.data || []))
      .catch(() => setLoadError('Failed to load regions'))
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePick(lat, lng) {
    setForm(prev => ({ ...prev, lat, lng }))
  }

  function handleCustomFieldChange(fieldName, value) {
    setCustomData(prev => ({ ...prev, [fieldName]: value }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.region_id) errs.region_id = 'Region is required'
    if (!form.lat && form.lat !== 0) errs.lat = 'Valid latitude required'
    if (!form.lng && form.lng !== 0) errs.lng = 'Valid longitude required'
    const lat = Number(form.lat)
    const lng = Number(form.lng)
    if (isNaN(lat) || lat < -90 || lat > 90) errs.lat = 'Latitude must be between -90 and 90'
    if (isNaN(lng) || lng < -180 || lng > 180) errs.lng = 'Longitude must be between -180 and 180'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    const body = {
      ...form,
      lat: Number(form.lat),
      lng: Number(form.lng),
      category_id: form.category_id || null,
      custom_data: customData,
    }
    await onSubmit(body, files)
    setSaving(false)
  }

  // Get custom fields for the selected category
  const selectedCat = categories.find(c => c.id === form.category_id)
  const customFields = selectedCat?.custom_fields || []

  return (
    <form onSubmit={handleSubmit}>
      {loadError && <div className="error-msg">{loadError}</div>}
      <div className="form-group">
        <label>Name *</label>
        <input name="name" value={form.name} onChange={handleChange} />
        {errors.name && <div className="error-msg">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label>Bengali Name</label>
        <input name="name_bn" value={form.name_bn} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select name="category_id" value={form.category_id} onChange={handleChange}>
          <option value="">Select category</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Region *</label>
        <select name="region_id" value={form.region_id} onChange={handleChange}>
          <option value="">Select region</option>
          {regions.filter(r => r.type === 'city' || r.type === 'area').map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {errors.region_id && <div className="error-msg">{errors.region_id}</div>}
      </div>

      <div className="form-group">
        <label>Location *</label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input name="lat" placeholder="Latitude" value={form.lat} onChange={handleChange} style={{ flex: 1 }} />
          <input name="lng" placeholder="Longitude" value={form.lng} onChange={handleChange} style={{ flex: 1 }} />
        </div>
        {errors.lat && <div className="error-msg">{errors.lat}</div>}
        {errors.lng && <div className="error-msg">{errors.lng}</div>}
      </div>

      <PinPicker
        initialLat={form.lat ? Number(form.lat) : undefined}
        initialLng={form.lng ? Number(form.lng) : undefined}
        onPick={handlePick}
      />

      <div className="form-group">
        <label>Phone</label>
        <input name="phone" value={form.phone} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Opening Hours</label>
        <input name="opening_hours" value={form.opening_hours} onChange={handleChange} placeholder="e.g. 9am - 10pm" />
      </div>

      <div className="form-group">
        <label>Address</label>
        <input name="address" value={form.address} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Floor Details</label>
        <input name="floor_details" value={form.floor_details} onChange={handleChange} placeholder="e.g. Ground floor, Shop #12" />
      </div>

      <div className="form-group">
        <label>Custom Notes</label>
        <textarea name="custom_notes" value={form.custom_notes} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Website</label>
        <input name="website" type="url" value={form.website} onChange={handleChange} />
      </div>

      {/* Dynamic custom fields based on category */}
      {customFields.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '.5rem' }}>
            Custom Fields ({selectedCat?.name})
          </h3>
          {customFields.map(field => (
            <div className="form-group" key={field.name}>
              <label>{field.label || field.name}</label>
              {field.type === 'text' && (
                <input
                  value={customData[field.name] || ''}
                  onChange={e => handleCustomFieldChange(field.name, e.target.value)}
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  value={customData[field.name] || ''}
                  onChange={e => handleCustomFieldChange(field.name, e.target.value)}
                />
              )}
              {field.type === 'boolean' && (
                <select
                  value={customData[field.name] !== undefined ? String(customData[field.name]) : ''}
                  onChange={e => handleCustomFieldChange(field.name, e.target.value === 'true')}
                >
                  <option value="">Select</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}
              {field.type === 'select' && (
                <select
                  value={customData[field.name] || ''}
                  onChange={e => handleCustomFieldChange(field.name, e.target.value)}
                >
                  <option value="">Select</option>
                  {(field.options || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {field.type === 'date' && (
                <input
                  type="date"
                  value={customData[field.name] || ''}
                  onChange={e => handleCustomFieldChange(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="form-group">
        <label>Photos</label>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={e => setFiles(e.target.files)}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving...' : 'Save Place'}
      </button>
    </form>
  )
}
