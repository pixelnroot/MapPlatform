import { useState, useEffect } from 'react'
import { getNearestPlaces } from '../../api'

export default function NearestPanel({ lat, lng, onClose, onFlyTo }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    const params = { radius: 5000, limit: 20 }
    if (categoryFilter) params.category_id = categoryFilter
    getNearestPlaces(lat, lng, params)
      .then(res => setPlaces(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lat, lng, categoryFilter])

  return (
    <div style={{
      position: 'absolute', top: '60px', right: '10px', zIndex: 1000,
      width: '280px', maxHeight: '60vh', overflow: 'auto',
      background: 'var(--bg-card)', border: '1px solid var(--accent)',
      borderRadius: '4px', padding: '1rem',
      boxShadow: 'var(--glow-cyan), 0 4px 24px rgba(0,0,0,.6)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
        <span style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--accent)' }}>
          Nearest Facilities
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '.75rem' }}>
          Close
        </button>
      </div>

      {loading && <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>Loading...</div>}

      {places.map(p => (
        <div key={p.id} style={{
          padding: '.5rem 0', borderBottom: '1px solid var(--border)',
          fontSize: '.8rem', cursor: 'pointer'
        }} onClick={() => onFlyTo && onFlyTo(p.lat, p.lng)}>
          <div style={{ display: 'flex', gap: '.3rem', alignItems: 'center' }}>
            <span>{p.category_icon}</span>
            <span style={{ flex: 1 }}>{p.name}</span>
            <span style={{ color: 'var(--accent)', fontSize: '.7rem' }}>{p.distance_m}m</span>
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)' }}>
            {p.category_name}
          </div>
        </div>
      ))}

      {!loading && places.length === 0 && (
        <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>No places found nearby</div>
      )}
    </div>
  )
}
