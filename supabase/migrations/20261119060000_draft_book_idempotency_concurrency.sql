-- Flipbook Studio — explicit idempotency concurrency hardening (NONPRODUCTION)
-- Requires audit and separate dev execution.

begin;

create or replace function public.admin_create_book_with_draft_idempotent(
  p_actor_admin_id uuid, p_book_id uuid, p_draft_id uuid, p_title text,
  p_idempotency_key uuid, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_fingerprint text; v_existing public.operation_idempotency%rowtype; v_response jsonb;
begin
  if p_actor_admin_id is null or p_book_id is null or p_draft_id is null or p_idempotency_key is null or p_correlation_id is null or nullif(btrim(p_title), '') is null then raise exception 'invalid request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor_admin_id::text || ':' || p_idempotency_key::text, 0));
  if not exists (select 1 from public.admin_profiles where id=p_actor_admin_id and access_status='active') then raise exception 'actor is not an active application admin' using errcode='42501'; end if;
  v_fingerprint := md5(jsonb_build_object('operation','create','book_id',p_book_id,'draft_id',p_draft_id,'title',btrim(p_title))::text);
  select * into v_existing from public.operation_idempotency where actor_admin_id=p_actor_admin_id and id=p_idempotency_key and operation='create';
  if found then if v_existing.request_fingerprint <> v_fingerprint then raise exception 'idempotency key payload mismatch' using errcode='22023'; end if; return v_existing.response; end if;
  insert into public.operation_idempotency(id,actor_admin_id,operation,request_fingerprint,response) values(p_idempotency_key,p_actor_admin_id,'create',v_fingerprint,'{}'::jsonb);
  insert into public.books(id,owner_admin_id,title) values(p_book_id,p_actor_admin_id,btrim(p_title));
  insert into public.book_drafts(id,book_id,revision,draft_metadata) values(p_draft_id,p_book_id,0,'{}'::jsonb);
  insert into public.audit_events(id,actor_admin_id,domain,action,outcome,subject_type,subject_id,correlation_id,safe_metadata) values(p_correlation_id,p_actor_admin_id,'book','create_draft','accepted','book',p_book_id,p_correlation_id,jsonb_build_object('operation','create_book_with_draft'));
  v_response := jsonb_build_object('status','created','bookId',p_book_id,'draftId',p_draft_id,'revision',0);
  update public.operation_idempotency set response=v_response where actor_admin_id=p_actor_admin_id and id=p_idempotency_key and operation='create';
  return v_response;
end; $$;

create or replace function public.admin_update_book_draft_metadata_cas_idempotent(
  p_actor_admin_id uuid, p_book_id uuid, p_expected_revision bigint, p_title text,
  p_draft_metadata jsonb, p_idempotency_key uuid, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_fingerprint text; v_existing public.operation_idempotency%rowtype; v_next_revision bigint; v_response jsonb;
begin
  if p_actor_admin_id is null or p_book_id is null or p_expected_revision is null or p_idempotency_key is null or p_correlation_id is null or p_expected_revision < 0 or nullif(btrim(p_title),'') is null or p_draft_metadata is null or jsonb_typeof(p_draft_metadata) <> 'object' then raise exception 'invalid request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor_admin_id::text || ':' || p_idempotency_key::text, 0));
  v_fingerprint := md5(jsonb_build_object('operation','update_metadata','book_id',p_book_id,'expected_revision',p_expected_revision,'title',btrim(p_title),'draft_metadata',p_draft_metadata)::text);
  select * into v_existing from public.operation_idempotency where actor_admin_id=p_actor_admin_id and id=p_idempotency_key and operation='update_metadata';
  if found then if v_existing.request_fingerprint <> v_fingerprint then raise exception 'idempotency key payload mismatch' using errcode='22023'; end if; return v_existing.response; end if;
  insert into public.operation_idempotency(id,actor_admin_id,operation,request_fingerprint,response) values(p_idempotency_key,p_actor_admin_id,'update_metadata',v_fingerprint,'{}'::jsonb);
  update public.books set title=btrim(p_title),current_revision=current_revision+1,updated_at=now() where id=p_book_id and owner_admin_id=p_actor_admin_id and current_revision=p_expected_revision and draft_status='draft' and exists(select 1 from public.admin_profiles where id=p_actor_admin_id and access_status='active') returning current_revision into v_next_revision;
  if not found then raise exception 'book update rejected' using errcode='P0001'; end if;
  update public.book_drafts set revision=v_next_revision,draft_metadata=p_draft_metadata,updated_at=now() where book_id=p_book_id and revision=p_expected_revision;
  if not found then raise exception 'draft revision anchor missing or stale' using errcode='P0001'; end if;
  insert into public.audit_events(id,actor_admin_id,domain,action,outcome,subject_type,subject_id,correlation_id,safe_metadata) values(p_correlation_id,p_actor_admin_id,'book','update_draft_metadata','accepted','book',p_book_id,p_correlation_id,jsonb_build_object('operation','cas_update','revision',v_next_revision));
  v_response := jsonb_build_object('status','updated','bookId',p_book_id,'revision',v_next_revision);
  update public.operation_idempotency set response=v_response where actor_admin_id=p_actor_admin_id and id=p_idempotency_key and operation='update_metadata';
  return v_response;
end; $$;

create or replace function public.admin_archive_book_cas_idempotent(
  p_actor_admin_id uuid, p_book_id uuid, p_expected_revision bigint,
  p_idempotency_key uuid, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_fingerprint text; v_existing public.operation_idempotency%rowtype; v_next_revision bigint; v_response jsonb;
begin
  if p_actor_admin_id is null or p_book_id is null or p_expected_revision is null or p_idempotency_key is null or p_correlation_id is null or p_expected_revision < 0 then raise exception 'invalid request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor_admin_id::text || ':' || p_idempotency_key::text, 0));
  v_fingerprint := md5(jsonb_build_object('operation','archive','book_id',p_book_id,'expected_revision',p_expected_revision)::text);
  select * into v_existing from public.operation_idempotency where actor_admin_id=p_actor_admin_id and id=p_idempotency_key and operation='archive';
  if found then if v_existing.request_fingerprint <> v_fingerprint then raise exception 'idempotency key payload mismatch' using errcode='22023'; end if; return v_existing.response; end if;
  insert into public.operation_idempotency(id,actor_admin_id,operation,request_fingerprint,response) values(p_idempotency_key,p_actor_admin_id,'archive',v_fingerprint,'{}'::jsonb);
  update public.books set draft_status='archived',current_revision=current_revision+1,updated_at=now() where id=p_book_id and owner_admin_id=p_actor_admin_id and current_revision=p_expected_revision and draft_status='draft' and exists(select 1 from public.admin_profiles where id=p_actor_admin_id and access_status='active') returning current_revision into v_next_revision;
  if not found then raise exception 'book archive rejected' using errcode='P0001'; end if;
  update public.book_drafts set revision=v_next_revision,updated_at=now() where book_id=p_book_id and revision=p_expected_revision;
  if not found then raise exception 'draft revision anchor missing or stale' using errcode='P0001'; end if;
  insert into public.audit_events(id,actor_admin_id,domain,action,outcome,subject_type,subject_id,correlation_id,safe_metadata) values(p_correlation_id,p_actor_admin_id,'book','archive','accepted','book',p_book_id,p_correlation_id,jsonb_build_object('operation','archive_cas','revision',v_next_revision));
  v_response := jsonb_build_object('status','archived','bookId',p_book_id,'revision',v_next_revision);
  update public.operation_idempotency set response=v_response where actor_admin_id=p_actor_admin_id and id=p_idempotency_key and operation='archive';
  return v_response;
end; $$;

commit;
