-- NONPRODUCTION ONLY: short lifecycle window for server-deadline proof.
do $$
declare v_book_id uuid;
begin
  select id into v_book_id from public.books order by created_at asc limit 1;
  if v_book_id is null then raise exception 'activity_fixture_requires_existing_dev_book'; end if;
  perform public.register_activity_version_for_dev(
    '50000000-0000-4000-8000-000000000005', v_book_id, 'active',
    now() - interval '1 minute', now() + interval '45 seconds');
end $$;
