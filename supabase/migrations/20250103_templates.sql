-- Template marketplace tables

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  visibility TEXT DEFAULT 'private', -- private, public, premium
  status TEXT DEFAULT 'draft', -- draft, published, archived
  thumbnail TEXT,
  preview_url TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  install_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template installs tracking
CREATE TABLE IF NOT EXISTS template_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  options JSONB DEFAULT '{}',
  installed_at TIMESTAMPTZ DEFAULT now()
);

-- Template purchases for premium templates
CREATE TABLE IF NOT EXISTS template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now()
);

-- Template reviews
CREATE TABLE IF NOT EXISTS template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON templates(visibility) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_popularity ON templates(install_count DESC);

CREATE INDEX IF NOT EXISTS idx_template_installs_template ON template_installs(template_id);
CREATE INDEX IF NOT EXISTS idx_template_installs_site ON template_installs(site_id);

CREATE INDEX IF NOT EXISTS idx_template_purchases_template ON template_purchases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_site ON template_purchases(site_id);

CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON template_reviews(template_id);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "templates_public_select" ON templates
  FOR SELECT
  USING (visibility = 'public' AND status = 'published');

CREATE POLICY "templates_owner_all" ON templates
  FOR ALL
  USING (
    source_site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS policies for installs
CREATE POLICY "installs_site_owner" ON template_installs
  FOR ALL
  USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS policies for purchases
CREATE POLICY "purchases_user" ON template_purchases
  FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for reviews
CREATE POLICY "reviews_select" ON template_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert" ON template_reviews
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_update" ON template_reviews
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "reviews_delete" ON template_reviews
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to update template rating on review change
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE templates
  SET
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM template_reviews
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM template_reviews
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_rating
  AFTER INSERT OR UPDATE OR DELETE ON template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating();
