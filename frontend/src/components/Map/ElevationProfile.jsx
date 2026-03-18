import { useState } from 'react'
import { useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { getElevationProfile } from '../../api'

export default function ElevationProfile({ active, onClose }) {
  const [points, setPoints] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState([])

  useMapEvents({
    click(e) {
      if (!active) return
      const newPoints = [...points, { lat: e.latlng.lat, lng: e.latlng.lng }]
      setPoints(newPoints)

      if (newPoints.length >= 2) {
        setLoading(true)
        getElevationProfile(newPoints)
          .then(res => setProfile(res.data.data))
          .catch(() => {})
          .finally(() => setLoading(false))
      }
    }
  })

  if (!active) return null

  const maxElev = profile ? Math.max(...profile.map(p => p.elevation)) : 0
  const minElev = profile ? Math.min(...profile.map(p => p.elevation)) : 0
  const range = maxElev - minElev || 1

  return (
    <div style={{
      position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, background: 'var(--bg-card)', border: '1px solid var(--accent)',
      borderRadius: '4px', padding: '1rem', minWidth: '400px',
      boxShadow: 'var(--glow-cyan), 0 4px 24px rgba(0,0,0,.6)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
        <span style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--accent)' }}>
          Elevation Profile {loading && '(loading...)'}
        </span>
        <button onClick={() => { setPoints([]); setProfile(null); onClose() }}
          style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer' }}>
          Close
        </button>
      </div>
      <p style={{ fontSize: '.7rem', color: 'var(--text-secondary)', marginBottom: '.5rem' }}>
        Click {points.length < 2 ? `${2 - points.length} more point(s)` : 'more points'} on the map
      </p>

      {profile && profile.length >= 2 && (
        <svg width="370" height="100" style={{ display: 'block' }}>
          {profile.map((p, i) => {
            if (i === 0) return null
            const x1 = ((i - 1) / (profile.length - 1)) * 370
            const x2 = (i / (profile.length - 1)) * 370
            const y1 = 90 - ((profile[i - 1].elevation - minElev) / range) * 80
            const y2 = 90 - ((p.elevation - minElev) / range) * 80
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00f0ff" strokeWidth="2" />
          })}
          {profile.map((p, i) => {
            const x = (i / (profile.length - 1)) * 370
            const y = 90 - ((p.elevation - minElev) / range) * 80
            return <circle key={i} cx={x} cy={y} r="3" fill="#00f0ff" />
          })}
          <text x="5" y="12" fill="var(--text-secondary)" fontSize="9">{maxElev.toFixed(0)}m</text>
          <text x="5" y="95" fill="var(--text-secondary)" fontSize="9">{minElev.toFixed(0)}m</text>
        </svg>
      )}
    </div>
  )
}
