CREATE TABLE IF NOT EXISTS land_use (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type       VARCHAR(100) NOT NULL,
  name       VARCHAR(255),
  region_id  UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  geometry   GEOMETRY(POLYGON, 4326) NOT NULL,
  source     VARCHAR(10) NOT NULL DEFAULT 'osm'
               CHECK (source IN ('osm', 'manual')),
  osm_id     BIGINT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_land_use_geometry ON land_use USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_land_use_type ON land_use(type);
CREATE INDEX IF NOT EXISTS idx_land_use_region ON land_use(region_id);
