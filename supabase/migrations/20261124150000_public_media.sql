insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-media', 'public-media', true, 52428800, array['video/mp4','video/webm','audio/mpeg','audio/wav'])
on conflict (id) do update set public=true, file_size_limit=52428800,
  allowed_mime_types=array['video/mp4','video/webm','audio/mpeg','audio/wav'];

create table if not exists public.published_media (
  id uuid primary key,
  owner_admin_id uuid not null references public.admin_profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  media_type text not null check (media_type in ('video','audio')),
  public_url text not null,
  created_at timestamptz not null default now()
);
alter table public.published_media enable row level security;
alter table public.published_media force row level security;
grant select (id,title,media_type,public_url,created_at) on public.published_media to anon, authenticated;
create policy "public media readable" on public.published_media for select using (true);
create policy "active admins create media" on public.published_media for insert to authenticated
  with check (owner_admin_id=auth.uid() and exists (select 1 from public.admin_profiles where id=auth.uid() and access_status='active'));

create policy "active admins upload media" on storage.objects for insert to authenticated
  with check (bucket_id='public-media' and exists (select 1 from public.admin_profiles where id=auth.uid() and access_status='active'));
