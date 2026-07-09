-- Migration 0002: findings (with tier-integrity CHECK), rules/corpus, fleet, evidence.
-- The findings CHECK constraint makes Constitution Principle II a database invariant:
--   verified  ⇒ reproduction present  AND confidence null
--   research  ⇒ confidence present    AND reproduction null

create type finding_tier as enum ('verified', 'research');
create type finding_severity as enum ('critical', 'high', 'medium', 'low');
create type finding_status as enum ('open', 'fixed', 'disputed', 'suppressed');
create type class_status as enum ('research', 'corpus_ready', 'active', 'demoted');
create type dispute_resolution as enum ('pending', 'accepted_fp', 'rejected');
create type fleet_posture as enum ('unscanned', 'passing', 'findings_open', 'critical');

create table findings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  scan_id uuid not null references scans(id) on delete cascade,
  fingerprint text not null,
  tier finding_tier not null,
  class_id text not null,
  severity finding_severity not null,
  locations jsonb not null,
  surfaces text[] not null,
  reproduction jsonb,
  confidence numeric(4,3),
  explanation text not null,
  status finding_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint tier_integrity check (
    (tier = 'verified' and reproduction is not null and confidence is null)
    or
    (tier = 'research' and confidence is not null and reproduction is null)
  ),
  constraint confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);
create index findings_scan_idx on findings(scan_id);
create unique index findings_fingerprint_idx on findings(scan_id, fingerprint);

create table suggested_fixes (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references findings(id) on delete cascade,
  kind text not null check (kind in ('diff', 'agent_guidance')),
  content jsonb not null,
  delivered_via text check (delivered_via in ('pr_comment', 'ide', 'agent_loop'))
);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references findings(id) on delete cascade,
  user_id uuid not null references users(id),
  reason text,
  resolution dispute_resolution not null default 'pending',
  created_at timestamptz not null default now()
);

create table vulnerability_classes (
  id text primary key,
  tier_target finding_tier not null,
  definition text not null,
  taxonomy_refs jsonb not null default '[]',
  status class_status not null default 'research',
  corpus_case_count int not null default 0
);

create table rules (
  id text primary key,
  class_id text not null references vulnerability_classes(id),
  ruleset_version_introduced text not null,
  default_ruleset boolean not null default false,
  measured_tp_rate numeric,
  measured_fp_rate numeric,
  measured_against_corpus text
);

create table benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  corpus_version text not null,
  tool text not null,
  results jsonb not null,
  published_at timestamptz
);

create table fleet_servers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  endpoint_or_repo text not null,
  last_scan_id uuid references scans(id),
  posture fleet_posture not null default 'unscanned',
  config_hash text
);

create table evidence_exports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  scan_id uuid not null references scans(id),
  platform text not null check (platform in ('vanta', 'drata')),
  control_map_version text not null,
  items jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed'))
);

create table questionnaire_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source_format text not null check (source_format in ('csv', 'xlsx', 'sig_lite')),
  answers jsonb not null,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'exported'))
);

create table runner_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  token_hash text not null,
  min_ruleset_version text not null,
  revoked_at timestamptz
);

alter table findings enable row level security;
create policy org_isolation_findings on findings
  using (org_id = current_setting('app.org_id', true)::uuid);
