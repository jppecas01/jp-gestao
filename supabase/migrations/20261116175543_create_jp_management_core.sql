/*
# Create JP management core

1. New Tables
- `companies`: the two pre-registered JP companies and their contact details.
- `customers`: customer and vehicle records used by budgets.
- `inventory_items`: unified parts and body-shop supplies catalog with stock and prices.
- `budgets`: budget headers, vehicle details, status, payment, and totals.
- `budget_items`: line items attached to each budget.
- `work_orders`: approved budgets represented in the workshop patio.
- `finance_entries`: receivables generated from approved work orders.

2. Seed data
- Inserts JP Garagens and JP Autoparts using stable slugs.
- Inserts representative customers and inventory items for a usable first load.
- Inserts two representative budgets for the dashboard and list.

3. Security
- Enables RLS on every table.
- Grants CRUD access to anon and authenticated because this is a single-tenant internal workspace without sign-in.
- Uses four explicit CRUD policies per table and intentionally shared policies for the workspace.

4. Important notes
- Budget and stock values are numeric and stored in Brazilian-real-friendly precision.
- Approved budgets can be connected to work orders and finance entries by the application.
- No existing data is removed or altered.
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  legal_name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  address text,
  phone text,
  email text,
  contact text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_plate text,
  vehicle_year text,
  vehicle_km integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Peças',
  unit text NOT NULL DEFAULT 'un',
  stock numeric(12,2) NOT NULL DEFAULT 0,
  minimum_stock numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'Em aberto',
  budget_date date NOT NULL DEFAULT current_date,
  valid_until date,
  vehicle_brand text,
  vehicle_model text,
  vehicle_plate text,
  vehicle_year text,
  vehicle_km integer,
  description text,
  payment_method text,
  execution_deadline text,
  delivery_terms text,
  notes text,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'R$',
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'un',
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid UNIQUE REFERENCES budgets(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  code text UNIQUE NOT NULL,
  stage text NOT NULL DEFAULT 'Aguardando entrada',
  entry_date date,
  exit_date date,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  entry_type text NOT NULL DEFAULT 'Receita',
  status text NOT NULL DEFAULT 'Pendente',
  due_date date NOT NULL DEFAULT current_date,
  paid_date date,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON companies, customers, inventory_items, budgets, budget_items, work_orders, finance_entries TO anon, authenticated;

DROP POLICY IF EXISTS "workspace_select_companies" ON companies;
CREATE POLICY "workspace_select_companies" ON companies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_companies" ON companies;
CREATE POLICY "workspace_insert_companies" ON companies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_companies" ON companies;
CREATE POLICY "workspace_update_companies" ON companies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_companies" ON companies;
CREATE POLICY "workspace_delete_companies" ON companies FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_customers" ON customers;
CREATE POLICY "workspace_select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_customers" ON customers;
CREATE POLICY "workspace_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_customers" ON customers;
CREATE POLICY "workspace_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_customers" ON customers;
CREATE POLICY "workspace_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_inventory" ON inventory_items;
CREATE POLICY "workspace_select_inventory" ON inventory_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_inventory" ON inventory_items;
CREATE POLICY "workspace_insert_inventory" ON inventory_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_inventory" ON inventory_items;
CREATE POLICY "workspace_update_inventory" ON inventory_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_inventory" ON inventory_items;
CREATE POLICY "workspace_delete_inventory" ON inventory_items FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_budgets" ON budgets;
CREATE POLICY "workspace_select_budgets" ON budgets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_budgets" ON budgets;
CREATE POLICY "workspace_insert_budgets" ON budgets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_budgets" ON budgets;
CREATE POLICY "workspace_update_budgets" ON budgets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_budgets" ON budgets;
CREATE POLICY "workspace_delete_budgets" ON budgets FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_budget_items" ON budget_items;
CREATE POLICY "workspace_select_budget_items" ON budget_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_budget_items" ON budget_items;
CREATE POLICY "workspace_insert_budget_items" ON budget_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_budget_items" ON budget_items;
CREATE POLICY "workspace_update_budget_items" ON budget_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_budget_items" ON budget_items;
CREATE POLICY "workspace_delete_budget_items" ON budget_items FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_work_orders" ON work_orders;
CREATE POLICY "workspace_select_work_orders" ON work_orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_work_orders" ON work_orders;
CREATE POLICY "workspace_insert_work_orders" ON work_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_work_orders" ON work_orders;
CREATE POLICY "workspace_update_work_orders" ON work_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_work_orders" ON work_orders;
CREATE POLICY "workspace_delete_work_orders" ON work_orders FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_select_finance" ON finance_entries;
CREATE POLICY "workspace_select_finance" ON finance_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_finance" ON finance_entries;
CREATE POLICY "workspace_insert_finance" ON finance_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_finance" ON finance_entries;
CREATE POLICY "workspace_update_finance" ON finance_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_finance" ON finance_entries;
CREATE POLICY "workspace_delete_finance" ON finance_entries FOR DELETE TO anon, authenticated USING (true);

INSERT INTO companies (slug, name, legal_name, address, phone, email)
VALUES
  ('garagens', 'JP Garagens', 'JP Garagens Ltda', 'Rua Cel. Astolfo Araujo Filho, nº 08, Bairro Leblon/SP - CEP: 04474-410', '(11) 943 962 980', 'jpgaragens@gmail.com'),
  ('autoparts', 'JP Autoparts', 'JP Autoparts - Peças e Acessórios para Linha Leve e Pesada', 'Rua Cel Astolfo Araújo Filho, nº 08 - B. Praia do Leblon- SP- CEP: 04474-410', '(11) 94396-2980', 'jpgaragens@gmail.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO customers (name, document, phone, email, vehicle_brand, vehicle_model, vehicle_plate, vehicle_year, vehicle_km)
SELECT 'Conecta Empreendimentos LTDA', '12.345.678/0001-90', '(11) 4063-6700', 'frota@conecta.com.br', 'Volkswagen', 'Constellation', 'STC8D43', '2022', 68500
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = 'Conecta Empreendimentos LTDA');

INSERT INTO inventory_items (company_id, name, category, unit, stock, minimum_stock, cost, sale_price)
SELECT c.id, x.name, x.category, x.unit, x.stock, x.minimum_stock, x.cost, x.sale_price
FROM companies c
CROSS JOIN (VALUES
  ('Parachoque dianteiro', 'Peças', 'un', 8::numeric, 2::numeric, 780::numeric, 1200::numeric),
  ('Capô Volkswagen', 'Peças', 'un', 3::numeric, 2::numeric, 850::numeric, 1300::numeric),
  ('Tinta PU Branco', 'Funilaria e pintura', 'L', 18::numeric, 5::numeric, 96::numeric, 180::numeric),
  ('Primer anticorrosivo', 'Funilaria e pintura', 'L', 4::numeric, 3::numeric, 72::numeric, 140::numeric),
  ('Filtro de óleo', 'Peças', 'un', 24::numeric, 8::numeric, 22::numeric, 49.9::numeric)
) AS x(name, category, unit, stock, minimum_stock, cost, sale_price)
WHERE c.slug = CASE WHEN x.category = 'Peças' THEN 'autoparts' ELSE 'garagens' END
AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = x.name);

INSERT INTO budgets (company_id, customer_id, code, status, budget_date, valid_until, vehicle_brand, vehicle_model, vehicle_plate, vehicle_year, vehicle_km, description, payment_method, total)
SELECT c.id, cu.id, 'OR.0003', 'Em aberto', current_date - 12, current_date + 18, cu.vehicle_brand, cu.vehicle_model, cu.vehicle_plate, cu.vehicle_year, cu.vehicle_km, 'Recuperação e alinhamento - Sinistro', 'Pix', 3900
FROM companies c, customers cu
WHERE c.slug = 'garagens' AND cu.name = 'Conecta Empreendimentos LTDA'
AND NOT EXISTS (SELECT 1 FROM budgets WHERE code = 'OR.0003');

INSERT INTO budgets (company_id, customer_id, code, status, budget_date, valid_until, vehicle_brand, vehicle_model, vehicle_plate, vehicle_year, vehicle_km, description, payment_method, total)
SELECT c.id, cu.id, 'OR.0002', 'Aceito', current_date - 24, current_date + 6, 'Volkswagen', 'Constellation', 'STC8D43', '2022', 68500, 'Revisão de carroceria e pintura', 'Transferência', 5750
FROM companies c, customers cu
WHERE c.slug = 'garagens' AND cu.name = 'Conecta Empreendimentos LTDA'
AND NOT EXISTS (SELECT 1 FROM budgets WHERE code = 'OR.0002');

CREATE INDEX IF NOT EXISTS budgets_status_idx ON budgets(status);
CREATE INDEX IF NOT EXISTS budgets_company_idx ON budgets(company_id);
CREATE INDEX IF NOT EXISTS inventory_company_idx ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS work_orders_stage_idx ON work_orders(stage);
CREATE INDEX IF NOT EXISTS finance_status_idx ON finance_entries(status);