-- Flipbook Studio: nonproduction draft page/component persistence extension.
-- Target: flipbook-studio-dev only; no publication, Storage, or student data.
begin;

alter table public.draft_nodes
  add column if not exists content jsonb not null default '{}'::jsonb;

create index if not exists draft_nodes_draft_position_idx
  on public.draft_nodes (draft_id, position)
  where archived_at is null;

create index if not exists draft_components_node_position_idx
  on public.draft_components (node_id, position);

create or replace function public.admin_list_draft_structure(
  p_actor_admin_id uuid,
  p_book_id uuid
)
returns table (node_id uuid, parent_node_id uuid, node_kind text, "position" integer, content jsonb, component_id uuid, component_type text, component_position integer, configuration jsonb)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select n.id, n.parent_node_id, n.node_kind, n.position, n.content,
         c.id, c.component_type, c.position, c.configuration
  from public.draft_nodes n
  join public.book_drafts d on d.id = n.draft_id
  join public.books b on b.id = d.book_id
  left join public.draft_components c on c.node_id = n.id
  where b.id = p_book_id and b.owner_admin_id = p_actor_admin_id
    and b.draft_status = 'draft' and n.archived_at is null
  order by n.position, c.position;
$$;

create or replace function public.admin_upsert_draft_page(
  p_actor_admin_id uuid,
  p_book_id uuid,
  p_page_id uuid,
  p_expected_revision bigint,
  p_position integer,
  p_content jsonb,
  p_correlation_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_next bigint; v_draft uuid;
begin
  if p_actor_admin_id is null or p_book_id is null or p_page_id is null or p_expected_revision is null or p_position < 0 or p_correlation_id is null or jsonb_typeof(p_content) <> 'object' then raise exception 'invalid_request' using errcode='22023'; end if;
  select d.id into v_draft from public.book_drafts d join public.books b on b.id=d.book_id join public.admin_profiles a on a.id=b.owner_admin_id where b.id=p_book_id and b.owner_admin_id=p_actor_admin_id and b.draft_status='draft' and a.access_status='active' and d.revision=p_expected_revision;
  if v_draft is null then raise exception 'stale_or_forbidden' using errcode='P0001'; end if;
  update public.books set current_revision=current_revision+1, updated_at=now() where id=p_book_id and current_revision=p_expected_revision returning current_revision into v_next;
  if v_next is null then raise exception 'stale_or_forbidden' using errcode='P0001'; end if;
  update public.book_drafts set revision=v_next, updated_at=now() where id=v_draft;
  if exists (select 1 from public.draft_nodes where id=p_page_id and draft_id<>v_draft) then
    raise exception 'forbidden_page' using errcode='42501';
  end if;
  insert into public.draft_nodes(id,draft_id,node_kind,position,content) values(p_page_id,v_draft,'page',p_position,p_content)
    on conflict (id) do update set position=excluded.position, content=excluded.content, archived_at=null, updated_at=now();
  insert into public.audit_events(id,actor_admin_id,domain,action,outcome,subject_type,subject_id,correlation_id,safe_metadata) values(p_correlation_id,p_actor_admin_id,'book','upsert_page','accepted','page',p_page_id,p_correlation_id,jsonb_build_object('revision',v_next));
  return v_next;
end; $$;

create or replace function public.admin_archive_draft_page(
  p_actor_admin_id uuid, p_book_id uuid, p_page_id uuid, p_expected_revision bigint, p_correlation_id uuid
) returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_next bigint; v_draft uuid;
begin
  select d.id into v_draft from public.book_drafts d join public.books b on b.id=d.book_id join public.admin_profiles a on a.id=b.owner_admin_id where b.id=p_book_id and b.owner_admin_id=p_actor_admin_id and b.draft_status='draft' and a.access_status='active' and d.revision=p_expected_revision;
  if v_draft is null then raise exception 'stale_or_forbidden' using errcode='P0001'; end if;
  update public.books set current_revision=current_revision+1,updated_at=now() where id=p_book_id and current_revision=p_expected_revision returning current_revision into v_next;
  if v_next is null then raise exception 'stale_or_forbidden' using errcode='P0001'; end if;
  update public.book_drafts set revision=v_next,updated_at=now() where id=v_draft;
  update public.draft_nodes set archived_at=now(),updated_at=now() where id=p_page_id and draft_id=v_draft;
  insert into public.audit_events(id,actor_admin_id,domain,action,outcome,subject_type,subject_id,correlation_id,safe_metadata) values(p_correlation_id,p_actor_admin_id,'book','archive_page','accepted','page',p_page_id,p_correlation_id,jsonb_build_object('revision',v_next));
  return v_next;
end; $$;

create or replace function public.admin_upsert_draft_component(
  p_actor_admin_id uuid, p_book_id uuid, p_component_id uuid, p_page_id uuid,
  p_expected_revision bigint, p_position integer, p_component_type text,
  p_configuration jsonb, p_correlation_id uuid
) returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_next bigint; v_draft uuid;
begin
  if p_actor_admin_id is null or p_book_id is null or p_component_id is null or p_page_id is null
     or p_expected_revision is null or p_position < 0 or p_correlation_id is null
     or p_component_type is null or length(trim(p_component_type))=0
     or jsonb_typeof(p_configuration) <> 'object' then raise exception 'invalid_request' using errcode='22023'; end if;
  select d.id into v_draft from public.book_drafts d join public.books b on b.id=d.book_id join public.admin_profiles a on a.id=b.owner_admin_id
    where b.id=p_book_id and b.owner_admin_id=p_actor_admin_id and b.draft_status='draft' and a.access_status='active' and d.revision=p_expected_revision;
  if v_draft is null or not exists (select 1 from public.draft_nodes where id=p_page_id and draft_id=v_draft and node_kind='page' and archived_at is null) then raise exception 'stale_or_forbidden' using errcode='P0001'; end if;
  if exists (select 1 from public.draft_components where id=p_component_id and draft_id<>v_draft) then raise exception 'forbidden_component' using errcode='42501'; end if;
  update public.books set current_revision=current_revision+1,updated_at=now() where id=p_book_id and current_revision=p_expected_revision returning current_revision into v_next;
  if v_next is null then raise exception 'stale_or_forbidden' using errcode='P0001'; end if;
  update public.book_drafts set revision=v_next,updated_at=now() where id=v_draft;
  insert into public.draft_components(id,draft_id,node_id,component_type,position,configuration) values(p_component_id,v_draft,p_page_id,trim(p_component_type),p_position,p_configuration)
    on conflict (id) do update set node_id=excluded.node_id,component_type=excluded.component_type,position=excluded.position,configuration=excluded.configuration,updated_at=now();
  insert into public.audit_events(id,actor_admin_id,domain,action,outcome,subject_type,subject_id,correlation_id,safe_metadata) values(p_correlation_id,p_actor_admin_id,'book','upsert_component','accepted','component',p_component_id,p_correlation_id,jsonb_build_object('revision',v_next));
  return v_next;
end; $$;

revoke all on function public.admin_list_draft_structure(uuid,uuid) from public, anon, authenticated;
revoke all on function public.admin_upsert_draft_page(uuid,uuid,uuid,bigint,integer,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.admin_archive_draft_page(uuid,uuid,uuid,bigint,uuid) from public, anon, authenticated;
grant execute on function public.admin_list_draft_structure(uuid,uuid) to service_role;
grant execute on function public.admin_upsert_draft_page(uuid,uuid,uuid,bigint,integer,jsonb,uuid) to service_role;
grant execute on function public.admin_archive_draft_page(uuid,uuid,uuid,bigint,uuid) to service_role;
revoke all on function public.admin_upsert_draft_component(uuid,uuid,uuid,uuid,bigint,integer,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.admin_upsert_draft_component(uuid,uuid,uuid,uuid,bigint,integer,text,jsonb,uuid) to service_role;
commit;
