# docs/frontend.md — Frontend Map & Components

> Read this before writing any React component, any Leaflet code,
> or any frontend state management. Every component's responsibility,
> props, behavior, and Leaflet API usage is defined here.
> Do not use any map library other than Leaflet + react-leaflet.

---

## 1. App Entry Point (src/main.jsx)

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Leaflet CSS — must be imported before any Leaflet component renders
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import './index.css'

// Leaflet default icon fix — required in every Leaflet + Vite project
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## 2. Router Setup (src/App.jsx)

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MapPage          from './pages/MapPage'
import PlaceDetailPage  from './pages/PlaceDetailPage'
import LoginPage        from './pages/admin/LoginPage'
import DashboardPage    from './pages/admin/DashboardPage'
import PlacesListPage   from './pages/admin/PlacesListPage'
import AddPlacePage     from './pages/admin/AddPlacePage'
import EditPlacePage    from './pages/admin/EditPlacePage'
import AdminGuard       from './components/Admin/AdminGuard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"           element={<MapPage />} />
        <Route path="/place/:id"  element={<PlaceDetailPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminGuard />}>
          <Route index                  element={<DashboardPage />} />
          <Route path="places"          element={<PlacesListPage />} />
          <Route path="add"             element={<AddPlacePage />} />
          <Route path="places/:id/edit" element={<EditPlacePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 3. Global Config (src/config.js)

```js
export const MAP_CONFIG = {
  defaultCenter: [23.7749, 90.3994], // Dhaka City center [lat, lng]
  defaultZoom: 13,
  minZoom: 5,
  maxZoom: 19,
}

export const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
}

// Zoom level at which place pins start appearing
// Below this zoom, only roads are shown (performance)
export const MIN_ZOOM_FOR_PLACES = 12
```

---

## 4. Global CSS (src/index.css)

```css
:root {
  --bg-primary:    #0f172a;
  --bg-secondary:  #1e293b;
  --bg-card:       #1e293b;
  --text-primary:  #f1f5f9;
  --text-secondary:#94a3b8;
  --accent:        #3b82f6;
  --accent-hover:  #2563eb;
  --border:        #334155;
  --danger:        #ef4444;
  --success:       #22c55e;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}

#root { height: 100vh; display: flex; flex-direction: column; }

/* Leaflet popup dark theme override */
.leaflet-popup-content-wrapper {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.leaflet-popup-tip { background: var(--bg-card); }
```

---

## 5. Component: MapView (src/components/Map/MapView.jsx)

**Responsibility:** The main map container. Owns all map state.
Loads places and roads when the viewport changes.

**Key behaviors:**
- On map `moveend` event → call `loadPlaces()` and `loadRoads()`
- Only load places if current zoom >= `MIN_ZOOM_FOR_PLACES`
- Show a message "Zoom in to see places" when zoom is too low
- Pass loaded places to `PlaceMarker` components
- Pass loaded roads to `RoadLayer` component

```jsx
import { useCallback, useState, useRef } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { MAP_CONFIG, TILE_LAYERS, MIN_ZOOM_FOR_PLACES } from '../../config'
import { getPlaces, getRoads } from '../../api'
import PlaceMarker from './PlaceMarker'
import RoadLayer from './RoadLayer'

// Inner component — must be inside MapContainer to use useMapEvents
function MapEventHandler({ onBoundsChange }) {
  useMapEvents({
    moveend: (e) => {
      const map    = e.target
      const bounds = map.getBounds()
      const zoom   = map.getZoom()
      const bbox   = [
        bounds.getSouth(), bounds.getWest(),
        bounds.getNorth(), bounds.getEast()
      ].join(',')
      onBoundsChange(bbox, zoom)
    }
  })
  return null
}

export default function MapView({ filters, tileLayer, onPlaceClick }) {
  const [places, setPlaces]   = useState([])
  const [roads,  setRoads]    = useState([])
  const [zoom,   setZoom]     = useState(MAP_CONFIG.defaultZoom)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async (bbox, currentZoom) => {
    setZoom(currentZoom)
    setLoading(true)
    try {
      // Always load roads
      const roadsRes = await getRoads(bbox)
      setRoads(roadsRes.data.data || [])

      // Only load places if zoomed in enough
      if (currentZoom >= MIN_ZOOM_FOR_PLACES) {
        const placesRes = await getPlaces(bbox, {
          category_id: filters.categoryId || undefined,
        })
        setPlaces(placesRes.data.data || [])
      } else {
        setPlaces([])
      }
    } catch (e) {
      console.error('Failed to load map data', e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {loading && (
        <div className="map-loading-indicator">Loading...</div>
      )}
      {zoom < MIN_ZOOM_FOR_PLACES && (
        <div className="map-zoom-hint">Zoom in to see places</div>
      )}

      <MapContainer
        center={MAP_CONFIG.defaultCenter}
        zoom={MAP_CONFIG.defaultZoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={TILE_LAYERS[tileLayer].url}
          attribution={TILE_LAYERS[tileLayer].attribution}
        />

        <MapEventHandler onBoundsChange={loadData} />

        <RoadLayer roads={roads} />

        {places.map(place => (
          <PlaceMarker
            key={place.id}
            place={place}
            onClick={onPlaceClick}
          />
        ))}
      </MapContainer>
    </div>
  )
}
```

---

## 6. Component: PlaceMarker (src/components/Map/PlaceMarker.jsx)

**Responsibility:** Render a single colored pin on the map.
Show a popup with basic info and a link to full detail page.

```jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'

// Create a colored circle icon using SVG
function createColorIcon(color) {
  return L.divIcon({
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
}

export default function PlaceMarker({ place, onClick }) {
  const navigate = useNavigate()
  const icon = createColorIcon(place.category_color || '#94A3B8')

  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={icon}
    >
      <Popup>
        <div className="place-popup">
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
            View Details →
          </button>
        </div>
      </Popup>
    </Marker>
  )
}
```

---

## 7. Component: RoadLayer (src/components/Map/RoadLayer.jsx)

**Responsibility:** Draw road lines on the map from GeoJSON data.

```jsx
import { GeoJSON } from 'react-leaflet'
import { useMemo } from 'react'

// Road type → color mapping
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
  // Convert roads array to GeoJSON FeatureCollection
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
      key={JSON.stringify(roads.map(r => r.id))}
      data={geojson}
      style={styleRoad}
    />
  )
}
```

**Note:** The `key` prop forces GeoJSON to re-render when roads change.
Without this, react-leaflet's GeoJSON component does not update on data change.

---

## 8. Component: SearchBar (src/components/Search/SearchBar.jsx)

**Responsibility:** Search input at top of map. Shows dropdown results.
On result click, flies the map to that location.

```jsx
import { useState, useRef, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { searchPlaces } from '../../api'

export default function SearchBar() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const map = useMap() // must be rendered inside MapContainer
  const timer = useRef(null)

  // Debounced search — wait 400ms after typing stops
  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(query)
        setResults(res.data.data || [])
        setOpen(true)
      } catch (e) {
        console.error('Search failed', e)
      }
    }, 400)
    return () => clearTimeout(timer.current)
  }, [query])

  function selectResult(place) {
    map.flyTo([place.lat, place.lng], 17, { duration: 1.2 })
    setQuery(place.name)
    setOpen(false)
  }

  return (
    <div className="search-bar-wrapper">
      <input
        type="text"
        className="search-input"
        placeholder="Search places..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="search-dropdown">
          {results.map(place => (
            <li key={place.id} onClick={() => selectResult(place)}>
              <span className="search-result-icon">
                {place.category_icon}
              </span>
              <span className="search-result-name">{place.name}</span>
              <span className="search-result-region">
                {place.region_name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 9. Component: CategoryFilter (src/components/Sidebar/CategoryFilter.jsx)

**Responsibility:** List of category checkboxes. Calls parent's
`onFilterChange` when selection changes.

```jsx
import { useState, useEffect } from 'react'
import { getRegions } from '../../api'

// Categories are hardcoded from seed data for MVP
// (avoids an extra API call for categories endpoint)
const DEFAULT_CATEGORIES = [
  { id: null, name: 'All',        icon: '🗺️',  color: '#3b82f6' },
  { id: 'shop',       name: 'Shop',       icon: '🛍️',  color: '#F59E0B' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️',  color: '#EF4444' },
  { id: 'hospital',   name: 'Hospital',   icon: '🏥',  color: '#3B82F6' },
  { id: 'school',     name: 'School',     icon: '🏫',  color: '#8B5CF6' },
  { id: 'mosque',     name: 'Mosque',     icon: '🕌',  color: '#10B981' },
  { id: 'bank',       name: 'Bank',       icon: '🏦',  color: '#6366F1' },
  { id: 'landmark',   name: 'Landmark',   icon: '📍',  color: '#EC4899' },
  { id: 'pharmacy',   name: 'Pharmacy',   icon: '💊',  color: '#14B8A6' },
  { id: 'park',       name: 'Park',       icon: '🌳',  color: '#22C55E' },
]

export default function CategoryFilter({ onFilterChange }) {
  const [selected, setSelected] = useState(null) // null = All

  function handleClick(categoryName) {
    const newVal = selected === categoryName ? null : categoryName
    setSelected(newVal)
    onFilterChange({ categoryName: newVal })
  }

  return (
    <div className="category-filter">
      {DEFAULT_CATEGORIES.map(cat => (
        <button
          key={cat.name}
          className={`cat-btn ${selected === cat.name ? 'active' : ''}`}
          style={{ '--cat-color': cat.color }}
          onClick={() => handleClick(cat.id ? cat.name : null)}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )
}
```

---

## 10. Page: MapPage (src/pages/MapPage.jsx)

**Responsibility:** The full public map page. Owns top-level layout.
Composes MapView + SearchBar + CategoryFilter + tile toggle.

```jsx
import { useState } from 'react'
import { MapContainer } from 'react-leaflet'
import MapView from '../components/Map/MapView'
import SearchBar from '../components/Search/SearchBar'
import CategoryFilter from '../components/Sidebar/CategoryFilter'

export default function MapPage() {
  const [filters,   setFilters]   = useState({})
  const [tileLayer, setTileLayer] = useState('osm') // 'osm' | 'satellite'

  return (
    <div className="map-page">
      {/* Top bar */}
      <div className="map-topbar">
        <div className="map-logo">🗺️ MapPlatform</div>
        <SearchBar />
        <div className="map-controls">
          <button
            className={`tile-btn ${tileLayer === 'osm' ? 'active' : ''}`}
            onClick={() => setTileLayer('osm')}
          >Map</button>
          <button
            className={`tile-btn ${tileLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => setTileLayer('satellite')}
          >Satellite</button>
          <a href="/admin" className="admin-link">Admin</a>
        </div>
      </div>

      {/* Main content */}
      <div className="map-body">
        {/* Left sidebar */}
        <div className="map-sidebar">
          <CategoryFilter onFilterChange={setFilters} />
        </div>

        {/* Map fills remaining space */}
        <MapView
          filters={filters}
          tileLayer={tileLayer}
        />
      </div>
    </div>
  )
}
```

**Note:** `SearchBar` uses `useMap()` hook internally so it must be
rendered inside a `MapContainer`. The `MapView` component wraps
`MapContainer`, so `SearchBar` must be rendered inside `MapView`,
not in `MapPage`. Move `SearchBar` inside `MapView` as a child of
`MapContainer` if `useMap()` throws an error.

---

## 11. Page: PlaceDetailPage (src/pages/PlaceDetailPage.jsx)

**Responsibility:** Show all details for a single place.
Fetches by ID from URL param. Shows mini map, photos, all fields.

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { getPlace } from '../api'
import { TILE_LAYERS } from '../config'

export default function PlaceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlace(id)
      .then(res => setPlace(res.data.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading">Loading...</div>
  if (!place)  return null

  const API_URL = import.meta.env.VITE_API_URL

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="detail-card">
        <div className="detail-header">
          <span className="detail-icon">{place.category_icon}</span>
          <div>
            <h1>{place.name}</h1>
            <span className="detail-category"
              style={{ color: place.category_color }}>
              {place.category_name}
            </span>
          </div>
        </div>

        {/* Mini map */}
        <div className="detail-minimap">
          <MapContainer
            center={[place.lat, place.lng]}
            zoom={16}
            style={{ height: '200px', width: '100%', borderRadius: '8px' }}
            zoomControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer {...TILE_LAYERS.osm} />
            <Marker position={[place.lat, place.lng]} />
          </MapContainer>
        </div>

        {/* Info fields */}
        <div className="detail-fields">
          {place.phone && (
            <div className="detail-field">
              <span>📞</span><span>{place.phone}</span>
            </div>
          )}
          {place.opening_hours && (
            <div className="detail-field">
              <span>🕐</span><span>{place.opening_hours}</span>
            </div>
          )}
          {place.address && (
            <div className="detail-field">
              <span>📍</span><span>{place.address}</span>
            </div>
          )}
          {place.floor_details && (
            <div className="detail-field">
              <span>🏢</span><span>{place.floor_details}</span>
            </div>
          )}
          {place.custom_notes && (
            <div className="detail-notes">{place.custom_notes}</div>
          )}
        </div>

        {/* Photos */}
        {place.photos?.length > 0 && (
          <div className="detail-photos">
            {place.photos.map(photo => (
              <img
                key={photo.id}
                src={`${API_URL}/uploads/${photo.filename}`}
                alt={photo.caption || place.name}
                className="detail-photo"
              />
            ))}
          </div>
        )}

        <div className="detail-meta">
          Source: {place.source === 'manual' ? '✅ Verified field data'
                                             : '🗺️ OpenStreetMap'}
        </div>
      </div>
    </div>
  )
}
```

---

## 12. Layout Rules

- Map always fills full viewport height minus topbar height
- Sidebar is fixed width 220px on desktop, hidden on mobile
- On mobile (< 768px): sidebar becomes a horizontal scroll row at bottom
- TopBar height: 56px fixed
- All overlays (search dropdown, loading indicator) use `position: absolute`
  with `z-index` above the map (Leaflet uses z-index ~400-600, use 1000+)

---

## 13. State Management Rules

- No Redux, no Zustand, no Context API for MVP
- `MapPage` owns: `filters`, `tileLayer`
- `MapView` owns: `places`, `roads`, `zoom`, `loading`
- `SearchBar` owns: `query`, `results`, `open`
- `CategoryFilter` owns: `selected`
- Admin pages each own their own local state
- Pass data down via props, events up via callback props
