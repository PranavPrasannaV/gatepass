-- Migration 0001: tenancy, identity, repositories, scans, audit.
-- All tenant tables carry org_id and enable row-level security (dogfooding Principle II's
-- tenant-isolation class on our own schema).

create extension if not exists "pgcrypto";

create type plan_tier as enum ('free', 'team', 'scale');
create type member_role as enum ('admin', 'member', 'viewer');
create type gate_mode as enum ('off', 'block_verified', 'block_threshold');
create type gate_failure_mode as enum ('fail_open', 'fail_closed');
create type scan_trigger as enum ('push', 'pr', 'manual', 'schedule', 'fleet_change');
create type scan_exec_mode as enum ('hosted', 'runner', 'cli');
create type scan_status as enum ('queued', 'running', 'completed', 'failed', 'timed_out');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_tier plan_tier not null default 'free',
  llm_analysis_enabled boolean not null default true,
  sso_connection_id text,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  github_user_id bigint not null unique,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role member_role not null default 'member',
  primary key (org_id, user_id)
);

create table repositories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  github_repo_id bigint not null unique,
  name text not null,
  frameworks_detected text[] not null default '{}',
  surfaces_present text[] not null default '{}',
  gate_mode gate_mode not null default 'off',
  gate_failure_mode gate_failure_mode not null default 'fail_open',
  agent_loop_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table scans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  repository_id uuid references repositories(id) on delete cascade,
  fleet_server_id uuid,
  trigger scan_trigger not null,
  execution_mode scan_exec_mode not null,
  ruleset_version text not null,
  commit_sha text,
  pr_number int,
  status scan_status not null default 'queued',
  stage_timings jsonb not null default '{}',
  posture_snapshot jsonb,
  created_at timestamptz not null default now(),
  -- exactly one scan subject
  constraint scan_subject check (num_nonnulls(repository_id, fleet_server_id) = 1)
);

create table audit_events (
  seq bigserial primary key,
  org_id uuid references organizations(id) on delete set null,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  subject jsonb not null default '{}'
);

alter table organizations enable row level security;
alter table repositories enable row level security;
alter table scans enable row level security;

create policy org_isolation_repos on repositories
  using (org_id = current_setting('app.org_id', true)::uuid);
create policy org_isolation_scans on scans
  using (org_id = current_setting('app.org_id', true)::uuid);
