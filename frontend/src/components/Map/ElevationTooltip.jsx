import { useState } from 'react'
import { useMapEvents } from 'react-leaflet'
import { getElevation } from '../../api'

export default function ElevationTooltip({ active }) {
  const [elev, setElev] = useState(null)
  const [pos, setPos] = useState(null)

  useMapEvents({
    mousemove(e) {
      if (!active) return
      setPos(e.containerPoint)
    },
    click(e) {
      if (!active) return
      getElevation(e.latlng.lat, e.latlng.lng)
        .then(res => setElev(res.data.data.elevation))
        .catch(() => setElev(null))
    }
  })

  if (!active || elev === null) return null

  return (
    <div style={{
      position: 'absolute',
      top: pos ? pos.y - 30 : 0,
      left: pos ? pos.x + 10 : 0,
      zIndex: 1000,
      background: 'var(--bg-card)',
      border: '1px solid var(--accent)',
      borderRadius: '2px',
      padding: '.2rem .5rem',
      fontSize: '.75rem',
      color: 'var(--accent)',
      pointerEvents: 'none',
    }}>
      {elev.toFixed(1)}m
    </div>
  )
}
