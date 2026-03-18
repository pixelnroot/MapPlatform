import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { TILE_LAYERS } from '../../config'

export default function CompareView({ active }) {
  const map = useMap()
  const controlRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)

  useEffect(() => {
    if (!active) {
      if (controlRef.current) {
        map.removeControl(controlRef.current)
        controlRef.current = null
      }
      if (leftRef.current) { map.removeLayer(leftRef.current); leftRef.current = null }
      if (rightRef.current) { map.removeLayer(rightRef.current); rightRef.current = null }
      return
    }

    // Dynamic import of leaflet-side-by-side
    import('leaflet-side-by-side').then(() => {
      const osmLayer = L.tileLayer(TILE_LAYERS.osm.url, { attribution: TILE_LAYERS.osm.attribution })
      const satLayer = L.tileLayer(TILE_LAYERS.satellite.url, { attribution: TILE_LAYERS.satellite.attribution })

      osmLayer.addTo(map)
      satLayer.addTo(map)

      leftRef.current = osmLayer
      rightRef.current = satLayer

      controlRef.current = L.control.sideBySide(osmLayer, satLayer)
      controlRef.current.addTo(map)
    }).catch(() => {})

    return () => {
      if (controlRef.current) { map.removeControl(controlRef.current); controlRef.current = null }
      if (leftRef.current) { map.removeLayer(leftRef.current); leftRef.current = null }
      if (rightRef.current) { map.removeLayer(rightRef.current); rightRef.current = null }
    }
  }, [active, map])

  return null
}
