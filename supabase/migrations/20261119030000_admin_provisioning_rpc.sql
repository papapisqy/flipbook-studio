-- Flipbook Studio — atomic admin provisioning NONPRODUCTION
-- PREPARED, NOT EXECUTED. Requires separate execution approval.
-- This function is callable only by service_role from a trusted server boundary.

begin;

create or replace function public.admin_provision_profile(
  p_actor_admin_id uuid,
  p_target_admin_id uuid,
  p_display_name text,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if p_actor_admin_id is null or p_target_admin_id is null or p_correlation_id is null then
    raise exception 'required identifier missing' using errcode = '22023';
  end if;

  if p_display_name is not null and char_length(p_display_name) > 120 then
    raise exception 'display name too long' using errcode = '22001';
  end if;

  if not exists (
    select 1 from public.admin_profiles
    where id = p_actor_admin_id and access_status = 'active'
  ) then
    raise exception 'actor is not an active application admin' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users where id = p_target_admin_id) then
    raise exception 'target user does not exist' using errcode = '23503';
  end if;

  if exists (select 1 from public.admin_profiles where id = p_target_admin_id) then
    raise exception 'target profile already exists' using errcode = '23505';
  end if;

  insert into public.admin_profiles (id, display_name, access_status)
  values (p_target_admin_id, nullif(btrim(p_display_name), ''), 'active');

  insert into public.audit_events (
    id, actor_admin_id, domain, action, outcome, subject_type, subject_id,
    correlation_id, safe_metadata
  ) values (
    p_correlation_id, p_actor_admin_id, 'admin', 'provision_profile', 'accepted',
    'admin_profile', p_target_admin_id, p_correlation_id,
    jsonb_build_object('operation', 'admin_provision')
  );
end;
$$;

revoke all on function public.admin_provision_profile(uuid, uuid, text, uuid) from public;
revoke all on function public.admin_provision_profile(uuid, uuid, text, uuid) from anon, authenticated;
grant execute on function public.admin_provision_profile(uuid, uuid, text, uuid) to service_role;

commit;
