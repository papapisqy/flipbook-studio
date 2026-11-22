-- NONPRODUCTION PREPARATION ONLY. Do not apply without separate deployment approval.
-- Scope: anonymous student activity sessions for SCN-06D3-027.

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.activity_attempts(id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.activity_sessions enable row level security;
alter table public.activity_sessions force row level security;
alter table public.activity_attempts force row level security;
alter table public.attempt_answers force row level security;
alter table public.attempt_results force row level security;
alter table public.activity_submit_idempotency force row level security;
alter table public.activity_submit_audit_events force row level security;
revoke all on public.activity_sessions from anon, authenticated;
revoke all on public.activity_sessions from public;

-- Atomic server-only creation of an attempt and its anonymous session.
create or replace function public.start_activity_session(
  p_activity_version_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_deadline_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public, private
as $$
declare
  v_attempt_id uuid := gen_random_uuid();
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now()
     or p_deadline_at <= now() or p_expires_at > p_deadline_at then
    raise exception using errcode = '22023', message = 'invalid_session_contract';
  end if;
  -- Publication/lifecycle validation must be added when the activity-version
  -- registry is available; this foundation migration does not invent one.
  insert into public.activity_attempts
    (id, activity_version_id, session_token_hash, deadline_at, status)
    values (v_attempt_id, p_activity_version_id, p_token_hash, p_deadline_at, 'active');
  insert into public.activity_sessions (attempt_id, token_hash, expires_at)
    values (v_attempt_id, p_token_hash, p_expires_at);
  return jsonb_build_object('attempt_id', v_attempt_id, 'expires_at', p_expires_at);
end;
$$;

revoke all on function public.start_activity_session(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.start_activity_session(uuid, text, timestamptz, timestamptz)
  to service_role;

-- Replace the submit contract so revocation/expiry is checked server-side.
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
declare v_attempt public.activity_attempts; v_session public.activity_sessions;
declare v_existing public.activity_submit_idempotency; v_outcome jsonb;
begin
  select * into v_attempt from public.activity_attempts where id=p_attempt_id for update;
  select * into v_session from public.activity_sessions where attempt_id=p_attempt_id;
  if v_attempt.id is null or v_session.id is null
     or v_attempt.session_token_hash <> p_session_token_hash
     or v_session.token_hash <> p_session_token_hash
     or v_attempt.activity_version_id <> p_activity_version_id
     or v_session.revoked_at is not null or now() > v_session.expires_at then
    raise exception using errcode='28000', message='unauthorized';
  end if;
  select * into v_existing from public.activity_submit_idempotency
    where attempt_id=p_attempt_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.request_fingerprint <> p_request_fingerprint then
      raise exception using errcode='22023', message='idempotency_mismatch';
    end if;
    return v_existing.outcome;
  end if;
  if v_attempt.status <> 'active' or now() > v_attempt.deadline_at then
    raise exception using errcode='22023', message='attempt_not_accepting';
  end if;
  insert into public.attempt_answers (id, attempt_id, payload) values (gen_random_uuid(), p_attempt_id, p_payload);
  update public.activity_attempts set status='finalized', finalized_at=now() where id=p_attempt_id;
  insert into public.attempt_results (attempt_id, activity_version_id, result_payload)
    values (p_attempt_id, p_activity_version_id, jsonb_build_object('status','accepted'));
  v_outcome := jsonb_build_object('status','accepted','attempt_id',p_attempt_id);
  insert into public.activity_submit_idempotency values (p_attempt_id,p_idempotency_key,p_request_fingerprint,v_outcome);
  return v_outcome;
end;
$$;

revoke all on function public.student_submit_activity(uuid,text,uuid,jsonb,uuid,text)
  from public, anon, authenticated;
grant execute on function public.student_submit_activity(uuid,text,uuid,jsonb,uuid,text) to service_role;
