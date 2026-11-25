-- A logged-in administrator can still open a public QR link in the same
-- browser. Public snapshots are intentionally readable to both anon and
-- authenticated roles, while all mutation remains server-only.
grant select (slug, title, snapshot, published_at, updated_at) on public.published_flipbooks to authenticated;

create policy "published flipbooks are readable by signed-in readers"
  on public.published_flipbooks for select to authenticated using (true);
