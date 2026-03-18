import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { MAP_CONFIG, TILE_LAYERS, MIN_ZOOM_FOR_PLACES } from '../../config'
import { getPlaces, getRoads, getClusters } from '../../api'
import PlaceMarker from './PlaceMarker'
import MarkerClusterGroup from './MarkerClusterGroup'
import RoadLayer from './RoadLayer'
import SearchBar from '../Search/SearchBar'
import HeatmapLayer from './HeatmapLayer'
import ElevationProfile from './ElevationProfile'
import LandUseLayer from './LandUseLayer'
import CompareView from './CompareView'
import ElevationTooltip from './ElevationTooltip'
import RegionOverlay from './RegionOverlay'
import CatchmentCircle from './CatchmentCircle'
import NearestPanel from '../Analysis/NearestPanel'

function TileLoadTracker({ onLoading, onLoad }) {
  const map = useMap()
  useEffect(() => {
    const handleStart = () => onLoading()
    const handleEnd = () => onLoad()
    map.on('loading', handleStart)
    map.on('load', handleEnd)
    return () => {
      map.off('loading', handleStart)
      map.off('load', handleEnd)
    }
  }, [map, onLoading, onLoad])
  return null
}

function MapEventHandler({ onBoundsChange }) {
  const timerRef = useRef(null)

  useMapEvents({
    moveend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const map    = e.target
        const bounds = map.getBounds()
        const zoom   = map.getZoom()
        const bbox   = [
          bounds.getSouth(), bounds.getWest(),
          bounds.getNorth(), bounds.getEast()
        ].join(',')
        onBoundsChange(bbox, zoom)
      }, 350)
    }
  })
  return null
}

function FilterWatcher({ filters, bboxRef, zoomRef, loadData }) {
  const map = useMap()
  const prevFilters = useRef(filters)

  useEffect(() => {
    if (prevFilters.current === filters) return
    prevFilters.current = filters

    if (bboxRef.current) {
      loadData(bboxRef.current, zoomRef.current)
    } else {
      const bounds = map.getBounds()
      const zoom   = map.getZoom()
      const bbox   = [
        bounds.getSouth(), bounds.getWest(),
        bounds.getNorth(), bounds.getEast()
      ].join(',')
      loadData(bbox, zoom)
    }
  }, [filters, bboxRef, zoomRef, loadData, map])

  return null
}

function ContextMenuHandler({ onContextMenu }) {
  useMapEvents({
    contextmenu: (e) => {
      e.originalEvent.preventDefault()
      onContextMenu(e.latlng)
    }
  })
  return null
}

export default function MapView({ filters, tileLayer, mapMode, onModeClose }) {
  const [places, setPlaces]     = useState([])
  const [roads, setRoads]       = useState([])
  const [clusters, setClusters] = useState([])
  const [zoom, setZoom]         = useState(MAP_CONFIG.defaultZoom)
  const [loading, setLoading]   = useState(false)
  const [tilesLoading, setTilesLoading] = useState(false)
  const [catchment, setCatchment] = useState(null)
  const [nearest, setNearest]   = useState(null)
  const bboxRef = useRef(null)
  const zoomRef = useRef(MAP_CONFIG.defaultZoom)

  const tileLayerProps = useMemo(() => ({
    osm: {
      url: TILE_LAYERS.osm.url,
      attribution: TILE_LAYERS.osm.attribution,
      keepBuffer: 6,
      updateWhenZooming: false,
      updateWhenIdle: true,
      maxZoom: MAP_CONFIG.maxZoom,
      maxNativeZoom: 19,
    },
    satellite: {
      url: TILE_LAYERS.satellite.url,
      attribution: TILE_LAYERS.satellite.attribution,
      keepBuffer: 6,
      updateWhenZooming: false,
      updateWhenIdle: true,
      maxZoom: MAP_CONFIG.maxZoom,
      maxNativeZoom: 18,
    }
  }), [])

  const useServerClusters = zoom < MIN_ZOOM_FOR_PLACES && zoom >= 8

  const loadData = useCallback(async (bbox, currentZoom) => {
    bboxRef.current = bbox
    zoomRef.current = currentZoom
    setZoom(currentZoom)
    setLoading(true)
    try {
      const roadsRes = await getRoads(bbox)
      setRoads(roadsRes.data.data || [])

      if (currentZoom >= MIN_ZOOM_FOR_PLACES) {
        const params = {}
        if (filters.categoryId) params.category_id = filters.categoryId
        const placesRes = await getPlaces(bbox, params)
        setPlaces(placesRes.data.data || [])
        setClusters([])
      } else if (currentZoom >= 8) {
        // Server-side clustering
        const params = {}
        if (filters.categoryId) params.category_id = filters.categoryId
        const clusterRes = await getClusters(bbox, currentZoom, params)
        setClusters(clusterRes.data.data || [])
        setPlaces([])
      } else {
        setPlaces([])
        setClusters([])
      }
    } catch (e) {
      console.error('Failed to load map data', e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  function handleContextMenu(latlng) {
    setNearest({ lat: latlng.lat, lng: latlng.lng })
    setCatchment({ lat: latlng.lat, lng: latlng.lng, radius: 1000 })
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {/* Skeleton loading overlay for tiles */}
      {tilesLoading && (
        <div className="map-skeleton-overlay">
          <div className="map-skeleton-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="map-skeleton-tile" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
          <div className="map-skeleton-label">
            <span className="map-skeleton-dot" />
            LOADING TILES
          </div>
        </div>
      )}
      {loading && (
        <div className="map-loading-indicator">
          <span className="map-skeleton-dot" />
          Loading data...
        </div>
      )}
      {zoom < MIN_ZOOM_FOR_PLACES && zoom < 8 && (
        <div className="map-zoom-hint">Zoom in to see places</div>
      )}

      <MapContainer
        center={MAP_CONFIG.defaultCenter}
        zoom={MAP_CONFIG.defaultZoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLoadTracker
          onLoading={useCallback(() => setTilesLoading(true), [])}
          onLoad={useCallback(() => setTilesLoading(false), [])}
        />

        {/* Both tile layers always mounted — opacity toggles, no black flash */}
        {mapMode !== 'compare' && (
          <>
            <TileLayer
              {...tileLayerProps.osm}
              opacity={tileLayer === 'osm' ? 1 : 0}
              zIndex={tileLayer === 'osm' ? 1 : 0}
            />
            <TileLayer
              {...tileLayerProps.satellite}
              opacity={tileLayer === 'satellite' ? 1 : 0}
              zIndex={tileLayer === 'satellite' ? 1 : 0}
            />
          </>
        )}

        <MapEventHandler onBoundsChange={loadData} />
        <FilterWatcher filters={filters} bboxRef={bboxRef} zoomRef={zoomRef} loadData={loadData} />
        <ContextMenuHandler onContextMenu={handleContextMenu} />
        <SearchBar />
        <RoadLayer roads={roads} />

        {/* Heatmap mode */}
        {mapMode === 'heatmap' && places.length > 0 && (
          <HeatmapLayer places={places} />
        )}

        {/* Normal markers (hidden in heatmap mode) */}
        {mapMode !== 'heatmap' && (
          <MarkerClusterGroup>
            {places.map(place => (
              <PlaceMarker key={place.id} place={place} />
            ))}
          </MarkerClusterGroup>
        )}

        {/* Server-side cluster bubbles */}
        {useServerClusters && clusters.map((c, i) => (
          <ClusterBubble key={i} lat={parseFloat(c.lat)} lng={parseFloat(c.lng)} count={parseInt(c.count)} />
        ))}

        {/* Elevation profile mode */}
        <ElevationProfile
          active={mapMode === 'elevation'}
          onClose={onModeClose}
        />
        <ElevationTooltip active={mapMode === 'elevation'} />

        {/* Land use overlay */}
        <LandUseLayer active={mapMode === 'landuse'} bbox={bboxRef.current} />

        {/* Compare view (side-by-side) */}
        <CompareView active={mapMode === 'compare'} />

        {/* Custom area boundaries */}
        <RegionOverlay />

        {/* Catchment circle */}
        {catchment && (
          <CatchmentCircle
            lat={catchment.lat}
            lng={catchment.lng}
            radius={catchment.radius}
            onClose={() => setCatchment(null)}
          />
        )}
      </MapContainer>

      {/* Nearest facilities panel */}
      {nearest && (
        <NearestPanel
          lat={nearest.lat}
          lng={nearest.lng}
          onClose={() => { setNearest(null); setCatchment(null) }}
          onFlyTo={() => {}}
        />
      )}
    </div>
  )
}

function ClusterBubble({ lat, lng, count }) {
  const { CircleMarker, Tooltip } = require('react-leaflet')
  const radius = Math.min(40, Math.max(12, Math.sqrt(count) * 3))

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        color: '#00f0ff',
        fillColor: '#00f0ff',
        fillOpacity: 0.25,
        weight: 2,
      }}
    >
      <Tooltip permanent direction="center" className="cluster-tooltip">
        <span style={{ fontWeight: 700, fontSize: '.75rem' }}>{count}</span>
      </Tooltip>
    </CircleMarker>
  )
}
