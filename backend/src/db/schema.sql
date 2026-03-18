CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Regions: single self-referencing table for all geography levels
CREATE TABLE regions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  name_bn      VARCHAR(255),
  type         VARCHAR(50) NOT NULL
                 CHECK (type IN (
                   'world','country','division',
                   'district','city','area'
                 )),
  parent_id    UUID REFERENCES regions(id)
                 ON DELETE SET NULL,
  country_code CHAR(2),
  bbox_sw_lat  FLOAT,
  bbox_sw_lng  FLOAT,
  bbox_ne_lat  FLOAT,
  bbox_ne_lng  FLOAT,
  boundary     GEOMETRY(POLYGON, 4326),
  osm_id       BIGINT UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_regions_parent_id  ON regions(parent_id);
CREATE INDEX idx_regions_type       ON regions(type);
CREATE INDEX idx_regions_boundary   ON regions USING GIST(boundary);

-- Categories
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  icon       VARCHAR(100),
  color      VARCHAR(7) NOT NULL DEFAULT '#94A3B8',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Places
CREATE TABLE places (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  name_bn        VARCHAR(255),
  category_id    UUID REFERENCES categories(id)
                   ON DELETE SET NULL,
  region_id      UUID NOT NULL REFERENCES regions(id)
                   ON DELETE RESTRICT,
  lat            FLOAT NOT NULL,
  lng            FLOAT NOT NULL,
  geometry       GEOMETRY(POINT, 4326) NOT NULL,
  phone          VARCHAR(50),
  opening_hours  VARCHAR(255),
  floor_details  TEXT,
  custom_notes   TEXT,
  address        TEXT,
  website        VARCHAR(500),
  source         VARCHAR(10) NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('osm', 'manual')),
  osm_id         BIGINT UNIQUE,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_geometry    ON places USING GIST(geometry);
CREATE INDEX idx_places_region_id   ON places(region_id);
CREATE INDEX idx_places_category_id ON places(category_id);
CREATE INDEX idx_places_source      ON places(source);
CREATE INDEX idx_places_name        ON places USING GIN(to_tsvector('english', name));

-- Roads
CREATE TABLE roads (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255),
  name_bn    VARCHAR(255),
  type       VARCHAR(100),
  region_id  UUID NOT NULL REFERENCES regions(id)
               ON DELETE RESTRICT,
  geometry   GEOMETRY(LINESTRING, 4326) NOT NULL,
  source     VARCHAR(10) NOT NULL DEFAULT 'osm'
               CHECK (source IN ('osm', 'manual')),
  osm_id     BIGINT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roads_geometry  ON roads USING GIST(geometry);
CREATE INDEX idx_roads_region_id ON roads(region_id);
CREATE INDEX idx_roads_type      ON roads(type);

-- Photos
CREATE TABLE photos (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id   UUID NOT NULL REFERENCES places(id)
               ON DELETE CASCADE,
  filename   VARCHAR(500) NOT NULL,
  caption    VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_place_id ON photos(place_id);

-- Trigger: auto-update updated_at on places
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
