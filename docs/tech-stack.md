# docs/tech-stack.md — Technology Stack

> Read this before installing ANYTHING. Every package used in this
> project is listed here with the exact version, install command,
> and official documentation URL. Do not add any package not listed here.

---

## Backend Stack

### Runtime & Framework

| Technology | Version | Purpose | Docs |
|---|---|---|---|
| Node.js | 20 LTS | Runtime | https://nodejs.org/en/docs |
| Express | 4.18.x | HTTP server + routing | https://expressjs.com/en/4x/api.html |

**Install:**
```bash
cd backend
npm init -y
npm install express@4.18.3
```

---

### Database

| Technology | Version | Purpose | Docs |
|---|---|---|---|
| PostgreSQL | 15 | Primary database | https://www.postgresql.org/docs/15/ |
| PostGIS | 3.4 | Spatial/geometry extension | https://postgis.net/docs/manual-3.4/ |
| pg (node-postgres) | 8.11.x | PostgreSQL client for Node | https://node-postgres.com/ |

**Install pg:**
```bash
npm install pg@8.11.3
```

**Key PostGIS functions used in this project:**
- `ST_MakePoint(lng, lat)` — create a point from coordinates
- `ST_SetSRID(geom, 4326)` — set coordinate reference system to WGS84
- `ST_Within(geom, bbox)` — check if point is inside bounding box
- `ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326)` — create bbox polygon
- `ST_AsGeoJSON(geom)` — convert geometry to GeoJSON string
- `ST_GeomFromGeoJSON(json)` — parse GeoJSON into geometry

**PostGIS SRID:** Always use **4326** (WGS84 — standard lat/lng used by GPS and OSM)

---

### Middleware & Utilities

| Package | Version | Purpose | Docs |
|---|---|---|---|
| cors | 2.8.x | Allow frontend to call API | https://www.npmjs.com/package/cors |
| dotenv | 16.x | Load .env variables | https://www.npmjs.com/package/dotenv |
| multer | 1.4.x | Handle photo file uploads | https://www.npmjs.com/package/multer |
| uuid | 9.x | Generate UUID primary keys | https://www.npmjs.com/package/uuid |
| node-fetch | 3.x | HTTP requests in Node (OSM import) | https://www.npmjs.com/package/node-fetch |
| nodemon | 3.x | Auto-restart in development | https://www.npmjs.com/package/nodemon |

**Install all at once:**
```bash
npm install cors@2.8.5 dotenv@16.3.1 multer@1.4.5-lts.1 uuid@9.0.0 node-fetch@3.3.2
npm install --save-dev nodemon@3.0.1
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "import:osm": "node src/scripts/osmImport.js"
  }
}
```

---

### File Upload Configuration (Multer)

Photos are saved to `./uploads/` folder on the backend server.
Static files are served at `/uploads` route.
Frontend builds photo URLs as: `${VITE_API_URL}/uploads/${filename}`

Multer config to use:
```js
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOADS_DIR || './uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})
```

---

## OSM Data Source

### Overpass API

| Property | Value |
|---|---|
| Endpoint | `https://overpass-api.de/api/interpreter` |
| Method | POST |
| Content-Type | `application/x-www-form-urlencoded` |
| Body param | `data=<overpass query string>` |
| Docs | https://wiki.openstreetmap.org/wiki/Overpass_API |
| Query language ref | https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL |
| Interactive tester | https://overpass-turbo.eu/ |

**Query format used for this project (OverpassQL):**
```
[out:json][timeout:60];
(
  node["name"]({south},{west},{north},{east});
  way["highway"]({south},{west},{north},{east});
  way["building"]({south},{west},{north},{east});
  node["amenity"]({south},{west},{north},{east});
  node["shop"]({south},{west},{north},{east});
);
out body;
>;
out skel qt;
```

**Bounding box order for Overpass:** `south, west, north, east`
(This is different from our internal bbox format — convert carefully)

**Our internal bbox format:** `minLat, minLng, maxLat, maxLng`
(same as: south, west, north, east — so they match)

**OSM element types returned:**
- `node` — a single point (shop, amenity, landmark)
- `way` — a sequence of nodes forming a line or polygon (road, building)
- `relation` — a group of ways (complex areas — ignore for MVP)

**Key OSM tags to map to our categories:**
```
amenity=restaurant    → Restaurant
amenity=hospital      → Hospital
amenity=school        → School
amenity=place_of_worship + religion=muslim → Mosque
amenity=bank          → Bank
amenity=hotel         → Hotel
amenity=pharmacy      → Pharmacy
amenity=parking       → Parking
leisure=park          → Park
shop=*                → Shop
tourism=*             → Landmark
highway=*             → (goes into roads table, not places)
```

---

## Docker Setup

### docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB: mapdb
      POSTGRES_USER: mapuser
      POSTGRES_PASSWORD: mappass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**Image:** `postgis/postgis:15-3.4`
Docker Hub: https://hub.docker.com/r/postgis/postgis
This image includes PostgreSQL 15 + PostGIS 3.4 pre-installed.
No need to install PostGIS separately — just run `CREATE EXTENSION IF NOT EXISTS postgis;` in schema.sql.

---

## Frontend Stack

### Core

| Technology | Version | Purpose | Docs |
|---|---|---|---|
| React | 18.x | UI framework | https://react.dev/ |
| Vite | 5.x | Build tool + dev server | https://vitejs.dev/guide/ |
| React Router DOM | 6.x | Client-side routing | https://reactrouter.com/en/main |
| Axios | 1.6.x | HTTP client for API calls | https://axios-http.com/docs/intro |

**Create project:**
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

**Install additional packages:**
```bash
npm install react-router-dom@6.20.0 axios@1.6.2
```

---

### Map

| Package | Version | Purpose | Docs |
|---|---|---|---|
| Leaflet | 1.9.x | Core map engine | https://leafletjs.com/reference.html |
| React-Leaflet | 4.2.x | React bindings for Leaflet | https://react-leaflet.js.org/docs/api-map/ |
| Leaflet.markercluster | 1.5.x | Cluster pins when zoomed out | https://github.com/Leaflet/Leaflet.markercluster |

**Install:**
```bash
npm install leaflet@1.9.4 react-leaflet@4.2.1
npm install leaflet.markercluster@1.5.3
```

**Critical Leaflet CSS — must import in main.jsx:**
```js
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
```

**Leaflet default icon fix — must add in main.jsx:**
```js
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
```

**Map tile layers to use:**
```js
// OSM Default (free, no API key needed)
// URL: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
// Attribution: © OpenStreetMap contributors

// Satellite (Esri, free, no API key needed)
// URL: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
// Attribution: Tiles © Esri
```

**Default map config (put in src/config.js):**
```js
export const MAP_CONFIG = {
  defaultCenter: [23.7749, 90.3994], // Dhaka
  defaultZoom: 13,
  minZoom: 5,
  maxZoom: 19,
}
```

---

### UI Styling

No UI component library. Plain CSS with CSS variables for theming.
Keep styles in component-level `.css` files or inline styles.
Do not install Tailwind, Bootstrap, MUI, or any CSS framework.

**Color palette (CSS variables in index.css):**
```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --border: #334155;
  --danger: #ef4444;
  --success: #22c55e;
}
```

---

## API Communication Pattern

All API calls go through `src/api/index.js`. Never call axios directly
from components. Always import from this file.

```js
// src/api/index.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_KEY }
})

// Public endpoints
export const getPlaces = (bbox, params) =>
  api.get('/api/places', { params: { bbox, ...params } })

export const getPlace = (id) =>
  api.get(`/api/places/${id}`)

export const getRoads = (bbox) =>
  api.get('/api/roads', { params: { bbox } })

export const getRegions = () =>
  api.get('/api/regions')

export const searchPlaces = (q, region_id) =>
  api.get('/api/search', { params: { q, region_id } })

// Admin endpoints
export const createPlace = (data) =>
  adminApi.post('/api/places', data)

export const updatePlace = (id, data) =>
  adminApi.put(`/api/places/${id}`, data)

export const deletePlace = (id) =>
  adminApi.delete(`/api/places/${id}`)

export const uploadPhoto = (placeId, formData) =>
  adminApi.post(`/api/places/${placeId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
```
