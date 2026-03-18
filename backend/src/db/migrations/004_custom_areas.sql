-- Extend regions type CHECK constraint to include custom_area
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_type_check;
ALTER TABLE regions ADD CONSTRAINT regions_type_check
  CHECK (type IN ('world','country','division','district','city','area','custom_area'));
