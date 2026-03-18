import { GeoJSON } from 'react-leaflet'
import { useMemo } from 'react'

const ROAD_COLORS = {
  motorway:    '#e97c08',
  trunk:       '#e97c08',
  primary:     '#f5c842',
  secondary:   '#ffffff',
  tertiary:    '#cccccc',
  residential: '#aaaaaa',
  footway:     '#888888',
  cycleway:    '#4CAF50',
  path:        '#888888',
  default:     '#999999',
}

function styleRoad(feature) {
  const type   = feature.properties?.type || 'default'
  const color  = ROAD_COLORS[type] || ROAD_COLORS.default
  const weight = ['motorway','trunk','primary'].includes(type) ? 4
               : ['secondary','tertiary'].includes(type)       ? 2.5
               : 1.5
  return { color, weight, opacity: 0.8 }
}

export default function RoadLayer({ roads }) {
  const geojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: roads.map(road => ({
      type: 'Feature',
      properties: { id: road.id, name: road.name, type: road.type },
      geometry: road.geojson,
    }))
  }), [roads])

  if (!roads.length) return null

  return (
    <GeoJSON
      key={roads.map(r => r.id).join(',')}
      data={geojson}
      style={styleRoad}
    />
  )
}
