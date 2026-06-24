-- Runner quick-add vendors and admin verification workflow

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'active'
    CHECK (verification_status IN ('active', 'pending')),
  ADD COLUMN IF NOT EXISTS created_by_runner_id UUID REFERENCES users(id);

ALTER TABLE vendors
  ALTER COLUMN contact_phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_verification_status
  ON vendors (verification_status)
  WHERE verification_status = 'pending';
