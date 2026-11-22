-- NONPRODUCTION PREPARATION ONLY
-- Do not apply until separately approved for flipbook-studio-dev.
-- Scope: SCN-06D3-027 only. No publish, Storage, QR, or backup objects.

create table if not exists public.activity_attempts (
  id uuid primary key,
  activity_version_id uuid not null,
  session_token_hash text not null,
  deadline_at timestamptz not null,
  status text not null check (status in ('active', 'finalized', 'expired', 'revoked')),
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  id uuid primary key,
  attempt_id uuid not null references public.activity_attempts(id),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (attempt_id, id)
);

create table if not exists public.attempt_results (
  attempt_id uuid primary key references public.activity_attempts(id),
  activity_version_id uuid not null,
  result_payload jsonb not null,
  finalized_at timestamptz not null default now()
);

create table if not exists public.activity_submit_idempotency (
  attempt_id uuid not null references public.activity_attempts(id),
  idempotency_key uuid not null,
  request_fingerprint text not null,
  outcome jsonb not null,
  created_at timestamptz not null default now(),
  primary key (attempt_id, idempotency_key)
);

alter table public.activity_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_results enable row level security;
alter table public.activity_submit_idempotency enable row level security;

revoke all on public.activity_attempts, public.attempt_answers, public.attempt_results,
  public.activity_submit_idempotency from anon, authenticated;

-- Server-only transaction boundary. Exact scoring and token policy remain subject to audit.
create or replace function public.student_submit_activity(
  p_attempt_id uuid,
  p_session_token_hash text,
  p_activity_version_id uuid,
  p_payload jsonb,
  p_idempotency_key uuid,
  p_request_fingerprint text
) returns jsonb
language plpgsql security definer set search_path = public, private
as $$
declare
  v_attempt public.activity_attempts;
  v_existing public.activity_submit_idempotency;
  v_outcome jsonb;
begin
  select * into v_attempt from public.activity_attempts
    where id = p_attempt_id for update;
  if not found or v_attempt.session_token_hash <> p_session_token_hash
     or v_attempt.activity_version_id <> p_activity_version_id then
    raise exception using errcode = '28000', message = 'unauthorized';
  end if;

  select * into v_existing from public.activity_submit_idempotency
    where attempt_id = p_attempt_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '22023', message = 'idempotency_mismatch';
    end if;
    return v_existing.outcome;
  end if;

  if v_attempt.status <> 'active' or now() > v_attempt.deadline_at then
    raise exception using errcode = '22023', message = 'attempt_not_accepting';
  end if;

  insert into public.attempt_answers (id, attempt_id, payload)
    values (gen_random_uuid(), p_attempt_id, p_payload);
  update public.activity_attempts set status = 'finalized', finalized_at = now()
    where id = p_attempt_id;
  insert into public.attempt_results (attempt_id, activity_version_id, result_payload)
    values (p_attempt_id, p_activity_version_id, jsonb_build_object('status', 'accepted'));
  v_outcome := jsonb_build_object('status', 'accepted', 'attempt_id', p_attempt_id);
  insert into public.activity_submit_idempotency
    values (p_attempt_id, p_idempotency_key, p_request_fingerprint, v_outcome);
  return v_outcome;
end;
$$;

revoke all on function public.student_submit_activity(uuid, text, uuid, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.student_submit_activity(uuid, text, uuid, jsonb, uuid, text) to service_role;
