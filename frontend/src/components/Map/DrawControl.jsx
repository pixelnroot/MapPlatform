import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'

export default function DrawControl({ onPolygonCreated }) {
  const map = useMap()
  const drawControlRef = useRef(null)
  const drawnItemsRef = useRef(null)

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    drawnItemsRef.current = drawnItems
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          shapeOptions: {
            color: '#00f0ff',
            fillColor: '#00f0ff',
            fillOpacity: 0.1,
          }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
      }
    })
    drawControlRef.current = drawControl
    map.addControl(drawControl)

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer
      drawnItems.addLayer(layer)
      const geojson = layer.toGeoJSON().geometry
      if (onPolygonCreated) onPolygonCreated(geojson)
    })

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map, onPolygonCreated])

  return null
}
