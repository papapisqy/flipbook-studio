-- Flipbook Studio — migration foundation NONPRODUCTION
-- Target: flipbook-studio-dev only. PREPARED, NOT EXECUTED.
-- Scope: admin identity profile, books/drafts/structure/components, minimum audit.
-- Explicitly excluded: publication, Storage/media, student activity, QR, backup/restore.
-- Execution requires separate owner approval and target-project verification.

begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text,
  access_status text not null default 'pending'
    check (access_status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key,
  owner_admin_id uuid not null references public.admin_profiles (id) on delete restrict,
  title text not null,
  draft_status text not null default 'draft'
    check (draft_status in ('draft', 'archived')),
  current_revision bigint not null default 0 check (current_revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_drafts (
  id uuid primary key,
  book_id uuid not null unique references public.books (id) on delete restrict,
  revision bigint not null default 0 check (revision >= 0),
  draft_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.draft_nodes (
  id uuid primary key,
  draft_id uuid not null references public.book_drafts (id) on delete restrict,
  parent_node_id uuid,
  node_kind text not null check (node_kind in ('section', 'page')),
  position integer not null check (position >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, draft_id),
  foreign key (parent_node_id, draft_id)
    references public.draft_nodes (id, draft_id)
    on delete restrict
);

create table if not exists public.draft_components (
  id uuid primary key,
  draft_id uuid not null references public.book_drafts (id) on delete restrict,
  node_id uuid not null,
  component_type text not null,
  position integer not null check (position >= 0),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (node_id, draft_id)
    references public.draft_nodes (id, draft_id)
    on delete restrict
);

create table if not exists public.audit_events (
  id uuid primary key,
  actor_admin_id uuid references public.admin_profiles (id) on delete set null,
  domain text not null,
  action text not null,
  outcome text not null check (outcome in ('accepted', 'rejected', 'failed')),
  subject_type text not null,
  subject_id uuid,
  correlation_id uuid,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Foundation access posture: no Data API privileges and no RLS policy grant.
-- A later, separately approved server path/policy may grant the smallest required access.
revoke all on table public.admin_profiles, public.books, public.book_drafts,
  public.draft_nodes, public.draft_components, public.audit_events
  from anon, authenticated;

alter table public.admin_profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_drafts enable row level security;
alter table public.draft_nodes enable row level security;
alter table public.draft_components enable row level security;
alter table public.audit_events enable row level security;

alter table public.admin_profiles force row level security;
alter table public.books force row level security;
alter table public.book_drafts force row level security;
alter table public.draft_nodes force row level security;
alter table public.draft_components force row level security;
alter table public.audit_events force row level security;

comment on schema private is 'Reserved for server-only foundation data; no browser/Data API grant.';
comment on table public.admin_profiles is 'Foundation profile only. No client policy is granted by this migration.';
comment on table public.books is 'Private draft book aggregate. Reader lifecycle fields are intentionally absent.';
comment on table public.book_drafts is 'CAS revision anchor; CAS mutation procedure is intentionally outside this foundation migration.';
comment on table public.draft_nodes is 'Private draft structure; cycle and sibling-order validation remain trusted-server responsibilities.';
comment on table public.draft_components is 'Private draft component configuration; no media or activity dependency is introduced here.';
comment on table public.audit_events is 'Minimum append-only audit shape; write/read paths are reserved for a later approved server design.';

commit;
