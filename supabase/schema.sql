-- 账号仓 (Account Vault) — cloud sync schema
-- Run this once in the Supabase project's SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

create table if not exists public.folders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id text,
  name text not null,
  icon text,
  color text,
  sort_order integer not null default 0,
  is_common boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.tags (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  group_key text default 'custom',
  sort_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  folder_id text,
  status text not null default 'normal',
  url text,
  base_url text,
  username text,
  password_encrypted text,
  api_key_encrypted text,
  license_key_encrypted text,
  note text,
  expire_at timestamptz,
  price_info text,
  platform_name text,
  project_name text,
  environment_name text,
  environment_type text,
  is_favorite boolean not null default false,
  is_common boolean not null default false,
  is_high_risk boolean not null default false,
  is_production boolean not null default false,
  is_verified boolean not null default false,
  is_paid boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_used_at timestamptz,
  deleted_at timestamptz,
  archived_at timestamptz,
  source text default 'manual',
  sync_status text default 'local',
  version integer not null default 1,
  -- Full snapshot of this record's tag associations, replacing record_tags
  -- (which has no timestamp of its own and is fully rewritten on every
  -- local save, so it is never synced as an independent table).
  tag_ids text[] not null default '{}'
);

create table if not exists public.custom_fields (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  name text not null,
  field_key text,
  field_type text not null,
  value text,
  encrypted_value text,
  is_sensitive boolean not null default false,
  is_searchable boolean not null default true,
  is_copyable boolean not null default true,
  is_visible_in_list boolean not null default false,
  is_exportable boolean not null default true,
  group_name text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.environment_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  entry_name text not null,
  entry_type text,
  url text not null,
  role text,
  username text,
  password_encrypted text,
  verification_note text,
  login_steps text,
  note text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  is_high_risk boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.record_models (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  model_name text not null,
  model_type text,
  is_default boolean not null default false,
  is_favorite boolean not null default false,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists public.api_key_groups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  group_name text,
  api_key_encrypted text,
  balance text,
  models_json text,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

-- Incremental pull query is always "WHERE user_id = ? AND updated_at > ?"
create index if not exists folders_user_updated_idx on public.folders (user_id, updated_at);
create index if not exists tags_user_updated_idx on public.tags (user_id, updated_at);
create index if not exists records_user_updated_idx on public.records (user_id, updated_at);
create index if not exists custom_fields_user_updated_idx on public.custom_fields (user_id, updated_at);
create index if not exists environment_entries_user_updated_idx on public.environment_entries (user_id, updated_at);
create index if not exists record_models_user_updated_idx on public.record_models (user_id, updated_at);
create index if not exists api_key_groups_user_updated_idx on public.api_key_groups (user_id, updated_at);

-- Row Level Security: every table is only visible/writable by its owner.
alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.records enable row level security;
alter table public.custom_fields enable row level security;
alter table public.environment_entries enable row level security;
alter table public.record_models enable row level security;
alter table public.api_key_groups enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['folders', 'tags', 'records', 'custom_fields', 'environment_entries', 'record_models', 'api_key_groups']
  loop
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);

    execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;
