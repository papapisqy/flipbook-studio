-- Bersihkan data pengujian yang dibuat oleh alur foundation lama.
-- Aman untuk dijalankan berulang kali: hanya judul berawalan "Buku uji".
-- Jalankan setelah memverifikasi bahwa tidak ada e-modul produksi memakai pola judul ini.

begin;

delete from public.activity_version_lifecycle
where book_id in (
  select id from public.books where title ilike 'Buku uji%'
);

delete from public.draft_components
where draft_id in (
  select bd.id
  from public.book_drafts bd
  join public.books b on b.id = bd.book_id
  where b.title ilike 'Buku uji%'
);

delete from public.draft_nodes
where draft_id in (
  select bd.id
  from public.book_drafts bd
  join public.books b on b.id = bd.book_id
  where b.title ilike 'Buku uji%'
);

delete from public.book_drafts
where book_id in (
  select id from public.books where title ilike 'Buku uji%'
);

delete from public.books
where title ilike 'Buku uji%';

commit;
