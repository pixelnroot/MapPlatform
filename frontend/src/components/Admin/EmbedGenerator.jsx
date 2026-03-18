import { useState } from 'react'

export default function EmbedGenerator() {
  const [lat, setLat] = useState('23.7749')
  const [lng, setLng] = useState('90.3994')
  const [zoom, setZoom] = useState('13')
  const [category, setCategory] = useState('')
  const [apiKey, setApiKey] = useState('')

  const baseUrl = window.location.origin
  const params = new URLSearchParams()
  if (lat) params.set('lat', lat)
  if (lng) params.set('lng', lng)
  if (zoom) params.set('zoom', zoom)
  if (category) params.set('category', category)
  if (apiKey) params.set('api_key', apiKey)

  const embedUrl = `${baseUrl}/embed?${params.toString()}`
  const iframe = `<iframe src="${embedUrl}" width="600" height="400" frameborder="0"></iframe>`

  return (
    <div style={{ marginTop: '1rem' }}>
      <h3>Embed Map Widget</h3>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input placeholder="Latitude" value={lat} onChange={e => setLat(e.target.value)} style={{ width: '120px' }} />
        <input placeholder="Longitude" value={lng} onChange={e => setLng(e.target.value)} style={{ width: '120px' }} />
        <input placeholder="Zoom" value={zoom} onChange={e => setZoom(e.target.value)} style={{ width: '80px' }} />
        <input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} style={{ width: '120px' }} />
        <input placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ width: '200px' }} />
      </div>
      <div className="form-group">
        <label>Iframe Code</label>
        <textarea readOnly value={iframe} rows={3} style={{ width: '100%', fontFamily: 'monospace', fontSize: '.8rem' }} />
      </div>
      <div className="form-group">
        <label>Preview</label>
        <iframe src={embedUrl} width="100%" height="300" style={{ border: '1px solid var(--border)', borderRadius: '4px' }} />
      </div>
    </div>
  )
}
