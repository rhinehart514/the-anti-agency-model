-- ============================================
-- Platform Builder Migration - Phase 1
-- Run this AFTER schema.sql
-- ============================================

-- ============================================
-- Organizations (for agencies/teams)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Organization Members
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- Themes
-- ============================================
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '{
    "primary": {"500": "#3b82f6", "600": "#2563eb"},
    "secondary": {"500": "#64748b", "600": "#475569"},
    "accent": {"500": "#f97316", "600": "#ea580c"},
    "background": "#ffffff",
    "foreground": "#0f172a"
  }',
  typography JSONB NOT NULL DEFAULT '{
    "fontFamily": {"heading": "Inter", "body": "Inter"},
    "fontSize": {"base": "16px", "lg": "18px", "xl": "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px"}
  }',
  spacing JSONB DEFAULT '{}',
  border_radius JSONB DEFAULT '{"sm": "0.25rem", "md": "0.5rem", "lg": "1rem"}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- ============================================
-- Component Registry
-- ============================================
CREATE TABLE IF NOT EXISTS component_registry (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'hero', 'features', 'testimonials', 'pricing',
    'contact', 'footer', 'navigation', 'content',
    'cta', 'gallery', 'form', 'stats', 'team', 'faq'
  )),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  schema JSONB NOT NULL DEFAULT '{}',
  default_props JSONB NOT NULL DEFAULT '{}',
  editable_fields JSONB NOT NULL DEFAULT '[]',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Page Sections (normalized from content JSONB)
-- ============================================
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
  component_id TEXT REFERENCES component_registry(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL,
  props JSONB NOT NULL DEFAULT '{}',
  styles JSONB DEFAULT '{}',
  visibility JSONB DEFAULT '{"visible": true, "mobile": true, "desktop": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enhance Sites Table
-- ============================================
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS navigation JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_themes_org ON themes(organization_id);
CREATE INDEX IF NOT EXISTS idx_component_category ON component_registry(category);
CREATE INDEX IF NOT EXISTS idx_page_sections_page ON page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_order ON page_sections(page_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sites_org ON sites(organization_id);

-- ============================================
-- Triggers
-- ============================================
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER page_sections_updated_at
  BEFORE UPDATE ON page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

-- Organizations: owners and members can view, only owners can manage
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can manage their organizations"
  ON organizations FOR ALL
  USING (owner_id = auth.uid());

-- Organization Members: org admins can manage
CREATE POLICY "Org admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can view their memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Themes: public themes visible to all, org themes to org members
CREATE POLICY "Public themes are visible"
  ON themes FOR SELECT
  USING (is_public = true OR organization_id IS NULL);

CREATE POLICY "Org members can view org themes"
  ON themes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage themes"
  ON themes FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Component Registry: readable by all authenticated users
CREATE POLICY "Authenticated users can read components"
  ON component_registry FOR SELECT
  USING (true);

-- Only system admins can modify components (handled via service role)
-- No policy for INSERT/UPDATE/DELETE means only service role can do it

-- Page Sections: follow page ownership
CREATE POLICY "Public can view published page sections"
  ON page_sections FOR SELECT
  USING (
    page_id IN (SELECT id FROM pages WHERE is_published = true)
  );

CREATE POLICY "Owners can manage page sections"
  ON page_sections FOR ALL
  USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN sites s ON p.site_id = s.id
      WHERE s.owner_id = auth.uid()
    )
  );

-- ============================================
-- Seed Default Components
-- ============================================
INSERT INTO component_registry (id, category, name, description, schema, default_props, editable_fields)
VALUES
  -- Hero Components
  ('hero-centered', 'hero', 'Centered Hero', 'A centered hero section with headline, subheadline, and CTA buttons',
   '{"headline": "string", "subheadline": "string", "primaryCta": {"text": "string", "url": "string"}, "secondaryCta": {"text": "string", "url": "string"}, "backgroundType": "enum:solid,gradient,image", "backgroundValue": "string"}',
   '{"headline": "Welcome to Our Platform", "subheadline": "Build amazing websites without code", "primaryCta": {"text": "Get Started", "url": "#"}, "backgroundType": "solid", "backgroundValue": "#1a1a2e"}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "subheadline", "type": "richtext", "label": "Subheadline"}, {"path": "primaryCta.text", "type": "text", "label": "Primary Button Text"}, {"path": "primaryCta.url", "type": "url", "label": "Primary Button URL"}]'
  ),

  ('hero-split', 'hero', 'Split Hero', 'A split hero with content on left and image on right',
   '{"headline": "string", "subheadline": "string", "primaryCta": {"text": "string", "url": "string"}, "image": {"src": "string", "alt": "string"}}',
   '{"headline": "Transform Your Business", "subheadline": "Powerful tools for modern teams", "primaryCta": {"text": "Learn More", "url": "#"}, "image": {"src": "/placeholder.jpg", "alt": "Hero image"}}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "subheadline", "type": "richtext", "label": "Subheadline"}, {"path": "image.src", "type": "image", "label": "Image"}]'
  ),

  -- Features Components
  ('features-grid', 'features', 'Features Grid', 'A grid of feature cards with icons',
   '{"headline": "string", "subheadline": "string", "features": [{"title": "string", "description": "string", "icon": "string"}]}',
   '{"headline": "Our Features", "subheadline": "Everything you need to succeed", "features": [{"title": "Feature 1", "description": "Description of feature 1", "icon": "star"}]}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "features", "type": "array", "label": "Features", "itemFields": [{"path": "title", "type": "text"}, {"path": "description", "type": "richtext"}, {"path": "icon", "type": "icon"}]}]'
  ),

  -- Testimonials Components
  ('testimonials-carousel', 'testimonials', 'Testimonials Carousel', 'A carousel of customer testimonials',
   '{"headline": "string", "testimonials": [{"quote": "string", "author": "string", "role": "string", "company": "string", "avatar": "string"}]}',
   '{"headline": "What Our Clients Say", "testimonials": [{"quote": "Amazing service!", "author": "John Doe", "role": "CEO", "company": "Acme Inc", "avatar": ""}]}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "testimonials", "type": "array", "label": "Testimonials"}]'
  ),

  -- Contact Components
  ('contact-split', 'contact', 'Split Contact', 'Contact form with info section',
   '{"headline": "string", "subheadline": "string", "email": "string", "phone": "string", "address": "string"}',
   '{"headline": "Get In Touch", "subheadline": "We d love to hear from you", "email": "hello@example.com", "phone": "(555) 123-4567", "address": "123 Main St, City, ST 12345"}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "email", "type": "email", "label": "Email"}, {"path": "phone", "type": "text", "label": "Phone"}]'
  ),

  -- Footer Components
  ('footer-simple', 'footer', 'Simple Footer', 'A simple footer with links and copyright',
   '{"companyName": "string", "links": [{"text": "string", "url": "string"}], "copyright": "string"}',
   '{"companyName": "Your Company", "links": [{"text": "Privacy", "url": "/privacy"}, {"text": "Terms", "url": "/terms"}], "copyright": "2024 All rights reserved"}',
   '[{"path": "companyName", "type": "text", "label": "Company Name"}, {"path": "copyright", "type": "text", "label": "Copyright Text"}]'
  ),

  -- Navigation Components
  ('navigation-simple', 'navigation', 'Simple Navigation', 'A simple navigation bar with logo and links',
   '{"logo": {"text": "string", "url": "string"}, "links": [{"text": "string", "url": "string"}], "cta": {"text": "string", "url": "string"}}',
   '{"logo": {"text": "Your Brand", "url": "/"}, "links": [{"text": "Home", "url": "/"}, {"text": "About", "url": "/about"}], "cta": {"text": "Contact", "url": "/contact"}}',
   '[{"path": "logo.text", "type": "text", "label": "Logo Text"}, {"path": "links", "type": "array", "label": "Nav Links"}]'
  ),

  -- Stats Components
  ('stats-simple', 'stats', 'Simple Stats', 'A row of statistics with numbers and labels',
   '{"stats": [{"value": "string", "label": "string"}]}',
   '{"stats": [{"value": "100+", "label": "Clients"}, {"value": "50+", "label": "Projects"}, {"value": "10+", "label": "Years"}]}',
   '[{"path": "stats", "type": "array", "label": "Statistics", "itemFields": [{"path": "value", "type": "text"}, {"path": "label", "type": "text"}]}]'
  ),

  -- Team Components
  ('team-grid', 'team', 'Team Grid', 'A grid of team member cards',
   '{"headline": "string", "members": [{"name": "string", "role": "string", "bio": "string", "image": "string"}]}',
   '{"headline": "Our Team", "members": [{"name": "Jane Smith", "role": "CEO", "bio": "Passionate leader", "image": ""}]}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "members", "type": "array", "label": "Team Members"}]'
  ),

  -- CTA Components
  ('cta-centered', 'cta', 'Centered CTA', 'A centered call-to-action section',
   '{"headline": "string", "subheadline": "string", "primaryCta": {"text": "string", "url": "string"}, "secondaryCta": {"text": "string", "url": "string"}}',
   '{"headline": "Ready to Get Started?", "subheadline": "Join thousands of satisfied customers", "primaryCta": {"text": "Start Free Trial", "url": "#"}}',
   '[{"path": "headline", "type": "text", "label": "Headline"}, {"path": "primaryCta.text", "type": "text", "label": "Button Text"}]'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Seed Default Theme
-- ============================================
INSERT INTO themes (id, organization_id, name, slug, is_public, colors, typography)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Professional Blue',
  'professional-blue',
  true,
  '{
    "primary": {"50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8", "800": "#1e40af", "900": "#1e3a8a"},
    "secondary": {"50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0", "300": "#cbd5e1", "400": "#94a3b8", "500": "#64748b", "600": "#475569", "700": "#334155", "800": "#1e293b", "900": "#0f172a"},
    "accent": {"500": "#f97316", "600": "#ea580c"},
    "background": "#ffffff",
    "foreground": "#0f172a",
    "muted": "#f1f5f9",
    "mutedForeground": "#64748b"
  }',
  '{
    "fontFamily": {"heading": "Inter, system-ui, sans-serif", "body": "Inter, system-ui, sans-serif", "mono": "JetBrains Mono, monospace"},
    "fontSize": {"xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem", "xl": "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem"}
  }'
)
ON CONFLICT DO NOTHING;
