import { createPathComponent } from '@react-leaflet/core'
import L from 'leaflet'
import 'leaflet.markercluster'

const MarkerClusterGroup = createPathComponent(
  function createMarkerClusterGroup({ ...props }, ctx) {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      ...props,
    })
    return {
      instance: clusterGroup,
      context: { ...ctx, layerContainer: clusterGroup },
    }
  },
  function updateMarkerClusterGroup(instance, props, prevProps) {
    // No dynamic prop updates needed
  }
)

export default MarkerClusterGroup
