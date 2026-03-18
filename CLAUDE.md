# CLAUDE.md — Map Platform Project Brain

> **READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.**
> Then read the specific doc file for whatever part you are working on.
> Every decision, every library, every API call is already decided.
> Your job is to implement exactly what is described here and in the docs.

---

## 1. What This Project Is

A full-stack digital map platform. Users browse an interactive map of
real-world locations. Data comes from two sources:
- **OpenStreetMap (OSM)** — bulk imported via a script
- **Manual field data** — added by our team via an admin panel

Started with Bangladesh (Dhaka + Chattogram divisions) but the system
must scale to any city, country, or custom combination worldwide
(e.g. Dhaka + Los Angeles in the same system) without any schema change.

### Three Parts
1. **Public map website** — users browse, search, filter, view place details
2. **Admin panel** — our team adds/edits manual places with photos
3. **Backend API + OSM importer** — powers everything above

---

## 2. Before You Work On Anything — Read This First

| Working on | Read this doc first |
|---|---|
| Installing packages or setting up anything | `docs/tech-stack.md` |
| Database tables, queries, PostGIS | `docs/database.md` |
| API endpoints, request/response format | `docs/api.md` |
| OSM import script, Overpass API | `docs/osm.md` |
| Map UI, Leaflet, frontend components | `docs/frontend.md` |
| Admin panel forms and flows | `docs/admin.md` |

**Never install a package not listed in `docs/tech-stack.md`.**
**Never use an API pattern not described in `docs/api.md`.**
**Never write a spatial query without checking `docs/database.md`.**

---

## 3. Core Architecture Rules (Never Violate These)

### Rule 1 — Single Self-Referencing Regions Table
All geography (world, country, division, district, city, area) lives in
ONE table called `regions` with a `parent_id` pointing to itself.
Never create separate tables for country, city, division etc.
See exact schema → `docs/database.md`

### Rule 2 — Dual Coordinate Storage
Every place and road stores coordinates TWO ways:
- `lat FLOAT` + `lng FLOAT` — plain numbers for simple display
- `geometry` — PostGIS GEOMETRY column for all spatial operations

Never do distance/boundary calculations in JavaScript. Always use
PostGIS. See query patterns → `docs/database.md`

### Rule 3 — Bounding Box Loading Always
Frontend never loads all places at once. Every data fetch sends the
current map viewport as `bbox=minLat,minLng,maxLat,maxLng`.
Backend returns only what is inside that box using ST_Within.
This is what makes the system scale from 1 city to the whole world.

### Rule 4 — Source Tracking on Every Record
Every place and road has `source` field = `'osm'` or `'manual'`.
Every admin-added record has `is_verified = true`.
Never insert a record without setting source.

### Rule 5 — OSM Import Is Offline, Not Real-Time
We never call OSM during a user request. OSM data is imported once
per region via a script and stored in our database permanently.
The script is idempotent — uses INSERT ... ON CONFLICT DO NOTHING
based on osm_id. See full logic → `docs/osm.md`

### Rule 6 — Admin Auth Is Header-Based Only
Admin routes are protected by checking the `x-admin-key` request header
against the `ADMIN_KEY` environment variable. No JWT, no sessions,
no auth libraries. See middleware → `docs/api.md`

### Rule 7 — All API Responses Use One Shape
```json
{ "success": true, "data": <payload> }
{ "success": false, "error": "human readable message" }
```
Never return raw data without wrapping it in this shape.

### Rule 8 — No ORM, Raw SQL Only
All database queries use the `pg` package with raw SQL.
Never introduce Prisma, Sequelize, TypeORM, or any query builder.

---

## 4. Project Folder Structure

```
map-platform/
├── CLAUDE.md                        ← This file. Read first always.
├── docs/
│   ├── tech-stack.md                ← ALL packages, versions, docs URLs
│   ├── database.md                  ← Schema, PostGIS query patterns
│   ├── api.md                       ← Every endpoint, auth, response format
│   ├── osm.md                       ← Overpass API, import script logic
│   ├── frontend.md                  ← Map behavior, Leaflet usage, components
│   └── admin.md                     ← Admin panel flows and form logic
│
├── docker-compose.yml               ← PostgreSQL 15 + PostGIS only
│
├── backend/
│   ├── .env                         ← See section 5 for exact variables
│   ├── .env.example                 ← Same keys, empty values
│   ├── package.json
│   └── src/
│       ├── index.js                 ← Express app, mounts all routes
│       ├── db/
│       │   ├── index.js             ← pg Pool singleton
│       │   ├── schema.sql           ← All CREATE TABLE statements
│       │   └── seed.sql             ← Default regions + categories
│       ├── routes/
│       │   ├── places.js            ← GET, POST, PUT, DELETE /api/places
│       │   ├── roads.js             ← GET /api/roads
│       │   ├── regions.js           ← GET /api/regions
│       │   └── search.js            ← GET /api/search
│       ├── middleware/
│       │   └── adminAuth.js         ← x-admin-key validation
│       └── scripts/
│           └── osmImport.js         ← Run manually per region
│
└── frontend/
    ├── .env                         ← See section 5 for exact variables
    ├── .env.example
    ├── package.json
    └── src/
        ├── main.jsx                 ← React entry point
        ├── App.jsx                  ← Router setup
        ├── config.js                ← Map default center, zoom, API URL
        ├── api/
        │   └── index.js             ← All axios calls, single source of truth
        ├── components/
        │   ├── Map/
        │   │   ├── MapView.jsx      ← Main Leaflet map container
        │   │   ├── PlaceMarker.jsx  ← Single pin with popup
        │   │   └── RoadLayer.jsx    ← GeoJSON road lines
        │   ├── Search/
        │   │   └── SearchBar.jsx    ← Search input + dropdown results
        │   ├── Sidebar/
        │   │   └── CategoryFilter.jsx ← Category checkboxes
        │   └── Admin/
        │       ├── PlaceForm.jsx    ← Shared add/edit form
        │       └── PinPicker.jsx    ← Click map to set lat/lng
        └── pages/
            ├── MapPage.jsx          ← Public map (/)
            ├── PlaceDetailPage.jsx  ← Place detail (/place/:id)
            └── admin/
                ├── LoginPage.jsx        ← /admin/login
                ├── DashboardPage.jsx    ← /admin
                ├── PlacesListPage.jsx   ← /admin/places
                ├── AddPlacePage.jsx     ← /admin/add
                └── EditPlacePage.jsx    ← /admin/places/:id/edit
```

---

## 5. Environment Variables

### backend/.env
```
PORT=5000
DATABASE_URL=postgresql://mapuser:mappass@localhost:5432/mapdb
ADMIN_KEY=admin123
UPLOADS_DIR=./uploads
```

### frontend/.env
```
VITE_API_URL=http://localhost:5000
VITE_ADMIN_KEY=admin123
```

---

## 6. Default Seed Data

These must exist after running seed.sql:

**Regions:**
```
World               (type: world,    parent: none)
Bangladesh          (type: country,  parent: World,         country_code: BD)
USA                 (type: country,  parent: World,         country_code: US)
Dhaka Division      (type: division, parent: Bangladesh)
Chattogram Division (type: division, parent: Bangladesh)
Dhaka City          (type: city,     parent: Dhaka Division)
Chattogram City     (type: city,     parent: Chattogram Division)
```

**Categories (with map pin colors):**
```
Shop        #F59E0B
Restaurant  #EF4444
Hospital    #3B82F6
School      #8B5CF6
Mosque      #10B981
Bank        #6366F1
Hotel       #F97316
Landmark    #EC4899
Pharmacy    #14B8A6
Parking     #64748B
Park        #22C55E
Other       #94A3B8
```

---

## 7. How to Run (Quick Reference)

```bash
# Start database
docker-compose up -d

# Apply schema and seed data
psql postgresql://mapuser:mappass@localhost:5432/mapdb \
  -f backend/src/db/schema.sql
psql postgresql://mapuser:mappass@localhost:5432/mapdb \
  -f backend/src/db/seed.sql

# Install and start backend
cd backend && npm install && npm run dev

# Import OSM data for Dhaka City
node backend/src/scripts/osmImport.js "Dhaka City" 23.65,90.27,23.88,90.50

# Install and start frontend
cd frontend && npm install && npm run dev
```

---

## 8. What MVP Must Do (Definition of Done)

- [ ] Map loads and shows Dhaka City data from OSM import
- [ ] Pins load dynamically as user pans/zooms (bounding box)
- [ ] Clicking a pin shows popup with name, category, phone, hours
- [ ] Search bar finds places by name
- [ ] Category filter hides/shows pin types
- [ ] Admin can log in with ADMIN_KEY
- [ ] Admin can add a manual place by clicking the map + filling form
- [ ] Admin can upload photos for a place
- [ ] Admin can edit and delete any place
- [ ] Manual place appears on public map immediately after saving
- [ ] Adding a new city later = run osmImport.js with new bbox, zero code change
