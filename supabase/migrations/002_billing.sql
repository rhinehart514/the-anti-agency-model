-- ============================================
-- User Profiles Table (for billing & settings)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Stripe billing
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan_id TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',

  -- Usage tracking
  ai_requests_this_month INTEGER DEFAULT 0,
  ai_requests_reset_at TIMESTAMPTZ DEFAULT NOW(),

  -- Custom domain settings
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_domain ON user_profiles(custom_domain);

-- RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (except billing fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert profiles (via trigger or service role)
CREATE POLICY "Service role can manage profiles"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Add custom domain to sites
-- ============================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false;

-- Index for domain lookup
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(custom_domain);

-- ============================================
-- Analytics Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,

  -- Event data
  event_type TEXT NOT NULL, -- 'page_view', 'contact_submit', etc.
  page_path TEXT,
  referrer TEXT,

  -- Visitor info (anonymized)
  visitor_id TEXT, -- Anonymous session ID
  country TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_site ON analytics_events(site_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Site owners can view their analytics
CREATE POLICY "Owners can view site analytics"
  ON analytics_events FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE owner_id = auth.uid()
    )
  );

-- Public can insert analytics (for tracking)
CREATE POLICY "Public can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Function to auto-create user profile
-- ============================================

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
