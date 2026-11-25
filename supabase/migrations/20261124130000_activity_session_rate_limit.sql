-- Durable, server-only fixed-window limit for anonymous activity-session issuance.
create table if not exists public.activity_session_rate_limits (
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (subject_hash, window_started_at)
);

alter table public.activity_session_rate_limits enable row level security;
alter table public.activity_session_rate_limits force row level security;
revoke all on public.activity_session_rate_limits from public, anon, authenticated;

create or replace function public.consume_activity_session_rate_limit(
  p_subject_hash text,
  p_limit integer default 10
) returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  if p_subject_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid_rate_limit_request' using errcode = '22023';
  end if;

  insert into public.activity_session_rate_limits(subject_hash, window_started_at, request_count)
  values (p_subject_hash, v_window, 1)
  on conflict (subject_hash, window_started_at) do update
    set request_count = public.activity_session_rate_limits.request_count + 1
    where public.activity_session_rate_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.consume_activity_session_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_activity_session_rate_limit(text, integer) to service_role;
