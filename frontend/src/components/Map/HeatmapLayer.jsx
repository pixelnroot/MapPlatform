import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatmapLayer({ places }) {
  const map = useMap()
  const heatRef = useRef(null)
  const prevLenRef = useRef(0)

  useEffect(() => {
    if (!places.length) {
      if (heatRef.current) {
        map.removeLayer(heatRef.current)
        heatRef.current = null
        prevLenRef.current = 0
      }
      return
    }

    const points = places.map(p => [p.lat, p.lng, 0.5])

    // Reuse existing layer if same data length (likely same viewport)
    if (heatRef.current && prevLenRef.current === places.length) {
      heatRef.current.setLatLngs(points)
      return
    }

    // Remove old layer before creating new
    if (heatRef.current) {
      map.removeLayer(heatRef.current)
    }

    heatRef.current = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      minOpacity: 0.3,
      gradient: {
        0.2: '#00f0ff',
        0.4: '#00ff9d',
        0.6: '#F59E0B',
        0.8: '#EF4444',
        1.0: '#ff2d6f',
      }
    })
    heatRef.current.addTo(map)
    prevLenRef.current = places.length

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current)
        heatRef.current = null
        prevLenRef.current = 0
      }
    }
  }, [map, places])

  return null
}
