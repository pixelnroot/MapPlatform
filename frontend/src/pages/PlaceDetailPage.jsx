import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { getPlace, createFlag } from '../api'
import { TILE_LAYERS } from '../config'

export default function PlaceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flagging, setFlagging] = useState(false)
  const [flagType, setFlagType] = useState('')
  const [flagNotes, setFlagNotes] = useState('')
  const [flagSent, setFlagSent] = useState(false)

  useEffect(() => {
    getPlace(id)
      .then(res => setPlace(res.data.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleFlag() {
    if (!flagType) return
    await createFlag({ place_id: id, type: flagType, notes: flagNotes })
    setFlagSent(true)
    setFlagging(false)
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!place)  return null

  const API_URL = import.meta.env.VITE_API_URL
  const customData = place.custom_data && typeof place.custom_data === 'object' ? place.custom_data : {}
  const customEntries = Object.entries(customData).filter(([, v]) => v !== null && v !== '' && v !== undefined)

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="detail-card">
        <div className="detail-header">
          <span className="detail-icon">{place.category_icon}</span>
          <div>
            <h1>{place.name}</h1>
            <span className="detail-category"
              style={{ color: place.category_color }}>
              {place.category_name}
            </span>
          </div>
        </div>

        <div className="detail-minimap">
          <MapContainer
            center={[place.lat, place.lng]}
            zoom={16}
            style={{ height: '200px', width: '100%', borderRadius: '8px' }}
            zoomControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer {...TILE_LAYERS.osm} />
            <Marker position={[place.lat, place.lng]} />
          </MapContainer>
        </div>

        <div className="detail-fields">
          {place.phone && (
            <div className="detail-field">
              <span>Phone</span><span>{place.phone}</span>
            </div>
          )}
          {place.opening_hours && (
            <div className="detail-field">
              <span>Hours</span><span>{place.opening_hours}</span>
            </div>
          )}
          {place.address && (
            <div className="detail-field">
              <span>Address</span><span>{place.address}</span>
            </div>
          )}
          {place.floor_details && (
            <div className="detail-field">
              <span>Floor</span><span>{place.floor_details}</span>
            </div>
          )}
          {place.custom_notes && (
            <div className="detail-notes">{place.custom_notes}</div>
          )}
        </div>

        {/* Custom data fields */}
        {customEntries.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.8rem', marginTop: '.5rem' }}>
            {customEntries.map(([key, value]) => (
              <div key={key} className="detail-field">
                <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {place.photos?.length > 0 && (
          <div className="detail-photos">
            {place.photos.map(photo => (
              <img
                key={photo.id}
                src={`${API_URL}/uploads/${photo.filename}`}
                alt={photo.caption || place.name}
                className="detail-photo"
              />
            ))}
          </div>
        )}

        <div className="detail-meta">
          Source: {place.source === 'manual' ? 'Verified field data' : 'OpenStreetMap'}
        </div>

        {/* Flag button */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '.8rem' }}>
          {flagSent ? (
            <div style={{ color: 'var(--neon-green)', fontSize: '.8rem' }}>Flag submitted. Thank you!</div>
          ) : flagging ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <select value={flagType} onChange={e => setFlagType(e.target.value)}
                style={{ padding: '.4rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '2px' }}>
                <option value="">Select issue type</option>
                <option value="incorrect_location">Incorrect Location</option>
                <option value="closed">Permanently Closed</option>
                <option value="duplicate">Duplicate Entry</option>
                <option value="incomplete">Incomplete Data</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Notes (optional)" value={flagNotes}
                onChange={e => setFlagNotes(e.target.value)}
                style={{ padding: '.4rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '2px' }} />
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn-danger" onClick={handleFlag} disabled={!flagType}>Submit Flag</button>
                <button className="tile-btn" onClick={() => setFlagging(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="tile-btn" onClick={() => setFlagging(true)} style={{ fontSize: '.75rem' }}>
              Report Issue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
