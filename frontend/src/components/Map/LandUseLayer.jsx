import { useEffect, useState, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getLandUse } from '../../api'

const LAND_USE_COLORS = {
  residential:  '#F59E0B33',
  commercial:   '#EF444433',
  industrial:   '#6366F133',
  farmland:     '#22C55E33',
  forest:       '#10B98133',
  grass:        '#22C55E22',
  meadow:       '#22C55E22',
  water:        '#3B82F633',
  wetland:      '#14B8A633',
  park:         '#22C55E44',
  cemetery:     '#64748B33',
  quarry:       '#94A3B833',
}

export default function LandUseLayer({ active, bbox }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!active || !bbox) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
      return
    }

    getLandUse(bbox).then(res => {
      if (layerRef.current) map.removeLayer(layerRef.current)

      const features = (res.data.data || []).map(lu => ({
        type: 'Feature',
        geometry: lu.geojson,
        properties: { type: lu.type, name: lu.name }
      }))

      const layer = L.geoJSON({ type: 'FeatureCollection', features }, {
        style: (feature) => ({
          fillColor: LAND_USE_COLORS[feature.properties.type] || '#94A3B822',
          fillOpacity: 0.6,
          color: LAND_USE_COLORS[feature.properties.type]?.replace('33', '') || '#94A3B8',
          weight: 1,
          opacity: 0.5,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(`${feature.properties.type}${feature.properties.name ? ': ' + feature.properties.name : ''}`, {
            sticky: true, className: 'land-use-tooltip'
          })
        }
      })

      layer.addTo(map)
      layerRef.current = layer
    }).catch(() => {})

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [active, bbox, map])

  return null
}
