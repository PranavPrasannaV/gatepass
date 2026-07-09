-- reports table created without row-level security enabled (tenant isolation gap).
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  body text
);

-- NOTE: no `alter table reports enable row level security;`
-- NOTE: no per-tenant policy. Any authenticated role can read every row.
