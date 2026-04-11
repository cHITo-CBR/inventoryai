-- ============================================================
-- FlowStock Inventory System — Full PostgreSQL / Supabase Schema
-- Paste this ENTIRE file into the Supabase SQL Editor and run.
-- ============================================================

-- ── 1. ROLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (id, name) VALUES (1, 'admin')    ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES (2, 'supervisor') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES (3, 'salesman')  ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES (4, 'buyer')     ON CONFLICT DO NOTHING;

-- ── 2. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT true,
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. PRODUCT CATEGORIES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. BRANDS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. UNITS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. PACKAGING TYPES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS packaging_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  items_per_case INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. PRODUCTS (flattened — no separate variants-based model) ─
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  category_id INT REFERENCES product_categories(id),
  brand_id INT REFERENCES brands(id),
  packaging_id INT REFERENCES packaging_types(id),
  total_cases INT DEFAULT 0,
  items_per_case INT DEFAULT 1,
  packaging_price DECIMAL(10,2) DEFAULT 0.00,
  total_packaging VARCHAR(100),
  net_weight VARCHAR(50),
  sku VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. PRODUCT VARIANTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  packaging_id INT REFERENCES packaging_types(id),
  unit_id INT REFERENCES units(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_variant_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variant_product ON product_variants(product_id);

-- ── 9. CUSTOMERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  phone_number VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  assigned_salesman_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. STORE VISITS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID NOT NULL REFERENCES users(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. STORE VISIT SKUS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_visit_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES store_visits(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. CALLSHEETS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS callsheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID NOT NULL REFERENCES users(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  visit_date TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. CALLSHEET ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS callsheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  callsheet_id UUID NOT NULL REFERENCES callsheets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. BUYER REQUESTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'processed', 'cancelled', 'fulfilled', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. BUYER REQUEST ITEMS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  notes TEXT
);

-- ── 16. SALES TRANSACTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID NOT NULL REFERENCES users(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. SALES TRANSACTION ITEMS ─────────────────────────────
CREATE TABLE IF NOT EXISTS sales_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0
);

-- ── 18. INVENTORY MOVEMENT TYPES ────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movement_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  direction TEXT CHECK (direction IN ('in', 'out')) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO inventory_movement_types (name, direction) VALUES ('Stock In', 'in') ON CONFLICT DO NOTHING;
INSERT INTO inventory_movement_types (name, direction) VALUES ('Stock Out', 'out') ON CONFLICT DO NOTHING;
INSERT INTO inventory_movement_types (name, direction) VALUES ('Adjustment In', 'in') ON CONFLICT DO NOTHING;
INSERT INTO inventory_movement_types (name, direction) VALUES ('Adjustment Out', 'out') ON CONFLICT DO NOTHING;

-- ── 19. INVENTORY LEDGER ────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  product_variant_id UUID REFERENCES product_variants(id),
  movement_type_id INT REFERENCES inventory_movement_types(id),
  transaction_type VARCHAR(50),
  quantity INT NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  notes TEXT,
  description TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 20. NOTIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 21. SALESMAN QUOTAS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS salesman_quotas (
  id SERIAL PRIMARY KEY,
  salesman_id UUID NOT NULL REFERENCES users(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  target_amount DECIMAL(15,2),
  target_units INT,
  target_orders INT,
  achieved_amount DECIMAL(15,2) DEFAULT 0,
  achieved_units INT DEFAULT 0,
  achieved_orders INT DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'ongoing', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salesman_id, month, year)
);

-- ── 22. SYSTEM SETTINGS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 23. AUDIT LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  ip_address VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 24. PRODUCT FAVORITES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS product_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ── 25. QUOTA REPORT VIEW ───────────────────────────────────
CREATE OR REPLACE VIEW quota_report_view AS
SELECT
  sq.id,
  sq.salesman_id,
  u.full_name AS salesman_name,
  u.email AS salesman_email,
  sq.month,
  sq.year,
  TO_CHAR(MAKE_DATE(sq.year, sq.month, 1), 'Month') AS month_name,
  sq.target_amount,
  sq.target_units,
  sq.target_orders,
  sq.achieved_amount,
  sq.achieved_units,
  sq.achieved_orders,
  CASE WHEN sq.target_amount > 0 THEN ROUND((sq.achieved_amount / sq.target_amount) * 100, 1) ELSE NULL END AS amount_percentage,
  CASE WHEN sq.target_units > 0 THEN ROUND((sq.achieved_units::DECIMAL / sq.target_units) * 100, 1) ELSE NULL END AS units_percentage,
  CASE WHEN sq.target_orders > 0 THEN ROUND((sq.achieved_orders::DECIMAL / sq.target_orders) * 100, 1) ELSE NULL END AS orders_percentage,
  sq.status,
  sq.created_at,
  sq.updated_at
FROM salesman_quotas sq
JOIN users u ON sq.salesman_id = u.id;

-- ── 26. UPDATED_AT TRIGGER FUNCTION ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on tables that have updated_at
CREATE OR REPLACE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_callsheets_updated_at BEFORE UPDATE ON callsheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_buyer_requests_updated_at BEFORE UPDATE ON buyer_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_sales_transactions_updated_at BEFORE UPDATE ON sales_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_salesman_quotas_updated_at BEFORE UPDATE ON salesman_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 27. ROW LEVEL SECURITY ──────────────────────────────────
-- Disable RLS on all tables for now (your app uses server-side auth via JWT cookies)
-- This allows the service role / anon key to read/write freely.
-- You can enable RLS later when you move to Supabase Auth.

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_visit_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE callsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE callsheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated and anon (since we manage auth ourselves)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'roles', 'users', 'product_categories', 'brands', 'units',
      'packaging_types', 'products', 'product_variants', 'customers',
      'store_visits', 'store_visit_skus', 'callsheets', 'callsheet_items',
      'buyer_requests', 'buyer_request_items', 'sales_transactions',
      'sales_transaction_items', 'inventory_movement_types', 'inventory_ledger',
      'notifications', 'salesman_quotas', 'system_settings', 'audit_logs',
      'product_favorites'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow full access" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ── DONE ────────────────────────────────────────────────────
-- Admin Seed User (admin@flowstock.com / admin123)
INSERT INTO users (id, full_name, email, password_hash, role_id, status, is_active)
VALUES (
  gen_random_uuid(),
  'System Admin',
  'admin@flowstock.com',
  '$2b$10$wSebDdUsNzgzuwyqMBIbz.pPwRgeq.DyO.EA08YpJAcpZY7Shnnei',
  1,
  'approved',
  true
) ON CONFLICT (email) DO NOTHING;
