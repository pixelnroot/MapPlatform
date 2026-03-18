CREATE TABLE IF NOT EXISTS elevation_cache (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lat        FLOAT NOT NULL,
  lng        FLOAT NOT NULL,
  elevation  FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_elevation_cache_coords
  ON elevation_cache(ROUND(lat::numeric, 4), ROUND(lng::numeric, 4));
