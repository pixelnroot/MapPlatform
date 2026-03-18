import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer } from 'react-leaflet'
import { useState, useCallback, useRef, useEffect } from 'react'
import { TILE_LAYERS, MAP_CONFIG, MIN_ZOOM_FOR_PLACES } from '../config'
import { getPlaces } from '../api'
import PlaceMarker from '../components/Map/PlaceMarker'

function MapLoader({ categoryFilter }) {
  return null
}

export default function EmbedPage() {
  const [params] = useSearchParams()
  const lat = parseFloat(params.get('lat')) || MAP_CONFIG.defaultCenter[0]
  const lng = parseFloat(params.get('lng')) || MAP_CONFIG.defaultCenter[1]
  const zoom = parseInt(params.get('zoom')) || MAP_CONFIG.defaultZoom
  const category = params.get('category') || ''
  const [places, setPlaces] = useState([])

  const loadPlaces = useCallback(async (bbox) => {
    const p = {}
    if (category) p.category_id = category
    try {
      const res = await getPlaces(bbox, p)
      setPlaces(res.data.data || [])
    } catch {}
  }, [category])

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer {...TILE_LAYERS.osm} />
        <EmbedEventHandler loadPlaces={loadPlaces} />
        {places.map(p => (
          <PlaceMarker key={p.id} place={p} />
        ))}
      </MapContainer>
    </div>
  )
}

function EmbedEventHandler({ loadPlaces }) {
  const { useMapEvents } = require('react-leaflet')
  const timerRef = useRef(null)

  useMapEvents({
    moveend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const map = e.target
        const bounds = map.getBounds()
        const zoom = map.getZoom()
        if (zoom < MIN_ZOOM_FOR_PLACES) return
        const bbox = [
          bounds.getSouth(), bounds.getWest(),
          bounds.getNorth(), bounds.getEast()
        ].join(',')
        loadPlaces(bbox)
      }, 350)
    }
  })

  return null
}
