-- ============================================
-- The Anti-Agency Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Sites Table
-- ============================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'law-firm',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Pages Table
-- ============================================
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, slug)
);

-- ============================================
-- Content Versions Table (for history)
-- ============================================
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- Contact Submissions Table
-- ============================================
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_sites_slug ON sites(slug);
CREATE INDEX idx_sites_owner ON sites(owner_id);
CREATE INDEX idx_pages_site ON pages(site_id);
CREATE INDEX idx_pages_slug ON pages(site_id, slug);
CREATE INDEX idx_versions_page ON content_versions(page_id);
CREATE INDEX idx_contact_site ON contact_submissions(site_id);
CREATE INDEX idx_contact_created ON contact_submissions(created_at DESC);

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public can read published pages (for viewing sites)
CREATE POLICY "Public can view published pages"
  ON pages FOR SELECT
  USING (is_published = true);

-- Public can read sites (for routing)
CREATE POLICY "Public can view sites"
  ON sites FOR SELECT
  USING (true);

-- Owners can manage their sites
CREATE POLICY "Owners can manage their sites"
  ON sites FOR ALL
  USING (auth.uid() = owner_id);

-- Owners can manage pages on their sites
CREATE POLICY "Owners can manage their pages"
  ON pages FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- Owners can view all pages on their sites (including drafts)
CREATE POLICY "Owners can view all their pages"
  ON pages FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- Owners can manage version history
CREATE POLICY "Owners can manage versions"
  ON content_versions FOR ALL
  USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN sites s ON p.site_id = s.id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Public can submit contact forms
CREATE POLICY "Public can submit contact forms"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Owners can view contact submissions for their sites
CREATE POLICY "Owners can view their contact submissions"
  ON contact_submissions FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- Owners can update contact submissions (mark as read)
CREATE POLICY "Owners can update their contact submissions"
  ON contact_submissions FOR UPDATE
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- Demo Data (Optional - for testing)
-- ============================================
-- Uncomment and run separately if you want demo data

/*
-- Insert a demo site (no owner - publicly editable for demo)
INSERT INTO sites (slug, name, template_id, settings)
VALUES (
  'smith-johnson-law',
  'Smith & Johnson Law',
  'law-firm',
  '{}'
);

-- Get the site ID
DO $$
DECLARE
  demo_site_id UUID;
BEGIN
  SELECT id INTO demo_site_id FROM sites WHERE slug = 'smith-johnson-law';

  -- Insert the home page with default content
  INSERT INTO pages (site_id, slug, title, content, is_published)
  VALUES (
    demo_site_id,
    'home',
    'Home',
    '{
      "siteInfo": {
        "firmName": "Smith & Johnson Law",
        "phone": "(555) 123-4567",
        "email": "info@smithjohnsonlaw.com",
        "address": "123 Legal Avenue, Suite 500\nSan Francisco, CA 94102"
      },
      "sections": []
    }'::jsonb,
    true
  );
END $$;
*/

-- ============================================
-- Tasks Table (for workflow create_task action)
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_site ON tasks(site_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Notifications Table (for workflow send_notification action)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_site ON notifications(site_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- Site Imports Table (for URL import tracking)
-- ============================================
CREATE TABLE site_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT NOT NULL,
  source_platform TEXT,
  scraped_data JSONB DEFAULT '{}',
  diagnosis_result JSONB DEFAULT '{}',
  import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'scraping', 'diagnosing', 'generating', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_site_imports_site ON site_imports(site_id);
CREATE INDEX idx_site_imports_status ON site_imports(import_status);
CREATE INDEX idx_site_imports_created ON site_imports(created_at DESC);

-- RLS for site_imports
ALTER TABLE site_imports ENABLE ROW LEVEL SECURITY;

-- Owners can manage their site imports
CREATE POLICY "Owners can manage their site imports"
  ON site_imports FOR ALL
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- Google Connections Table (for Google Business Profile import)
-- ============================================
CREATE TABLE google_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_account_id TEXT,
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_google_connections_user ON google_connections(user_id);

CREATE TRIGGER google_connections_updated_at
  BEFORE UPDATE ON google_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS for google_connections
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own Google connections
CREATE POLICY "Users can manage their Google connections"
  ON google_connections FOR ALL
  USING (auth.uid() = user_id);
