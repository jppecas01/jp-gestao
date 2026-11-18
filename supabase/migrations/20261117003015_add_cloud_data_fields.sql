/*
# Add cloud-backed profile fields

1. Modified tables
- `companies`: adds `cnpj` for the legal document and keeps `logo_url` as the cloud-saved logo representation used by printed documents.
- `customers`: adds `observations` for responsible contacts and special conditions.
- `inventory_items`: adds `observations` for original part codes, suppliers, paint brands, and other product notes.

2. Data safety
- Uses conditional column additions only; no existing rows or columns are removed.
- Existing logo, customer, and inventory data remains intact.

3. Security
- Existing single-tenant RLS policies continue to apply.
- Grants are unchanged because these are additions to already exposed tables.

4. Important notes
- The application migrates locally saved company/customer data into these columns on the next load.
- Logos are stored in `companies.logo_url` so the existing document renderer can load them directly from Supabase.
*/

ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS observations text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS observations text;