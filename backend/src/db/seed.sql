-- Categories
INSERT INTO categories (id, name, icon, color) VALUES
  (uuid_generate_v4(), 'Shop',       '🛍️',  '#F59E0B'),
  (uuid_generate_v4(), 'Restaurant', '🍽️',  '#EF4444'),
  (uuid_generate_v4(), 'Hospital',   '🏥',  '#3B82F6'),
  (uuid_generate_v4(), 'School',     '🏫',  '#8B5CF6'),
  (uuid_generate_v4(), 'Mosque',     '🕌',  '#10B981'),
  (uuid_generate_v4(), 'Bank',       '🏦',  '#6366F1'),
  (uuid_generate_v4(), 'Hotel',      '🏨',  '#F97316'),
  (uuid_generate_v4(), 'Landmark',   '📍',  '#EC4899'),
  (uuid_generate_v4(), 'Pharmacy',   '💊',  '#14B8A6'),
  (uuid_generate_v4(), 'Parking',    '🅿️',  '#64748B'),
  (uuid_generate_v4(), 'Park',       '🌳',  '#22C55E'),
  (uuid_generate_v4(), 'Other',      '📌',  '#94A3B8')
ON CONFLICT (name) DO NOTHING;

-- Regions
WITH world AS (
  INSERT INTO regions (id, name, type, parent_id)
  VALUES (uuid_generate_v4(), 'World', 'world', NULL)
  RETURNING id
),
bd AS (
  INSERT INTO regions (id, name, type, parent_id, country_code,
    bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng)
  SELECT uuid_generate_v4(), 'Bangladesh', 'country', world.id, 'BD',
    20.59, 88.01, 26.63, 92.67
  FROM world RETURNING id
),
us AS (
  INSERT INTO regions (id, name, type, parent_id, country_code,
    bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng)
  SELECT uuid_generate_v4(), 'USA', 'country', world.id, 'US',
    24.39, -124.84, 49.38, -66.88
  FROM world RETURNING id
),
dhaka_div AS (
  INSERT INTO regions (id, name, type, parent_id,
    bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng)
  SELECT uuid_generate_v4(), 'Dhaka Division', 'division', bd.id,
    23.20, 89.60, 24.90, 91.10
  FROM bd RETURNING id
),
ctg_div AS (
  INSERT INTO regions (id, name, type, parent_id,
    bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng)
  SELECT uuid_generate_v4(), 'Chattogram Division', 'division', bd.id,
    20.74, 91.40, 24.10, 92.67
  FROM bd RETURNING id
)
INSERT INTO regions (id, name, type, parent_id,
  bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng)
SELECT uuid_generate_v4(), 'Dhaka City', 'city', dhaka_div.id,
  23.65, 90.27, 23.88, 90.50
FROM dhaka_div
UNION ALL
SELECT uuid_generate_v4(), 'Chattogram City', 'city', ctg_div.id,
  22.20, 91.70, 22.45, 91.95
FROM ctg_div;
