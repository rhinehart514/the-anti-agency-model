-- Analytics tables for page views and events

-- Page view tracking
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- Hashed IP for privacy
  country TEXT,
  city TEXT,
  region TEXT,
  device_type TEXT, -- desktop, mobile, tablet
  browser TEXT,
  os TEXT,
  session_id TEXT,
  site_user_id UUID REFERENCES site_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  session_id TEXT,
  site_user_id UUID REFERENCES site_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_page_views_site_created ON page_views(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(site_id, path);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page_id) WHERE page_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_site_created ON analytics_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON analytics_events(site_id, event_name);
CREATE INDEX IF NOT EXISTS idx_events_category ON analytics_events(site_id, event_category) WHERE event_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for page_views
CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT
  WITH CHECK (true); -- Allow anonymous inserts for tracking

CREATE POLICY "page_views_select" ON page_views
  FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS policies for analytics_events
CREATE POLICY "events_insert" ON analytics_events
  FOR INSERT
  WITH CHECK (true); -- Allow anonymous inserts for tracking

CREATE POLICY "events_select" ON analytics_events
  FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Aggregate views for faster dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_page_views AS
SELECT
  site_id,
  DATE(created_at) as date,
  path,
  COUNT(*) as views,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT ip_hash) as unique_visitors
FROM page_views
GROUP BY site_id, DATE(created_at), path;

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_events AS
SELECT
  site_id,
  DATE(created_at) as date,
  event_name,
  event_category,
  COUNT(*) as count
FROM analytics_events
GROUP BY site_id, DATE(created_at), event_name, event_category;

-- Create indexes on materialized views
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_page_views_unique ON daily_page_views(site_id, date, path);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_events_unique ON daily_events(site_id, date, event_name, event_category);

-- Function to refresh materialized views (call via cron job)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_page_views;
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_events;
END;
$$ LANGUAGE plpgsql;
