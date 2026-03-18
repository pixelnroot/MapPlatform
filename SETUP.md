# MapPlatform Setup Guide

A complete guide to get the map platform running from scratch.

---

## Prerequisites

- **Docker** and **Docker Compose** (for the database, or full-stack deployment)
- **Node.js 18+** and **npm** (for local development)
- **Git**

---

## Quick Start (Docker — Recommended)

This spins up PostgreSQL + PostGIS, the backend API, and the frontend in one command.

```bash
# 1. Clone the repo
git clone <your-repo-url> map-platform
cd map-platform

# 2. Create backend environment file
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your settings:

```env
PORT=5000
DATABASE_URL=postgresql://mapuser:mappass@localhost:5432/mapdb
ADMIN_KEY=your-secure-admin-key
UPLOADS_DIR=./uploads
JWT_SECRET=your-secure-jwt-secret
```

```bash
# 3. Create frontend environment file
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_ADMIN_KEY=your-secure-admin-key
```

```bash
# 4. Start everything
docker compose up -d

# 5. Wait for database to be healthy, then run migrations
docker compose exec postgres psql -U mapuser -d mapdb \
  -f /docker-entrypoint-initdb.d/01-schema.sql

# Run all enterprise upgrade migrations
for i in $(seq -w 1 9); do
  docker compose exec postgres psql -U mapuser -d mapdb \
    -c "$(cat backend/src/db/migrations/00${i}_*.sql)"
done
```

The app is now running:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5000
- **Admin Panel**: http://localhost:8080/admin

> **Note**: On first Docker Compose start, the schema and seed SQL are auto-applied via `docker-entrypoint-initdb.d`. The migration step above is only needed for the enterprise features (users, activity log, custom fields, etc.).

---

## Local Development Setup

For active development with hot-reload on both frontend and backend.

### Step 1 — Start the Database

```bash
cd map-platform
docker compose up -d postgres
```

This starts PostgreSQL 15 with PostGIS 3.4 on port 5432. Schema and seed data are auto-applied on first start.

### Step 2 — Run Migrations

Apply the enterprise upgrade migrations:

```bash
DB_URL="postgresql://mapuser:mappass@localhost:5432/mapdb"

psql "$DB_URL" -f backend/src/db/migrations/001_users.sql
psql "$DB_URL" -f backend/src/db/migrations/002_activity_log.sql
psql "$DB_URL" -f backend/src/db/migrations/003_custom_fields.sql
psql "$DB_URL" -f backend/src/db/migrations/004_custom_areas.sql
psql "$DB_URL" -f backend/src/db/migrations/005_elevation_cache.sql
psql "$DB_URL" -f backend/src/db/migrations/006_land_use.sql
psql "$DB_URL" -f backend/src/db/migrations/007_tasks.sql
psql "$DB_URL" -f backend/src/db/migrations/008_flags.sql
psql "$DB_URL" -f backend/src/db/migrations/009_api_keys.sql
```

Or run them all at once:

```bash
for f in backend/src/db/migrations/*.sql; do psql "$DB_URL" -f "$f"; done
```

### Step 3 — Create the First User (Owner)

```bash
psql "$DB_URL" -c "
INSERT INTO users (id, email, name, password, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'Admin',
  '\$(echo -n 'your-password' | npx bcrypt-cli 10)',
  'owner',
  true
);"
```

Or use this simpler approach — start the backend first (Step 4), then use the legacy admin key to create the owner via API:

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-secure-admin-key" \
  -d '{
    "email": "admin@example.com",
    "name": "Admin",
    "password": "changeme123",
    "role": "owner"
  }'
```

### Step 4 — Start the Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://mapuser:mappass@localhost:5432/mapdb
ADMIN_KEY=your-secure-admin-key
UPLOADS_DIR=./uploads
JWT_SECRET=change-this-to-a-random-string
```

```bash
npm install
npm run dev
```

The API is now running at http://localhost:5000.

### Step 5 — Start the Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_ADMIN_KEY=your-secure-admin-key
```

```bash
npm install
npm run dev
```

The app is now running at http://localhost:5173.

---

## Import OSM Data

The map is empty until you import data. The OSM import script pulls data from OpenStreetMap's Overpass API for any bounding box.

### Import a City

```bash
cd backend

# Dhaka City
node src/scripts/osmImport.js "Dhaka City" 23.65,90.27,23.88,90.50

# Chattogram City
node src/scripts/osmImport.js "Chattogram City" 22.30,91.74,22.42,91.88
```

**Arguments:**
1. Region name — must match a region in the `regions` table (from seed data)
2. Bounding box — `minLat,minLng,maxLat,maxLng`

### Import Any Region Worldwide

First add the region to your database, then import:

```bash
DB_URL="postgresql://mapuser:mappass@localhost:5432/mapdb"

# Add a new country (e.g., Japan)
psql "$DB_URL" -c "
INSERT INTO regions (id, name, type, parent_id, country_code)
VALUES (gen_random_uuid(), 'Japan', 'country',
  (SELECT id FROM regions WHERE type='world'), 'JP');"

# Add a city
psql "$DB_URL" -c "
INSERT INTO regions (id, name, type, parent_id)
VALUES (gen_random_uuid(), 'Tokyo', 'city',
  (SELECT id FROM regions WHERE name='Japan'));"

# Import OSM data for Tokyo
node src/scripts/osmImport.js "Tokyo" 35.55,139.55,35.82,139.92
```

The import is idempotent — running it again won't create duplicates (uses `ON CONFLICT DO NOTHING` on `osm_id`).

---

## Accessing the Application

### Public Map

Open http://localhost:5173 (dev) or http://localhost:8080 (Docker).

**Map controls (top bar):**
- **Map / Satellite** — switch tile layers
- **Heatmap** — density visualization of places
- **Elevation** — click two points to see elevation profile; hover shows altitude tooltip
- **Land Use** — colored overlay of residential, commercial, farmland areas etc.
- **Compare** — side-by-side swipe between OSM and satellite imagery
- **BN / EN** — toggle Bengali / English
- **Right-click** on map — shows nearest facilities and catchment analysis

**Sidebar:**
- Category filter checkboxes to show/hide place types
- Search bar (inside map) to find places by name

### Admin Panel

Go to http://localhost:5173/admin (dev) or http://localhost:8080/admin (Docker).

**Login options:**
- **Email + Password** — uses JWT authentication (recommended)
- **Admin Key** — legacy mode using the `ADMIN_KEY` from your `.env`

**Admin sections:**

| Section | Path | Description |
|---|---|---|
| Dashboard | `/admin` | Overview stats |
| Places | `/admin/places` | List, add, edit, delete places with photos |
| Categories | `/admin/categories` | Manage categories and custom data fields |
| Users | `/admin/users` | Create/manage user accounts and roles |
| Tasks | `/admin/tasks` | Assign survey tasks to team members |
| Analytics | `/admin/analytics` | Region statistics, charts, coverage scoring |
| Activity | `/admin/activity` | Audit log of all admin actions |
| Flags | `/admin/flags` | Review data quality flags and auto-detect incomplete records |
| Import | `/admin/import` | Bulk import places from CSV or GeoJSON files |
| API Keys | `/admin/api-keys` | Create API keys for third-party access |

### Embeddable Map

Generate an iframe snippet from the admin panel or manually:

```html
<iframe
  src="http://localhost:5173/embed?lat=23.78&lng=90.40&zoom=13&category=Restaurant"
  width="800"
  height="600"
  frameborder="0">
</iframe>
```

URL parameters: `lat`, `lng`, `zoom`, `category`, `api_key`.

---

## User Roles

| Role | Can do |
|---|---|
| **owner** | Everything. Manage users, API keys, all admin features |
| **admin** | All content management. Cannot manage users or API keys |
| **collector** | Add and edit places, update assigned tasks |
| **viewer** | Read-only access to admin panel |

---

## API Overview

All endpoints return:

```json
{ "success": true, "data": <payload> }
{ "success": false, "error": "message" }
```

**Authentication** — pass one of:
- `Authorization: Bearer <jwt-token>` (recommended)
- `x-admin-key: <admin-key>` (legacy)
- `X-API-Key: <api-key>` (public API, rate-limited)

**Key endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login with email+password, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user info |
| GET | `/api/places?bbox=...` | None | Get places in bounding box |
| GET | `/api/places?bbox=...&cluster=true&zoom=10` | None | Get server-side clusters |
| POST | `/api/places` | Admin | Create a place |
| GET | `/api/roads?bbox=...` | None | Get roads in bounding box |
| GET | `/api/regions` | None | List all regions with boundaries |
| GET | `/api/search?q=...` | None | Search places by name |
| GET | `/api/categories` | None | List categories |
| GET | `/api/analytics/region/:id` | Admin | Region statistics |
| GET | `/api/analytics/score/:id` | Admin | Infrastructure coverage score |
| GET | `/api/analytics/nearest?lat=&lng=` | Admin | Nearest facilities |
| GET | `/api/terrain/elevation?lat=&lng=` | None | Get elevation at a point |
| POST | `/api/terrain/profile` | None | Get elevation along a path |
| GET | `/api/landuse?bbox=...` | None | Land use polygons |
| GET | `/api/export/places?format=csv` | Admin | Export places as CSV or GeoJSON |
| POST | `/api/import/places` | Admin | Bulk import from CSV/GeoJSON file |
| CRUD | `/api/users` | Owner/Admin | User management |
| CRUD | `/api/tasks` | Admin | Task management |
| CRUD | `/api/flags` | Admin | Data quality flags |
| CRUD | `/api/api-keys` | Owner/Admin | API key management |

---

## Export & Import

### Export

From the admin Places page, click **Export CSV** or **Export GeoJSON**. Supports filtering by region and category.

Via API:

```bash
curl "http://localhost:5000/api/export/places?format=csv&region_id=UUID" \
  -H "x-admin-key: your-key" -o places.csv

curl "http://localhost:5000/api/export/places?format=geojson" \
  -H "x-admin-key: your-key" -o places.geojson
```

### Import

From the admin Import page, upload a CSV or GeoJSON file and select a target region.

**CSV format:**

```csv
name,lat,lng,category,phone,address,opening_hours
"My Shop",23.78,90.40,Shop,"+8801234567890","123 Main St","09:00-18:00"
```

Required columns: `name`, `lat`, `lng`. Optional: `category` (matched by name), `phone`, `address`, `opening_hours`, `description`, `website`.

---

## Offline / PWA Support

The app is a Progressive Web App:
- Install it from Chrome's address bar ("Install App")
- Map tiles are cached for offline viewing (7-day expiry, up to 500 tiles)
- When offline, new places are queued in IndexedDB and auto-sync when connectivity returns
- The offline indicator in the admin panel shows queue status with a "Sync Now" button

---

## PDF Reports

From the Analytics page, click **Generate Report** to download a PDF containing:
- Region summary statistics
- Category breakdown
- Road network stats
- Infrastructure coverage score and breakdown

---

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker compose up -d --build

# Frontend serves on port 8080, backend on port 5000
```

### Environment Variables for Production

**backend/.env:**
```env
PORT=5000
DATABASE_URL=postgresql://user:pass@your-db-host:5432/mapdb
ADMIN_KEY=generate-a-strong-random-key
UPLOADS_DIR=./uploads
JWT_SECRET=generate-another-strong-random-key
```

**frontend/.env:**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_ADMIN_KEY=same-key-as-backend
```

### Security Checklist

- [ ] Change `ADMIN_KEY` from the default `admin123`
- [ ] Set a strong random `JWT_SECRET` (at least 32 characters)
- [ ] Change the default database password in `docker-compose.yml`
- [ ] Create a proper owner user and disable the legacy admin key flow
- [ ] Put the backend behind HTTPS (e.g., nginx reverse proxy with Let's Encrypt)
- [ ] Set `VITE_API_URL` to your HTTPS API domain

---

## Troubleshooting

**Database connection refused**
- Check Docker is running: `docker compose ps`
- Verify the database is healthy: `docker compose logs postgres`

**Empty map after starting**
- You need to import OSM data first. See the "Import OSM Data" section.

**Login not working**
- With email/password: ensure you created a user first (see Step 3)
- With admin key: ensure `VITE_ADMIN_KEY` in `frontend/.env` matches `ADMIN_KEY` in `backend/.env`

**Migrations fail**
- Ensure the base schema was applied first (`schema.sql` and `seed.sql`)
- Run migrations in order (001 through 009)

**Build fails on frontend**
- Ensure Node.js 18+ is installed
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**OSM import times out**
- Use smaller bounding boxes (a single city, not a whole country)
- The Overpass API has rate limits; wait a minute and retry
