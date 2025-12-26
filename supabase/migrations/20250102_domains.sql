-- Custom domains for sites

CREATE TABLE IF NOT EXISTS site_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  ssl_status TEXT DEFAULT 'pending', -- pending, active, failed
  ssl_expires_at TIMESTAMPTZ,
  dns_configured BOOLEAN DEFAULT false,
  last_check_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_domains_site ON site_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_site_domains_domain ON site_domains(domain);
CREATE INDEX IF NOT EXISTS idx_site_domains_verified ON site_domains(verified) WHERE verified = true;

-- Enable RLS
ALTER TABLE site_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "site_domains_select" ON site_domains
  FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "site_domains_insert" ON site_domains
  FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "site_domains_update" ON site_domains
  FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "site_domains_delete" ON site_domains
  FOR DELETE
  USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Function to ensure only one primary domain per site
CREATE OR REPLACE FUNCTION ensure_single_primary_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE site_domains
    SET is_primary = false
    WHERE site_id = NEW.site_id AND id != NEW.id AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_domain
  BEFORE INSERT OR UPDATE ON site_domains
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_domain();

-- Update sites table to reference primary custom domain
ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain TEXT;
