-- ============================================
-- PHASE 2: END-USER AUTH + DATA COLLECTIONS
-- ============================================

-- Site Users (end users of published sites)
CREATE TABLE IF NOT EXISTS site_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, email)
);

-- Site Roles (custom roles per site)
CREATE TABLE IF NOT EXISTS site_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, name)
);

-- Site User Roles (many-to-many)
CREATE TABLE IF NOT EXISTS site_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_user_id UUID NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  site_role_id UUID NOT NULL REFERENCES site_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_user_id, site_role_id)
);

-- Site Sessions (for end-user auth)
CREATE TABLE IF NOT EXISTS site_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_user_id UUID NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Collections (like Airtable bases/tables)
CREATE TABLE IF NOT EXISTS data_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Database',
  color TEXT DEFAULT '#3b82f6',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Collection Fields (schema definition)
CREATE TABLE IF NOT EXISTS collection_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES data_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'text', 'longtext', 'number', 'currency', 'percent',
    'date', 'datetime', 'boolean', 'select', 'multiselect',
    'email', 'url', 'phone', 'file', 'image', 'relation',
    'formula', 'rollup', 'lookup', 'autonumber', 'json'
  )),
  config JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  default_value JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, slug)
);

-- Collection Records (the actual data)
CREATE TABLE IF NOT EXISTS collection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES data_collections(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES site_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES site_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collection Views (saved views/filters)
CREATE TABLE IF NOT EXISTS collection_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES data_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grid', 'kanban', 'calendar', 'gallery', 'list')),
  config JSONB DEFAULT '{}',
  filters JSONB DEFAULT '[]',
  sorts JSONB DEFAULT '[]',
  hidden_fields TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PHASE 3: FORMS + WORKFLOWS
-- ============================================

-- Forms
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{
    "submitButtonText": "Submit",
    "successMessage": "Thank you for your submission!",
    "redirectUrl": null,
    "notifyEmails": [],
    "captchaEnabled": false,
    "honeypotEnabled": true,
    "doubleOptIn": false
  }',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Form Fields
CREATE TABLE IF NOT EXISTS form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'text', 'email', 'phone', 'number', 'textarea',
    'select', 'multiselect', 'radio', 'checkbox', 'toggle',
    'date', 'time', 'datetime', 'file', 'signature',
    'rating', 'scale', 'hidden', 'heading', 'paragraph', 'divider'
  )),
  label TEXT NOT NULL,
  placeholder TEXT,
  help_text TEXT,
  config JSONB DEFAULT '{}',
  validation JSONB DEFAULT '{}',
  conditional_logic JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(form_id, slug)
);

-- Form Submissions
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  site_user_id UUID REFERENCES site_users(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived', 'spam')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflows (automations)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'form_submit', 'record_create', 'record_update', 'record_delete',
    'user_signup', 'user_login', 'order_placed', 'payment_received',
    'schedule', 'webhook', 'manual'
  )),
  trigger_config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Steps (actions in sequence)
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_email', 'send_sms', 'send_webhook',
    'create_record', 'update_record', 'delete_record',
    'add_tag', 'remove_tag', 'assign_role',
    'delay', 'condition', 'loop',
    'create_task', 'send_notification'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  parent_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
  branch TEXT CHECK (branch IN ('true', 'false', 'loop'))
);

-- Workflow Runs (execution log)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  step_results JSONB DEFAULT '[]'
);

-- ============================================
-- PHASE 4: E-COMMERCE + PAYMENTS
-- ============================================

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  images JSONB DEFAULT '[]',
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  sku TEXT,
  barcode TEXT,
  track_inventory BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 0,
  allow_backorder BOOLEAN DEFAULT false,
  weight DECIMAL(10,3),
  weight_unit TEXT DEFAULT 'lb',
  requires_shipping BOOLEAN DEFAULT true,
  is_digital BOOLEAN DEFAULT false,
  digital_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  metadata JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Product Category Links (many-to-many)
CREATE TABLE IF NOT EXISTS product_category_links (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  quantity INTEGER DEFAULT 0,
  options JSONB DEFAULT '{}',
  image_url TEXT,
  weight DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers (extends site_users for e-commerce)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  site_user_id UUID REFERENCES site_users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, email)
);

-- Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'shipping' CHECK (type IN ('billing', 'shipping')),
  is_default BOOLEAN DEFAULT false,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Discount Codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),
  value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  max_uses_per_customer INTEGER DEFAULT 1,
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'categories')),
  applies_to_ids UUID[] DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, code)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered',
    'cancelled', 'refunded', 'partially_refunded'
  )),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'authorized', 'paid', 'partially_paid', 'refunded', 'voided', 'failed'
  )),
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN (
    'unfulfilled', 'partially_fulfilled', 'fulfilled'
  )),
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(12,2) NOT NULL,
  discount_total DECIMAL(12,2) DEFAULT 0,
  shipping_total DECIMAL(12,2) DEFAULT 0,
  tax_total DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
  billing_address JSONB,
  shipping_address JSONB,
  shipping_method JSONB,
  notes TEXT,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, order_number)
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  properties JSONB DEFAULT '{}',
  fulfilled_quantity INTEGER DEFAULT 0
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'
  )),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_payment_id TEXT,
  provider_data JSONB DEFAULT '{}',
  error_message TEXT,
  refunded_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe Connect Accounts (for site owners to receive payments)
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shipping Zones
CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  countries TEXT[] DEFAULT '{}',
  states TEXT[] DEFAULT '{}',
  postal_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shipping Rates
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flat', 'weight', 'price', 'free')),
  price DECIMAL(10,2),
  min_weight DECIMAL(10,3),
  max_weight DECIMAL(10,3),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  conditions JSONB DEFAULT '{}'
);

-- ============================================
-- PHASE 5: WHITE-LABEL + AGENCY
-- ============================================

-- Enhance organizations table (if not exists from phase 1)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'organizations') THEN
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#3b82f6',
      secondary_color TEXT DEFAULT '#64748b',
      custom_domain TEXT UNIQUE,
      settings JSONB DEFAULT '{}',
      billing_email TEXT,
      owner_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Add organization columns to sites if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'organization_id') THEN
    ALTER TABLE sites ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Organization Members (if not exists from phase 1)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'organization_members') THEN
    CREATE TABLE organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
      permissions JSONB DEFAULT '[]',
      invited_at TIMESTAMPTZ DEFAULT now(),
      joined_at TIMESTAMPTZ,
      UNIQUE(organization_id, user_id)
    );
  END IF;
END $$;

-- Organization Invites
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Site Templates (for agency template marketplace)
CREATE TABLE IF NOT EXISTS site_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  pages JSONB NOT NULL DEFAULT '[]',
  theme_id UUID REFERENCES themes(id),
  is_public BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  installs_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization Billing
CREATE TABLE IF NOT EXISTS organization_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  sites_limit INTEGER DEFAULT 1,
  members_limit INTEGER DEFAULT 1,
  storage_limit_gb INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN (
    'page_views', 'api_requests', 'storage_bytes', 'bandwidth_bytes',
    'form_submissions', 'email_sends', 'workflow_runs'
  )),
  value BIGINT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Site Users
CREATE INDEX IF NOT EXISTS idx_site_users_site_id ON site_users(site_id);
CREATE INDEX IF NOT EXISTS idx_site_users_email ON site_users(site_id, email);

-- Data Collections
CREATE INDEX IF NOT EXISTS idx_data_collections_site_id ON data_collections(site_id);
CREATE INDEX IF NOT EXISTS idx_collection_records_collection_id ON collection_records(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_records_created_at ON collection_records(collection_id, created_at DESC);

-- Forms
CREATE INDEX IF NOT EXISTS idx_forms_site_id ON forms(site_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(form_id, created_at DESC);

-- Workflows
CREATE INDEX IF NOT EXISTS idx_workflows_site_id ON workflows(site_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_site_id ON products(site_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(site_id, status);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_site_id ON orders(site_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(site_id, created_at DESC);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_organization_id ON sites(organization_id);

-- Usage
CREATE INDEX IF NOT EXISTS idx_usage_records_org_period ON usage_records(organization_id, period_start, period_end);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE site_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Site Users: Site owners can manage their site's users
CREATE POLICY "Site owners manage site users"
  ON site_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_users.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Data Collections: Site owners can manage their collections
CREATE POLICY "Site owners manage collections"
  ON data_collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = data_collections.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Collection Records: Site owners can manage records
CREATE POLICY "Site owners manage records"
  ON collection_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM data_collections dc
      JOIN sites s ON s.id = dc.site_id
      WHERE dc.id = collection_records.collection_id
      AND s.user_id = auth.uid()
    )
  );

-- Forms: Site owners can manage forms
CREATE POLICY "Site owners manage forms"
  ON forms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = forms.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Products: Site owners can manage products
CREATE POLICY "Site owners manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = products.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Orders: Site owners can view orders
CREATE POLICY "Site owners view orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = orders.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number(site_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  order_count INTEGER;
  site_prefix TEXT;
BEGIN
  -- Get site slug for prefix
  SELECT LEFT(UPPER(slug), 3) INTO site_prefix FROM sites WHERE id = site_uuid;

  -- Count existing orders
  SELECT COUNT(*) + 1 INTO order_count FROM orders WHERE site_id = site_uuid;

  -- Return formatted order number
  RETURN site_prefix || '-' || LPAD(order_count::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Update customer stats on order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'site_users', 'data_collections', 'forms', 'workflows',
    'products', 'orders', 'customers', 'payments',
    'organizations', 'organization_billing'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_updated_at ON %I;
      CREATE TRIGGER trigger_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END $$;
