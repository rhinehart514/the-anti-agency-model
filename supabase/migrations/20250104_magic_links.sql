-- Magic Links for "Cursor for Normies" feature
-- Allows clients to edit their sites via natural language without logging in

-- Magic links table
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, -- "Client Edit Link", "Sarah's Access", etc.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  is_active BOOLEAN DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{
    "canEditText": true,
    "canEditColors": true,
    "canEditImages": false,
    "canAddSections": false,
    "canRemoveSections": false,
    "requiresApproval": false,
    "maxEditsPerDay": 50
  }',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Site edits tracking table
CREATE TABLE IF NOT EXISTS site_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  magic_link_id UUID REFERENCES magic_links(id) ON DELETE SET NULL,
  request TEXT NOT NULL, -- The natural language request
  operations JSONB NOT NULL DEFAULT '[]', -- The operations generated
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'expired')),
  access_type TEXT CHECK (access_type IN ('owner', 'magic_link')),
  original_content JSONB, -- Snapshot before edit
  proposed_content JSONB, -- What it would look like after
  applied_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for magic_links
CREATE INDEX IF NOT EXISTS idx_magic_links_site ON magic_links(site_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_active ON magic_links(site_id, is_active) WHERE is_active = true;

-- Indexes for site_edits
CREATE INDEX IF NOT EXISTS idx_site_edits_site ON site_edits(site_id);
CREATE INDEX IF NOT EXISTS idx_site_edits_page ON site_edits(page_id);
CREATE INDEX IF NOT EXISTS idx_site_edits_status ON site_edits(status);
CREATE INDEX IF NOT EXISTS idx_site_edits_magic_link ON site_edits(magic_link_id);
CREATE INDEX IF NOT EXISTS idx_site_edits_created ON site_edits(created_at DESC);

-- Enable RLS
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_edits ENABLE ROW LEVEL SECURITY;

-- RLS policies for magic_links
-- Site owners can manage all magic links for their sites
CREATE POLICY "magic_links_owner_all" ON magic_links
  FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  );

-- RLS policies for site_edits
-- Site owners can see all edits for their sites
CREATE POLICY "site_edits_owner_select" ON site_edits
  FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  );

-- Site owners can update edit status (approve/reject)
CREATE POLICY "site_edits_owner_update" ON site_edits
  FOR UPDATE
  USING (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  );

-- Anyone with valid magic link can insert edits (handled at API level)
-- We use service role for magic link edit insertions
CREATE POLICY "site_edits_insert" ON site_edits
  FOR INSERT
  WITH CHECK (true);

-- Function to increment usage count (called from app code)
CREATE OR REPLACE FUNCTION increment_magic_link_usage(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE magic_links
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if magic link is valid
CREATE OR REPLACE FUNCTION is_magic_link_valid(p_site_id UUID, p_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  link_id UUID,
  permissions JSONB,
  error_message TEXT
) AS $$
DECLARE
  v_link magic_links%ROWTYPE;
BEGIN
  -- Find the link
  SELECT * INTO v_link
  FROM magic_links
  WHERE site_id = p_site_id
    AND token = p_token
    AND is_active = true;

  -- Check if found
  IF v_link.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::JSONB, 'Invalid or inactive link'::TEXT;
    RETURN;
  END IF;

  -- Check expiration
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN QUERY SELECT false, v_link.id, NULL::JSONB, 'Link has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid!
  RETURN QUERY SELECT true, v_link.id, v_link.permissions, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update usage when edit is created via magic link
CREATE OR REPLACE FUNCTION update_magic_link_on_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.magic_link_id IS NOT NULL THEN
    PERFORM increment_magic_link_usage(NEW.magic_link_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_magic_link_usage
  AFTER INSERT ON site_edits
  FOR EACH ROW
  WHEN (NEW.magic_link_id IS NOT NULL)
  EXECUTE FUNCTION update_magic_link_on_edit();
