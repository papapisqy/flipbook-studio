-- NONPRODUCTION FOUNDATION: audit trail for SCN-06D3-027.
-- No bearer tokens, answer payloads, answer keys, or raw PII are stored.
create table if not exists public.activity_submit_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  correlation_id text not null,
  event_type text not null check (event_type in (
    'request_received', 'request_rejected', 'idempotency_conflict',
    'submit_accepted', 'finalized'
  )),
  server_timestamp_utc timestamptz not null default timezone('utc', now()),
  actor_subject_hash text,
  attempt_id uuid,
  activity_version_id uuid,
  transaction_status text not null check (transaction_status in (
    'not_started', 'committed', 'rolled_back_or_rejected', 'unknown'
  )),
  reason_code text,
  function_version text,
  migration_version text
);

create index if not exists activity_submit_audit_events_request_idx
  on public.activity_submit_audit_events (request_id);
create index if not exists activity_submit_audit_events_attempt_idx
  on public.activity_submit_audit_events (attempt_id, server_timestamp_utc);

alter table public.activity_submit_audit_events enable row level security;
revoke all on public.activity_submit_audit_events from anon, authenticated;
grant select, insert on public.activity_submit_audit_events to service_role;
