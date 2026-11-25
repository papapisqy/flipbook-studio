create or replace function public.admin_unpublish_flipbook(p_actor_admin_id uuid, p_slug text)
returns void language plpgsql security definer set search_path=public,private as $$
begin
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid_publication' using errcode='22023'; end if;
  if not exists (select 1 from public.admin_profiles where id=p_actor_admin_id and access_status='active') then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.published_flipbooks where slug=p_slug and owner_admin_id=p_actor_admin_id;
  if not found then raise exception 'publication_not_found' using errcode='P0002'; end if;
  update public.activity_definitions set status='closed', updated_at=now()
    where public_slug=p_slug and owner_admin_id=p_actor_admin_id and status='published';
end;
$$;

revoke all on function public.admin_unpublish_flipbook(uuid,text) from public, anon, authenticated;
grant execute on function public.admin_unpublish_flipbook(uuid,text) to service_role;
