create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  amount numeric
);
-- no RLS, no policy: any authenticated role reads all tenants' invoices
