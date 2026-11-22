-- Flipbook Studio — server-only book/draft metadata mutations (NONPRODUCTION)
-- PREPARED, NOT EXECUTED. Requires separate execution approval for flipbook-studio-dev.
-- Scope: create a private book+draf atomically; CAS update metadata; archive via lifecycle state.
-- Excluded: browser DML, draft nodes/components, publication, media/Storage, student data, QR,
-- backup/restore, idempotency retention, and hard deletion.

begin;

create or replace function public.admin_create_book_with_draft(
  p_actor_admin_id uuid,
  p_book_id uuid,
  p_draft_id uuid,
  p_title text,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_actor_admin_id is null or p_book_id is null or p_draft_id is null or p_correlation_id is null then
    raise exception 'required identifier missing' using errcode = '22023';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'book title required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.admin_profiles profile
    where profile.id = p_actor_admin_id
      and profile.access_status = 'active'
  ) then
    raise exception 'actor is not an active application admin' using errcode = '42501';
  end if;

  insert into public.books (id, owner_admin_id, title)
  values (p_book_id, p_actor_admin_id, btrim(p_title));

  insert into public.book_drafts (id, book_id, revision, draft_metadata)
  values (p_draft_id, p_book_id, 0, '{}'::jsonb);

  insert into public.audit_events (
    id, actor_admin_id, domain, action, outcome, subject_type, subject_id,
    correlation_id, safe_metadata
  ) values (
    p_correlation_id, p_actor_admin_id, 'book', 'create_draft', 'accepted',
    'book', p_book_id, p_correlation_id,
    jsonb_build_object('operation', 'create_book_with_draft')
  );
end;
$$;

create or replace function public.admin_update_book_draft_metadata_cas(
  p_actor_admin_id uuid,
  p_book_id uuid,
  p_expected_revision bigint,
  p_title text,
  p_draft_metadata jsonb,
  p_correlation_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_next_revision bigint;
begin
  if p_actor_admin_id is null or p_book_id is null or p_expected_revision is null or p_correlation_id is null then
    raise exception 'required identifier missing' using errcode = '22023';
  end if;

  if p_expected_revision < 0 or nullif(btrim(p_title), '') is null then
    raise exception 'invalid revision or title' using errcode = '22023';
  end if;

  if p_draft_metadata is null or jsonb_typeof(p_draft_metadata) <> 'object' then
    raise exception 'draft metadata must be a JSON object' using errcode = '22023';
  end if;

  update public.books book
  set title = btrim(p_title),
      current_revision = book.current_revision + 1,
      updated_at = now()
  where book.id = p_book_id
    and book.owner_admin_id = p_actor_admin_id
    and book.current_revision = p_expected_revision
    and book.draft_status = 'draft'
    and exists (
      select 1 from public.admin_profiles profile
      where profile.id = p_actor_admin_id
        and profile.access_status = 'active'
    )
  returning book.current_revision into v_next_revision;

  if not found then
    raise exception 'book update rejected' using errcode = 'P0001';
  end if;

  update public.book_drafts draft
  set revision = v_next_revision,
      draft_metadata = p_draft_metadata,
      updated_at = now()
  where draft.book_id = p_book_id
    and draft.revision = p_expected_revision;

  if not found then
    raise exception 'draft revision anchor missing or stale' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    id, actor_admin_id, domain, action, outcome, subject_type, subject_id,
    correlation_id, safe_metadata
  ) values (
    p_correlation_id, p_actor_admin_id, 'book', 'update_draft_metadata', 'accepted',
    'book', p_book_id, p_correlation_id,
    jsonb_build_object('operation', 'cas_update', 'revision', v_next_revision)
  );

  return v_next_revision;
end;
$$;

create or replace function public.admin_archive_book_cas(
  p_actor_admin_id uuid,
  p_book_id uuid,
  p_expected_revision bigint,
  p_correlation_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_next_revision bigint;
begin
  if p_actor_admin_id is null or p_book_id is null or p_expected_revision is null or p_correlation_id is null then
    raise exception 'required identifier missing' using errcode = '22023';
  end if;

  update public.books book
  set draft_status = 'archived',
      current_revision = book.current_revision + 1,
      updated_at = now()
  where book.id = p_book_id
    and book.owner_admin_id = p_actor_admin_id
    and book.current_revision = p_expected_revision
    and book.draft_status = 'draft'
    and exists (
      select 1 from public.admin_profiles profile
      where profile.id = p_actor_admin_id
        and profile.access_status = 'active'
    )
  returning book.current_revision into v_next_revision;

  if not found then
    raise exception 'book archive rejected' using errcode = 'P0001';
  end if;

  update public.book_drafts draft
  set revision = v_next_revision,
      updated_at = now()
  where draft.book_id = p_book_id
    and draft.revision = p_expected_revision;

  if not found then
    raise exception 'draft revision anchor missing or stale' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    id, actor_admin_id, domain, action, outcome, subject_type, subject_id,
    correlation_id, safe_metadata
  ) values (
    p_correlation_id, p_actor_admin_id, 'book', 'archive', 'accepted',
    'book', p_book_id, p_correlation_id,
    jsonb_build_object('operation', 'archive_cas', 'revision', v_next_revision)
  );

  return v_next_revision;
end;
$$;

revoke all on function public.admin_create_book_with_draft(uuid, uuid, uuid, text, uuid) from public;
revoke all on function public.admin_update_book_draft_metadata_cas(uuid, uuid, bigint, text, jsonb, uuid) from public;
revoke all on function public.admin_archive_book_cas(uuid, uuid, bigint, uuid) from public;
revoke all on function public.admin_create_book_with_draft(uuid, uuid, uuid, text, uuid) from anon, authenticated;
revoke all on function public.admin_update_book_draft_metadata_cas(uuid, uuid, bigint, text, jsonb, uuid) from anon, authenticated;
revoke all on function public.admin_archive_book_cas(uuid, uuid, bigint, uuid) from anon, authenticated;
grant execute on function public.admin_create_book_with_draft(uuid, uuid, uuid, text, uuid) to service_role;
grant execute on function public.admin_update_book_draft_metadata_cas(uuid, uuid, bigint, text, jsonb, uuid) to service_role;
grant execute on function public.admin_archive_book_cas(uuid, uuid, bigint, uuid) to service_role;

comment on function public.admin_create_book_with_draft(uuid, uuid, uuid, text, uuid) is
  'Nonproduction foundation: server-only atomic private book plus draft creation.';
comment on function public.admin_update_book_draft_metadata_cas(uuid, uuid, bigint, text, jsonb, uuid) is
  'Nonproduction foundation: server-only CAS update for private book and draft metadata.';
comment on function public.admin_archive_book_cas(uuid, uuid, bigint, uuid) is
  'Nonproduction foundation: server-only archive transition; hard delete is intentionally excluded.';

commit;
