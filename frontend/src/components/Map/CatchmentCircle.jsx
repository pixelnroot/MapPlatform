import { Circle, Popup } from 'react-leaflet'
import { useState, useEffect } from 'react'
import { getCatchment } from '../../api'

export default function CatchmentCircle({ lat, lng, radius, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCatchment(lat, lng, radius)
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lat, lng, radius])

  return (
    <Circle
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        color: '#00f0ff',
        fillColor: '#00f0ff',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '5, 5',
      }}
    >
      <Popup>
        <div style={{ minWidth: '150px' }}>
          <div style={{ fontWeight: 600, marginBottom: '.3rem' }}>
            Catchment ({radius}m)
          </div>
          {loading && <div>Loading...</div>}
          {data && (
            <>
              <div style={{ fontSize: '.8rem', marginBottom: '.3rem' }}>
                Total: {data.total} places
              </div>
              {data.breakdown.map(b => (
                <div key={b.name} style={{ fontSize: '.75rem', display: 'flex', gap: '.3rem', alignItems: 'center' }}>
                  <span style={{ color: b.color }}>{b.icon}</span>
                  <span>{b.name}: {b.count}</span>
                </div>
              ))}
            </>
          )}
          <button onClick={onClose} style={{
            marginTop: '.5rem', fontSize: '.7rem', color: 'var(--neon-pink)',
            background: 'none', border: 'none', cursor: 'pointer'
          }}>Remove</button>
        </div>
      </Popup>
    </Circle>
  )
}
