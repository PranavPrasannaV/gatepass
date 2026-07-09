create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  amount numeric
);

alter table invoices enable row level security;

create policy tenant_isolation on invoices
  using (tenant_id = auth.uid());
