import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { MAP_CONFIG, TILE_LAYERS } from '../../config'

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function MapRecenter({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], Math.max(map.getZoom(), 15))
    }
  }, [lat, lng, map])
  return null
}

export default function PinPicker({ initialLat, initialLng, onPick }) {
  const [position, setPosition] = useState(
    initialLat && initialLng
      ? [initialLat, initialLng]
      : null
  )
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    if (initialLat != null && initialLng != null && !isNaN(initialLat) && !isNaN(initialLng)) {
      setPosition([initialLat, initialLng])
    }
  }, [initialLat, initialLng])

  function handlePick(lat, lng) {
    setPosition([lat, lng])
    onPick(lat, lng)
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePick(pos.coords.latitude, pos.coords.longitude)
        setGpsLoading(false)
      },
      () => {
        alert('Could not get your location')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="pin-picker">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <p className="pin-picker-hint">
          Click on the map to set the location
        </p>
        <button
          type="button"
          className="tile-btn"
          onClick={handleUseMyLocation}
          disabled={gpsLoading}
          style={{ fontSize: '.7rem' }}
        >
          {gpsLoading ? 'Getting GPS...' : 'Use My Location'}
        </button>
      </div>
      <MapContainer
        center={position || MAP_CONFIG.defaultCenter}
        zoom={position ? 16 : MAP_CONFIG.defaultZoom}
        style={{ height: '350px', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer {...TILE_LAYERS.osm} />
        <ClickHandler onPick={handlePick} />
        <MapRecenter lat={position?.[0]} lng={position?.[1]} />
        {position && (
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = e.target.getLatLng()
                handlePick(lat, lng)
              }
            }}
          />
        )}
      </MapContainer>
      {position && (
        <div className="pin-coords">
          {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      )}
    </div>
  )
}
