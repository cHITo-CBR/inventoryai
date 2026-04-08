-- PostgreSQL Schema for FlowStock Inventory System (Supabase)
-- Auto-generated conversion from MySQL

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

INSERT INTO roles (id, name) VALUES (1, 'admin') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES (2, 'supervisor') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES (3, 'salesman') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES (4, 'buyer') ON CONFLICT DO NOTHING;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT true,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Packaging Types
CREATE TABLE IF NOT EXISTS packaging_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT REFERENCES product_categories(id),
  brand_id INT REFERENCES brands(id),
  total_packaging VARCHAR(100),
  net_weight VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  unit_price DECIMAL(10,2) DEFAULT 0.00,
  packaging_id INT REFERENCES packaging_types(id),
  unit_id INT REFERENCES units(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_variant_sku ON product_variants(sku);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(50),
  address TEXT,
  assigned_salesman_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Store Visits
CREATE TABLE IF NOT EXISTS store_visits (
  id SERIAL PRIMARY KEY,
  salesman_id UUID NOT NULL REFERENCES users(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  visit_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Callsheets
CREATE TABLE IF NOT EXISTS callsheets (
  id SERIAL PRIMARY KEY,
  salesman_id UUID NOT NULL REFERENCES users(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  status TEXT CHECK (status IN ('submitted', 'approved', 'rejected', 'cancelled')) DEFAULT 'submitted',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Callsheet Items
CREATE TABLE IF NOT EXISTS callsheet_items (
  id SERIAL PRIMARY KEY,
  callsheet_id INT NOT NULL REFERENCES callsheets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  current_stock INT DEFAULT 0,
  order_quantity INT DEFAULT 0
);

-- Buyer Requests
CREATE TABLE IF NOT EXISTS buyer_requests (
  id SERIAL PRIMARY KEY,
  salesman_id UUID REFERENCES users(id),
  customer_id INT REFERENCES customers(id),
  status TEXT CHECK (status IN ('pending', 'processed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Buyer Request Items
CREATE TABLE IF NOT EXISTS buyer_request_items (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL
);

-- Sales Transactions
CREATE TABLE IF NOT EXISTS sales_transactions (
  id SERIAL PRIMARY KEY,
  salesman_id UUID NOT NULL REFERENCES users(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Ledger
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id SERIAL PRIMARY KEY,
  product_variant_id UUID NOT NULL REFERENCES product_variants(id),
  transaction_type VARCHAR(50),
  quantity INT NOT NULL,
  balance INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
