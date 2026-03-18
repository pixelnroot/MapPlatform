import React, { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'

const iconCache = new Map()

function getColorIcon(color) {
  if (iconCache.has(color)) return iconCache.get(color)
  const icon = L.divIcon({
    className: '',
    html: `
      <div style="
        width:28px; height:28px;
        background:${color};
        border:2px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
  iconCache.set(color, icon)
  return icon
}

const API_URL = import.meta.env.VITE_API_URL || ''

function PlaceMarker({ place }) {
  const navigate = useNavigate()
  const icon = useMemo(() => getColorIcon(place.category_color || '#94A3B8'), [place.category_color])

  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={icon}
    >
      <Popup>
        <div className="place-popup">
          {place.photo && (
            <img
              src={`${API_URL}/uploads/${place.photo}`}
              alt={place.name}
              className="place-popup-photo"
            />
          )}
          <div className="place-popup-category">
            {place.category_icon} {place.category_name}
          </div>
          <div className="place-popup-name">{place.name}</div>
          {place.phone && (
            <div className="place-popup-phone">📞 {place.phone}</div>
          )}
          {place.opening_hours && (
            <div className="place-popup-hours">🕐 {place.opening_hours}</div>
          )}
          <button
            className="place-popup-btn"
            onClick={() => navigate(`/place/${place.id}`)}
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

export default React.memo(PlaceMarker, (prev, next) => prev.place.id === next.place.id)
