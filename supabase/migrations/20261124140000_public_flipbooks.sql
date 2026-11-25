-- Public, read-only snapshots for QR readers. Draft tables remain private.
create table if not exists public.published_flipbooks (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_admin_id uuid not null references public.admin_profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.published_flipbooks enable row level security;
alter table public.published_flipbooks force row level security;
revoke all on public.published_flipbooks from public, authenticated;
grant select (slug, title, snapshot, published_at, updated_at) on public.published_flipbooks to anon;
create policy "published flipbooks are readable publicly"
  on public.published_flipbooks for select to anon using (true);

create or replace function public.admin_publish_flipbook(
  p_actor_admin_id uuid, p_slug text, p_title text, p_snapshot jsonb
) returns void language plpgsql security definer set search_path=public,private as $$
begin
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_title) not between 1 and 200
    or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'invalid_publication' using errcode='22023'; end if;
  if not exists (select 1 from public.admin_profiles where id=p_actor_admin_id and access_status='active') then
    raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.published_flipbooks(slug,owner_admin_id,title,snapshot)
  values(p_slug,p_actor_admin_id,p_title,p_snapshot)
  on conflict(slug) do update set title=excluded.title,snapshot=excluded.snapshot,updated_at=now()
  where public.published_flipbooks.owner_admin_id=p_actor_admin_id;
  if not found then raise exception 'publication_conflict' using errcode='P0001'; end if;
end; $$;
revoke all on function public.admin_publish_flipbook(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.admin_publish_flipbook(uuid,text,text,jsonb) to service_role;
