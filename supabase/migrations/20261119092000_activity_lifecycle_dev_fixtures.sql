-- NONPRODUCTION ONLY: deterministic lifecycle fixtures for SCN-06D3-027.
-- These rows do not represent canonical publication and must never be copied
-- to production. They deliberately reference an existing synthetic dev book.
do $$
declare
  v_book_id uuid;
begin
  select id into v_book_id
    from public.books
    order by created_at asc
    limit 1;

  if v_book_id is null then
    raise exception 'activity_fixture_requires_existing_dev_book';
  end if;

  perform public.register_activity_version_for_dev(
    '10000000-0000-4000-8000-000000000001', v_book_id, 'active',
    now() - interval '5 minutes', now() + interval '2 hours');
  perform public.register_activity_version_for_dev(
    '20000000-0000-4000-8000-000000000002', v_book_id, 'inactive',
    null, now() + interval '2 hours');
  perform public.register_activity_version_for_dev(
    '30000000-0000-4000-8000-000000000003', v_book_id, 'revoked',
    now() - interval '5 minutes', now() + interval '2 hours');
  perform public.register_activity_version_for_dev(
    '40000000-0000-4000-8000-000000000004', v_book_id, 'active',
    now() - interval '2 hours', now() - interval '1 hour');
end $$;
