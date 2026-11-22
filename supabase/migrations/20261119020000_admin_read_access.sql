-- Flipbook Studio — admin read access NONPRODUCTION
-- PREPARED, NOT EXECUTED. Requires separate execution approval.
-- Scope: authenticated active admin may read only its own private profile/book draft graph.
-- No browser write policy. Profile provisioning remains a trusted-server operation.

begin;

create policy "admin_profiles_read_self_active"
on public.admin_profiles
for select
to authenticated
using (
  id = (select auth.uid())
  and access_status = 'active'
);

create policy "books_read_owned_by_active_admin"
on public.books
for select
to authenticated
using (
  owner_admin_id = (select auth.uid())
  and exists (
    select 1
    from public.admin_profiles profile
    where profile.id = (select auth.uid())
      and profile.access_status = 'active'
  )
);

create policy "book_drafts_read_owned_book"
on public.book_drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.books book
    where book.id = book_drafts.book_id
      and book.owner_admin_id = (select auth.uid())
  )
);

create policy "draft_nodes_read_owned_draft"
on public.draft_nodes
for select
to authenticated
using (
  exists (
    select 1
    from public.book_drafts draft
    join public.books book on book.id = draft.book_id
    where draft.id = draft_nodes.draft_id
      and book.owner_admin_id = (select auth.uid())
  )
);

create policy "draft_components_read_owned_draft"
on public.draft_components
for select
to authenticated
using (
  exists (
    select 1
    from public.book_drafts draft
    join public.books book on book.id = draft.book_id
    where draft.id = draft_components.draft_id
      and book.owner_admin_id = (select auth.uid())
  )
);

-- Audit data stays server/operational-only in this phase.
-- Deliberately no policy on public.audit_events.

grant select on table public.admin_profiles, public.books, public.book_drafts,
  public.draft_nodes, public.draft_components to authenticated;

commit;
