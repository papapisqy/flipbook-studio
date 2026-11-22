-- NONPRODUCTION PREPARATION ONLY. Development lifecycle registry, not the
-- canonical publish system. Apply only after separate security approval.
create table if not exists public.activity_version_lifecycle (
  activity_version_id uuid primary key,
  book_id uuid not null references public.books(id) on delete restrict,
  access_status text not null default 'inactive' check (access_status in ('inactive','active','revoked')),
  starts_at timestamptz,
  ends_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (access_status <> 'active' or activated_at is not null)
);
alter table public.activity_version_lifecycle enable row level security;
alter table public.activity_version_lifecycle force row level security;
revoke all on public.activity_version_lifecycle from public, anon, authenticated;

create or replace function public.register_activity_version_for_dev(
  p_activity_version_id uuid, p_book_id uuid, p_access_status text default 'inactive',
  p_starts_at timestamptz default null, p_ends_at timestamptz default null
) returns void language plpgsql security definer set search_path=public,private as $$
begin
  if p_access_status not in ('inactive','active','revoked') then raise exception 'invalid_lifecycle_status'; end if;
  insert into public.activity_version_lifecycle(activity_version_id,book_id,access_status,starts_at,ends_at,activated_at,revoked_at)
  values (p_activity_version_id,p_book_id,p_access_status,p_starts_at,p_ends_at,
    case when p_access_status='active' then now() end,
    case when p_access_status='revoked' then now() end)
  on conflict (activity_version_id) do update set book_id=excluded.book_id, access_status=excluded.access_status,
    starts_at=excluded.starts_at, ends_at=excluded.ends_at,
    activated_at=case when excluded.access_status='active' then coalesce(public.activity_version_lifecycle.activated_at,now()) else public.activity_version_lifecycle.activated_at end,
    revoked_at=case when excluded.access_status='revoked' then coalesce(public.activity_version_lifecycle.revoked_at,now()) else null end;
end; $$;
revoke all on function public.register_activity_version_for_dev(uuid,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.register_activity_version_for_dev(uuid,uuid,text,timestamptz,timestamptz) to service_role;

create or replace function public.start_activity_session(
  p_activity_version_id uuid, p_token_hash text, p_expires_at timestamptz, p_deadline_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public,private as $$
declare
  v_attempt_id uuid := gen_random_uuid();
  v_lifecycle public.activity_version_lifecycle;
  v_effective_deadline timestamptz;
  v_effective_expires_at timestamptz;
begin
  select * into v_lifecycle from public.activity_version_lifecycle
    where activity_version_id=p_activity_version_id for share;
  if v_lifecycle.activity_version_id is null or v_lifecycle.access_status <> 'active'
     or (v_lifecycle.starts_at is not null and now() < v_lifecycle.starts_at)
     or (v_lifecycle.ends_at is not null and now() >= v_lifecycle.ends_at)
     or v_lifecycle.revoked_at is not null then raise exception using errcode='28000',message='activity_not_available'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now() or p_deadline_at <= now()
     then raise exception using errcode='22023',message='invalid_session_contract'; end if;

  -- The lifecycle registry is authoritative. The service-provided bound can
  -- shorten a session, but can never extend it beyond the lifecycle end.
  v_effective_deadline := coalesce(least(v_lifecycle.ends_at, p_deadline_at),
                                   v_lifecycle.ends_at, p_deadline_at);
  v_effective_expires_at := least(p_expires_at, v_effective_deadline);
  if v_effective_deadline <= now() or v_effective_expires_at <= now()
     then raise exception using errcode='22023',message='invalid_session_contract'; end if;
  insert into public.activity_attempts(id,activity_version_id,session_token_hash,deadline_at,status)
    values(v_attempt_id,p_activity_version_id,p_token_hash,v_effective_deadline,'active');
  insert into public.activity_sessions(attempt_id,token_hash,expires_at)
    values(v_attempt_id,p_token_hash,v_effective_expires_at);
  return jsonb_build_object('attempt_id',v_attempt_id,'expires_at',v_effective_expires_at);
end; $$;
revoke all on function public.start_activity_session(uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.start_activity_session(uuid,text,timestamptz,timestamptz) to service_role;

-- Submit remains bound to the same trusted lifecycle record. Revocation or an
-- ended access window blocks an already-issued session without trusting the
-- browser to report that lifecycle transition.
create or replace function public.student_submit_activity(
  p_attempt_id uuid,
  p_session_token_hash text,
  p_activity_version_id uuid,
  p_payload jsonb,
  p_idempotency_key uuid,
  p_request_fingerprint text
) returns jsonb language plpgsql security definer set search_path=public,private as $$
declare
  v_attempt public.activity_attempts;
  v_session public.activity_sessions;
  v_lifecycle public.activity_version_lifecycle;
  v_existing public.activity_submit_idempotency;
  v_outcome jsonb;
begin
  select * into v_attempt from public.activity_attempts
    where id=p_attempt_id for update;
  select * into v_session from public.activity_sessions
    where attempt_id=p_attempt_id;
  select * into v_lifecycle from public.activity_version_lifecycle
    where activity_version_id=p_activity_version_id for share;

  if v_attempt.id is null or v_session.id is null or v_lifecycle.activity_version_id is null
     or v_attempt.session_token_hash <> p_session_token_hash
     or v_session.token_hash <> p_session_token_hash
     or v_attempt.activity_version_id <> p_activity_version_id
     or v_lifecycle.access_status <> 'active'
     or (v_lifecycle.starts_at is not null and now() < v_lifecycle.starts_at)
     or (v_lifecycle.ends_at is not null and now() >= v_lifecycle.ends_at)
     or v_lifecycle.revoked_at is not null
     or v_session.revoked_at is not null or now() >= v_session.expires_at then
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

  if v_attempt.status <> 'active' or now() >= v_attempt.deadline_at then
    raise exception using errcode='22023', message='attempt_not_accepting';
  end if;
  insert into public.attempt_answers(id,attempt_id,payload)
    values(gen_random_uuid(),p_attempt_id,p_payload);
  update public.activity_attempts set status='finalized', finalized_at=now()
    where id=p_attempt_id;
  insert into public.attempt_results(attempt_id,activity_version_id,result_payload)
    values(p_attempt_id,p_activity_version_id,jsonb_build_object('status','accepted'));
  v_outcome := jsonb_build_object('status','accepted','attempt_id',p_attempt_id);
  insert into public.activity_submit_idempotency
    values(p_attempt_id,p_idempotency_key,p_request_fingerprint,v_outcome);
  return v_outcome;
end; $$;
revoke all on function public.student_submit_activity(uuid,text,uuid,jsonb,uuid,text)
  from public,anon,authenticated;
grant execute on function public.student_submit_activity(uuid,text,uuid,jsonb,uuid,text)
  to service_role;
