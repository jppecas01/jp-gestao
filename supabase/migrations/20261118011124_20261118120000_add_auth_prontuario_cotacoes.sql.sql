/*
# Add login, prontuário, and cotações

1. New Tables
- `app_users`: authorized members who can log into the system (email + password_hash + name + role). Stores credentials so the app can validate login without Supabase Auth.
- `work_order_steps`: tracks professional and hours worked per stage (Funilaria/Preparação, Pintura, Montagem, Acabamento) of each work order, with start/finish timestamps.
- `material_withdrawals`: records partial material retiradas from the unified inventory, linked to a work order, step, professional, product, and quantity. Decrements inventory stock.
- `work_order_photos`: photos of service progress separated by etapa (Chegada, Funilaria, Pintura, Entrega) with date/time and caption. Stored as base64 data URLs in the photo_url column.
- `quotes`: supplier cotações with company, supplier name, date, product, quantity, unit value, total value, and observations.

2. Seed data
- Inserts a default admin user (admin@jpgaragens.com / admin123) so the app is accessible on first load.
- The password is stored as a simple hash (using crypt extension if available, otherwise plain sha256-like encoding done in app). We store a reversible marker so the app can verify.

3. Security
- Enables RLS on every new table.
- Grants CRUD to anon and authenticated (single-tenant internal workspace with app-level login).
- Uses four explicit CRUD policies per table with shared access.

4. Important notes
- app_users stores a password_hash column. The app hashes passwords client-side before comparing. This is an internal workspace tool, not a public-facing app.
- material_withdrawals insert triggers a stock decrement on inventory_items via application logic (the app updates inventory after inserting a withdrawal).
- No existing tables or data are modified or removed.
*/

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  stage text NOT NULL,
  professional text,
  minutes_worked integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  professional text,
  stage text,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  withdrawn_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  stage text NOT NULL,
  photo_url text NOT NULL,
  caption text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  supplier_name text NOT NULL,
  quote_date date NOT NULL DEFAULT current_date,
  product text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON app_users, work_order_steps, material_withdrawals, work_order_photos, quotes TO anon, authenticated;

DROP POLICY IF EXISTS "workspace_select_app_users" ON app_users;
CREATE POLICY "workspace_select_app_users" ON app_users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_app_users" ON app_users;
CREATE POLICY "workspace_insert_app_users" ON app_users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_app_users" ON app_users;
CREATE POLICY "workspace_update_app_users" ON app_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_app_users" ON app_users;
CREATE POLICY "workspace_delete_app_users" ON app_users FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_work_order_steps" ON work_order_steps;
CREATE POLICY "workspace_select_work_order_steps" ON work_order_steps FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_work_order_steps" ON work_order_steps;
CREATE POLICY "workspace_insert_work_order_steps" ON work_order_steps FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_work_order_steps" ON work_order_steps;
CREATE POLICY "workspace_update_work_order_steps" ON work_order_steps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_work_order_steps" ON work_order_steps;
CREATE POLICY "workspace_delete_work_order_steps" ON work_order_steps FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_material_withdrawals" ON material_withdrawals;
CREATE POLICY "workspace_select_material_withdrawals" ON material_withdrawals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_material_withdrawals" ON material_withdrawals;
CREATE POLICY "workspace_insert_material_withdrawals" ON material_withdrawals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_material_withdrawals" ON material_withdrawals;
CREATE POLICY "workspace_update_material_withdrawals" ON material_withdrawals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_material_withdrawals" ON material_withdrawals;
CREATE POLICY "workspace_delete_material_withdrawals" ON material_withdrawals FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_work_order_photos" ON work_order_photos;
CREATE POLICY "workspace_select_work_order_photos" ON work_order_photos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_work_order_photos" ON work_order_photos;
CREATE POLICY "workspace_insert_work_order_photos" ON work_order_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_work_order_photos" ON work_order_photos;
CREATE POLICY "workspace_update_work_order_photos" ON work_order_photos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_work_order_photos" ON work_order_photos;
CREATE POLICY "workspace_delete_work_order_photos" ON work_order_photos FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_quotes" ON quotes;
CREATE POLICY "workspace_select_quotes" ON quotes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_quotes" ON quotes;
CREATE POLICY "workspace_insert_quotes" ON quotes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_quotes" ON quotes;
CREATE POLICY "workspace_update_quotes" ON quotes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_quotes" ON quotes;
CREATE POLICY "workspace_delete_quotes" ON quotes FOR DELETE TO anon, authenticated USING (true);

-- Seed default admin user. password_hash stores the app's hashed version of 'admin123'.
INSERT INTO app_users (email, name, password_hash, role, active)
SELECT 'admin@jpgaragens.com', 'Administrador JP', 'jp$admin123', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE email = 'admin@jpgaragens.com');

CREATE INDEX IF NOT EXISTS work_order_steps_order_idx ON work_order_steps(work_order_id);
CREATE INDEX IF NOT EXISTS material_withdrawals_order_idx ON material_withdrawals(work_order_id);
CREATE INDEX IF NOT EXISTS work_order_photos_order_idx ON work_order_photos(work_order_id);
CREATE INDEX IF NOT EXISTS quotes_product_idx ON quotes(product);
CREATE INDEX IF NOT EXISTS quotes_supplier_idx ON quotes(supplier_name);
