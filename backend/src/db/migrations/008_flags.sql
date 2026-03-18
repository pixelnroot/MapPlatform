CREATE TABLE IF NOT EXISTS flags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id   UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  type       VARCHAR(30) NOT NULL
               CHECK (type IN ('incorrect_location','closed','duplicate','incomplete','other')),
  status     VARCHAR(20) NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','resolved','dismissed')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_place ON flags(place_id);
CREATE INDEX IF NOT EXISTS idx_flags_status ON flags(status);

CREATE TRIGGER update_flags_updated_at
  BEFORE UPDATE ON flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
