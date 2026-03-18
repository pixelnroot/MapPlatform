import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getRegions } from '../../api'

export default function RegionOverlay() {
  const map = useMap()
  const [layerGroup] = useState(() => L.layerGroup())

  useEffect(() => {
    layerGroup.addTo(map)

    getRegions().then(res => {
      const regions = res.data.data || []
      regions.forEach(r => {
        if (r.boundary_geojson) {
          const layer = L.geoJSON(r.boundary_geojson, {
            style: {
              color: '#00f0ff',
              weight: 2,
              fillColor: '#00f0ff',
              fillOpacity: 0.05,
              dashArray: '6 4',
            }
          })
          layer.bindTooltip(r.name, { sticky: true, className: 'region-tooltip' })
          layerGroup.addLayer(layer)
        }
      })
    }).catch(() => {})

    return () => { map.removeLayer(layerGroup) }
  }, [map, layerGroup])

  return null
}
