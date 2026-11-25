-- Do not impose a per-file limit in the application bucket. Platform/project
-- quotas still apply and are enforced by Supabase.
update storage.buckets
set file_size_limit = null
where id = 'public-media';

create policy "active admins delete own media"
  on public.published_media for delete to authenticated
  using (owner_admin_id = auth.uid() and exists (
    select 1 from public.admin_profiles where id = auth.uid() and access_status = 'active'
  ));

create policy "active admins delete own media files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);
