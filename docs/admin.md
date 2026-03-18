# docs/admin.md — Admin Panel

> Read this before writing any admin page, admin form, or auth logic.
> Every admin page, its responsibilities, form fields, validation rules,
> and submission flow is defined here.

---

## 1. Auth Model

Admin auth is a single password stored in `localStorage`.

- Password = value of `VITE_ADMIN_KEY` env variable (`admin123` for MVP)
- On login: compare input with `import.meta.env.VITE_ADMIN_KEY`
- On success: `localStorage.setItem('adminKey', password)`
- On logout: `localStorage.removeItem('adminKey')`
- Every admin API call sends header: `x-admin-key: <stored key>`
- This is already handled by `adminApi` in `src/api/index.js`

**Do not implement JWT, sessions, or any token refresh logic.**

---

## 2. AdminGuard (src/components/Admin/AdminGuard.jsx)

Protects all `/admin/*` routes. Redirects to login if not authenticated.

```jsx
import { Navigate, Outlet } from 'react-router-dom'

export default function AdminGuard() {
  const key = localStorage.getItem('adminKey')
  if (!key) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
```

---

## 3. Admin Layout

All admin pages share a common layout:
- Fixed top navbar: logo, nav links (Dashboard, Places), logout button
- Content area below navbar with padding
- No map visible in admin pages (except PinPicker inside forms)

```jsx
// src/components/Admin/AdminLayout.jsx
import { useNavigate, NavLink } from 'react-router-dom'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('adminKey')
    navigate('/admin/login')
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <span className="admin-nav-logo">🗺️ Admin</span>
        <NavLink to="/admin"         end>Dashboard</NavLink>
        <NavLink to="/admin/places"     >Places</NavLink>
        <NavLink to="/admin/add"        >+ Add Place</NavLink>
        <button onClick={logout}>Logout</button>
      </nav>
      <main className="admin-content">{children}</main>
    </div>
  )
}
```

---

## 4. Page: LoginPage (src/pages/admin/LoginPage.jsx)

Simple single-password login form.

**Fields:** Password (input type="password")

**On submit:**
1. Compare input value with `import.meta.env.VITE_ADMIN_KEY`
2. If match → `localStorage.setItem('adminKey', value)` → navigate to `/admin`
3. If no match → show error: "Invalid admin key"

**Do not call any API** — comparison is local only.

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [key,   setKey]   = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (key === import.meta.env.VITE_ADMIN_KEY) {
      localStorage.setItem('adminKey', key)
      navigate('/admin')
    } else {
      setError('Invalid admin key')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🗺️ Map Admin</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter admin key"
            value={key}
            onChange={e => setKey(e.target.value)}
            autoFocus
          />
          {error && <div className="error-msg">{error}</div>}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  )
}
```

---

## 5. Page: DashboardPage (src/pages/admin/DashboardPage.jsx)

Shows system stats and recently added places.

**On mount:** Call `GET /api/admin/stats`

**Displays:**
- Stat cards: Total Places, Manual Places, OSM Places, Total Roads
- Table of last 10 added places: Name, Category, Date Added, Edit button

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStats } from '../../api'
import AdminLayout from '../../components/Admin/AdminLayout'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getStats().then(res => setStats(res.data.data))
  }, [])

  if (!stats) return <AdminLayout><div>Loading...</div></AdminLayout>

  return (
    <AdminLayout>
      <h1>Dashboard</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total_places}</div>
          <div className="stat-label">Total Places</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.manual_places}</div>
          <div className="stat-label">Manual (Field)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.osm_places}</div>
          <div className="stat-label">From OSM</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_roads}</div>
          <div className="stat-label">Roads</div>
        </div>
      </div>

      <h2>Recently Added</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Added</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {stats.recent_places.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category_name}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
              <td>
                <button onClick={() => navigate(`/admin/places/${p.id}/edit`)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  )
}
```

---

## 6. Page: PlacesListPage (src/pages/admin/PlacesListPage.jsx)

Table of all places with search, filter by source, edit and delete.

**On mount:** Fetch places for current map view (or a default bbox for admin)
For admin list, use a wide bbox covering the full mapped area:
`bbox=20.59,88.01,26.63,92.67` (Bangladesh bounds from seed data)

**Features:**
- Search input: filters table by name (client-side ILIKE on fetched data)
- Source filter: buttons for All / Manual / OSM
- Edit button → navigate to `/admin/places/:id/edit`
- Delete button → confirm dialog → call `DELETE /api/places/:id` → refresh list

**Table columns:** Name, Category, Source (badge), Region, Added Date, Actions

**Delete confirmation:** Use `window.confirm('Delete this place?')` for MVP.
Do not build a custom modal.

---

## 7. Component: PlaceForm (src/components/Admin/PlaceForm.jsx)

**Responsibility:** Shared form used by both AddPlacePage and EditPlacePage.
Receives `initialData` prop (empty object for add, existing place for edit).
Calls `onSubmit(formData, photos)` when submitted.

### Form Fields

| Field | Input Type | Required | Notes |
|---|---|---|---|
| Name | text | Yes | |
| Bengali Name | text | No | name_bn |
| Category | select | No | Fetched from GET /api/regions (categories) |
| Region | select | Yes | Fetched from GET /api/regions |
| Latitude | number | Yes | Auto-filled by PinPicker |
| Longitude | number | Yes | Auto-filled by PinPicker |
| Phone | text | No | |
| Opening Hours | text | No | e.g. "9am - 10pm, closed Friday" |
| Address | text | No | |
| Floor Details | text | No | e.g. "Ground floor, Shop #12" |
| Custom Notes | textarea | No | |
| Website | url | No | |
| Photos | file (multiple) | No | jpeg, png, webp only |

### PinPicker Integration

The form includes a `PinPicker` map below the lat/lng fields.
PinPicker lets the admin click the map to set coordinates.
When PinPicker fires `onPick(lat, lng)`, update lat and lng fields.
If `initialData` has lat/lng, show a marker at that location on load.

### Validation Before Submit

- `name` empty → show "Name is required" inline error
- `region_id` empty → show "Region is required"
- `lat` empty or not a number → show "Valid latitude required"
- `lng` empty or not a number → show "Valid longitude required"
- `lat` out of range -90..90 → show "Latitude must be between -90 and 90"
- `lng` out of range -180..180 → show "Longitude must be between -180 and 180"

### Submit Flow

```
1. Validate fields — stop if errors
2. Build JSON body with all text fields
3. Call onSubmit(body, selectedFiles)
   (parent page handles the actual API call)
4. Show loading state on submit button: "Saving..."
5. On success: parent navigates away
6. On error: show error message below form
```

---

## 8. Component: PinPicker (src/components/Admin/PinPicker.jsx)

**Responsibility:** A small interactive map the admin uses to click
and drop a pin to set the lat/lng for a new or edited place.

**Props:**
- `initialLat` — existing lat (for edit page)
- `initialLng` — existing lng (for edit page)
- `onPick(lat, lng)` — called when admin clicks the map

**Behavior:**
- Shows a 350px tall Leaflet map
- On map click → place a marker at that location → call `onPick(lat, lng)`
- If `initialLat` and `initialLng` are provided → show marker there on load
- Marker is draggable → on drag end → call `onPick(newLat, newLng)`
- Display current coordinates below the map: "📍 23.7749, 90.3994"

```jsx
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { MAP_CONFIG, TILE_LAYERS } from '../../config'

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function PinPicker({ initialLat, initialLng, onPick }) {
  const [position, setPosition] = useState(
    initialLat && initialLng
      ? [initialLat, initialLng]
      : null
  )

  function handlePick(lat, lng) {
    setPosition([lat, lng])
    onPick(lat, lng)
  }

  return (
    <div className="pin-picker">
      <p className="pin-picker-hint">
        Click on the map to set the location
      </p>
      <MapContainer
        center={position || MAP_CONFIG.defaultCenter}
        zoom={position ? 16 : MAP_CONFIG.defaultZoom}
        style={{ height: '350px', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer {...TILE_LAYERS.osm} />
        <ClickHandler onPick={handlePick} />
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
          📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      )}
    </div>
  )
}
```

---

## 9. Page: AddPlacePage (src/pages/admin/AddPlacePage.jsx)

**On submit flow:**
```
1. PlaceForm calls onSubmit(formData, files)
2. Call POST /api/places with formData → get back { data: { id } }
3. If files selected → call POST /api/places/:id/photos with FormData
4. On success → navigate to /admin/places
5. On error → show error message
```

```jsx
import { useNavigate } from 'react-router-dom'
import { createPlace, uploadPhoto } from '../../api'
import PlaceForm from '../../components/Admin/PlaceForm'
import AdminLayout from '../../components/Admin/AdminLayout'

export default function AddPlacePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function handleSubmit(formData, files) {
    try {
      const res = await createPlace(formData)
      const placeId = res.data.data.id

      if (files && files.length > 0) {
        const fd = new FormData()
        Array.from(files).forEach(f => fd.append('photos', f))
        await uploadPhoto(placeId, fd)
      }

      navigate('/admin/places')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save place')
    }
  }

  return (
    <AdminLayout>
      <h1>Add New Place</h1>
      {error && <div className="error-msg">{error}</div>}
      <PlaceForm initialData={{}} onSubmit={handleSubmit} />
    </AdminLayout>
  )
}
```

---

## 10. Page: EditPlacePage (src/pages/admin/EditPlacePage.jsx)

**On mount:** Fetch existing place data by ID from URL param.
Pre-fill PlaceForm with existing data.

**On submit flow:**
```
1. PlaceForm calls onSubmit(formData, files)
2. Call PUT /api/places/:id with formData
3. If new files selected → call POST /api/places/:id/photos
4. On success → navigate to /admin/places
5. On error → show error message
```

Also shows existing photos with a delete button per photo.
Photo delete: Remove from DB (add `DELETE /api/photos/:id` endpoint if needed)
or simply leave photo deletion for post-MVP.

---

## 11. Admin API Functions (additions to src/api/index.js)

```js
// Add these to the existing api/index.js

export const getStats = () =>
  adminApi.get('/api/admin/stats')

export const getAdminPlaces = (params) =>
  adminApi.get('/api/places', { params })

export const getCategories = () =>
  api.get('/api/categories')
```

Add a categories endpoint to the backend:
```
GET /api/categories → returns all categories (no auth needed)
```

---

## 12. Admin CSS Classes (add to index.css)

```css
/* Admin layout */
.admin-layout { display: flex; flex-direction: column; height: 100vh; }
.admin-nav {
  display: flex; align-items: center; gap: 1rem;
  padding: 0 1.5rem; height: 56px;
  background: var(--bg-secondary); border-bottom: 1px solid var(--border);
}
.admin-nav a { color: var(--text-secondary); text-decoration: none; }
.admin-nav a.active { color: var(--accent); }
.admin-content { padding: 2rem; overflow-y: auto; flex: 1; }

/* Forms */
.form-group { margin-bottom: 1rem; }
.form-group label {
  display: block; margin-bottom: .4rem;
  font-size: .85rem; color: var(--text-secondary);
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%; padding: .6rem .8rem;
  background: var(--bg-secondary); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: 6px;
  font-size: .95rem;
}
.form-group textarea { resize: vertical; min-height: 80px; }

/* Buttons */
.btn-primary {
  padding: .6rem 1.4rem; border-radius: 6px; border: none;
  background: var(--accent); color: white; cursor: pointer; font-size: .95rem;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-danger {
  padding: .4rem .8rem; border-radius: 6px; border: none;
  background: var(--danger); color: white; cursor: pointer;
}

/* Tables */
.admin-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.admin-table th, .admin-table td {
  text-align: left; padding: .7rem 1rem;
  border-bottom: 1px solid var(--border); font-size: .9rem;
}
.admin-table th { color: var(--text-secondary); font-weight: 500; }

/* Stat cards */
.stat-cards { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0; }
.stat-card {
  background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: 8px; padding: 1.2rem 1.5rem; min-width: 140px;
}
.stat-value { font-size: 2rem; font-weight: 700; color: var(--accent); }
.stat-label { font-size: .8rem; color: var(--text-secondary); margin-top: .2rem; }

/* Error */
.error-msg {
  background: rgba(239,68,68,.15); color: var(--danger);
  border: 1px solid var(--danger); border-radius: 6px;
  padding: .6rem 1rem; margin-bottom: 1rem; font-size: .9rem;
}

/* Pin picker */
.pin-picker { margin: 1rem 0; }
.pin-picker-hint { font-size: .85rem; color: var(--text-secondary); margin-bottom: .5rem; }
.pin-coords { margin-top: .5rem; font-size: .85rem; color: var(--text-secondary); }
```
