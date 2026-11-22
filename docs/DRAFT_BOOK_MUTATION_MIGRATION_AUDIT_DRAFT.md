# AUDIT MIGRASI MUTASI BUKU DAN DRAF — FLIPBOOK STUDIO

**Status:** DRAF — VERTICAL SLICE DASAR TERVERIFIKASI DI NONPRODUKSI  
**Versi:** v0.1.3-draft  
**Target eksekusi terverifikasi:** `flipbook-studio-dev` (nonproduksi)  
**Artefak yang diaudit:** `supabase/migrations/20261119040000_draft_book_mutation_rpc.sql`

## DMMA-01 — Tujuan dan Batas

Migrasi ini menyiapkan tiga kontrak mutasi privat melalui fungsi PostgreSQL `SECURITY DEFINER` yang hanya dapat dieksekusi oleh `service_role` dari batas server tepercaya:

1. Membuat satu buku privat dan satu anchor draf secara atomik.
2. Memperbarui judul dan metadata draf dengan compare-and-swap (CAS) berdasarkan revisi buku.
3. Mengarsipkan buku melalui status lifecycle `archived` dengan CAS.

Browser dengan publishable key tidak memperoleh hak `INSERT`, `UPDATE`, atau `DELETE` baru. Policy baca yang telah berlaku tidak diubah.

## DMMA-02 — Pemeriksaan Scope

| Cakupan | Termasuk | Bukti migrasi |
|---|---|---|
| Buku privat | Ya | `admin_create_book_with_draft`, `admin_update_book_draft_metadata_cas`, `admin_archive_book_cas` |
| Anchor draf/revisi | Ya | `book_drafts.revision` bergerak bersama `books.current_revision` |
| Audit minimum | Ya | satu `audit_events` untuk setiap operasi diterima |
| Browser DML | Tidak | seluruh fungsi direvoke dari `anon` dan `authenticated` |
| Node/komponen | Tidak | tidak ada fungsi atau policy mutasi struktur |
| Publish/media/Storage | Tidak | tidak ada tabel/fungsi lifecycle publikasi atau Storage |
| Aktivitas siswa/QR/backup | Tidak | tidak ada objek terkait |
| Hard delete | Tidak | hanya transisi `draft` ke `archived` |

## DMMA-03 — Kontrak Otorisasi

| Operasi | Pemohon | Pelaksana | Validasi wajib | Hasil bila ditolak |
|---|---|---|---|---|
| Buat buku+draf | admin aktif melalui server | fungsi `service_role` | profil aktif, UUID lengkap, judul tidak kosong | exception; transaksi tidak menciptakan objek parsial |
| Ubah metadata CAS | admin pemilik melalui server | fungsi `service_role` | profil aktif, pemilik, status `draft`, expected revision, metadata objek JSON | exception; tidak ada silent overwrite |
| Arsip CAS | admin pemilik melalui server | fungsi `service_role` | profil aktif, pemilik, status `draft`, expected revision | exception; tidak ada hard delete |

`SECURITY DEFINER` tidak menggantikan pemeriksaan konteks. Edge Function/server caller wajib memverifikasi JWT, `auth.uid`, profil admin aktif, UUID input, dan membuat correlation ID baru sebelum memakai service-role. `service_role` tidak boleh hadir di browser.

## DMMA-04 — Pemeriksaan CAS dan Atomisitas

- Pembaruan buku memakai predicate `current_revision = p_expected_revision`; hanya satu request bersaing dapat menaikkan revisi yang sama.
- Pembaruan `book_drafts` serta audit berada dalam transaksi fungsi yang sama. Kegagalan salah satu statement membatalkan semua perubahan fungsi.
- Jika anchor draf hilang atau stale, fungsi menaikkan exception sehingga kenaikan revisi buku juga dibatalkan.
- Idempotensi retry belum diselesaikan: `correlation_id` dicatat sebagai bukti audit, tetapi belum memiliki constraint unik atau retensi. Hal ini tetap **PENDING EVIDENCE** dan tidak menutup `SCN-06D3-027`.

## DMMA-05 — Pemeriksaan RLS dan Privilege Statis

| Pemeriksaan | Harapan sebelum eksekusi | Status audit statis |
|---|---|---|
| Grant DML ke `anon` | tidak ada | LULUS |
| Grant DML ke `authenticated` | tidak ada | LULUS |
| Execute fungsi untuk browser | tidak ada | LULUS |
| Execute fungsi untuk `service_role` | tepat tiga fungsi | LULUS |
| Policy SELECT lama | tidak diubah | LULUS |
| RLS/FORCE RLS tabel | tidak diubah | LULUS |
| `search_path` fungsi | eksplisit `pg_catalog, public` | LULUS |

## DMMA-06 — Rollback dan Urutan Eksekusi

Migration `20261119040000` telah diterapkan setelah target dashboard dan dry run diverifikasi. Daftar migration remote kemudian mencatat versi lokal dan remote yang sama. Label `production` pada keluaran CLI hanya label environment remote, bukan penggantian nama target nonproduksi.

Rollback konseptual pasca-eksekusi hanya untuk lingkungan dev: revoke execute dari `service_role`, lalu drop ketiga fungsi dengan signature lengkap. Rollback tidak boleh dipakai untuk menghapus buku/draf yang telah dibuat; data uji harus diarsipkan atau dihapus melalui prosedur terpisah yang disetujui.

## DMMA-07 — Bukti yang Wajib Dikumpulkan Setelah Eksekusi

1. Output `supabase db push --dry-run --remote` dan konfirmasi project ref nonproduksi.
2. Daftar migration lokal versus remote sesudah eksekusi.
3. Pemeriksaan privilege fungsi: `anon=false`, `authenticated=false`, `service_role=true`.
4. Uji admin aktif berhasil membuat dan membaca buku sendiri melalui jalur server.
5. Uji expected revision stale ditolak dan revisi/data tidak berubah.
6. Uji akun non-admin serta admin lain ditolak tanpa kebocoran data.
7. Uji arsip tidak menghapus record dan menulis audit minimum.

Pemeriksaan privilege pasca-eksekusi membuktikan: untuk ketiga fungsi, `anon=false`, `authenticated=false`, dan `service_role=true`. RLS dan FORCE RLS tetap aktif pada tabel draf; audit tetap tanpa policy browser. Tujuh GAP dan tiga OPEN tetap **PENDING EVIDENCE** karena belum ada bukti jalur server maupun skenario runtime.

## DMMA-08 — Temuan Residual

- Edge Function/jalur server yang memanggil fungsi belum disiapkan atau dideploy.
- Kontrak struktur node/komponen, validasi antisiklus, urutan sibling, dan metadata per komponen belum dicakup.
- Idempotensi replay berurutan dan konkuren telah dibuktikan terbatas. Kebijakan lifecycle retensi dicatat: record dipertahankan selama replay, audit, recovery, atau rekonsiliasi masih sah; setelah lifecycle selesai menjadi kandidat cleanup server-terotorisasi. Durasi numerik, expiry, cadence, dan pembersihan masih belum memiliki bukti.
- Migration `20261119050000_draft_book_idempotency.sql` serta hardening concurrency `20261119060000_draft_book_idempotency_concurrency.sql` telah diterapkan pada target dev; audit retensi tetap tertunda.
- Tidak ada pembuktian runtime pemanggilan fungsi melalui jalur server atau aplikasi; eksekusi migration dan privilege statis saja belum membuktikan kontrak operasi.

## DMMA-09 — Bukti Eksekusi Nonproduksi

| Pemeriksaan | Hasil | Status |
|---|---|---|
| Target CLI | proyek tertaut bernama `flipbook-studio-dev`; migration dijalankan sekali | TERVERIFIKASI |
| Daftar migration | `20261119010000` sampai `20261119040000` sama antara lokal dan remote | TERVERIFIKASI |
| Privilege fungsi | `anon` dan `authenticated` tidak dapat mengeksekusi; `service_role` dapat mengeksekusi | TERVERIFIKASI |
| RLS buku/draf/struktur | aktif dan dipaksa; satu policy baca lama pada tiap tabel draf | TERVERIFIKASI |
| Audit events browser | RLS aktif/dipaksa tanpa policy browser | TERVERIFIKASI |
| Buat/ubah/arsip melalui Edge Function | satu buku sintetis melewati tiga operasi berurutan | TERVERIFIKASI TERBATAS |
| CAS stale satu admin | dua pembaruan paralel memakai revisi awal sama: satu diterima dan satu ditolak | TERVERIFIKASI TERBATAS |
| Isolasi dua admin | admin kedua membuat buku sendiri; admin pertama tidak melihat buku tersebut pada pembacaan RLS | TERVERIFIKASI TERBATAS |
| Retry idempoten | replay identik berurutan dan dua request paralel diterima dengan respons identik tanpa duplikasi operasi | TERVERIFIKASI TERBATAS |
| Retensi lifecycle | replay aktif dengan key/payload sama mengembalikan hasil identik; payload berbeda dengan key sama ditolak | TERVERIFIKASI TERBATAS |

## DMMA-10 — Bukti Vertical Slice Terotentikasi

Seorang admin aktif yang telah diautentikasi memanggil Function melalui dashboard dev. Pemeriksaan database setelahnya, tanpa menampilkan identifier pengguna, menghasilkan:

| Bukti | Hasil |
|---|---|
| Buku sintetis | tepat 1; lifecycle akhir `archived`; revisi akhir 2 |
| Anchor draf | tepat 1; revisi akhir 2, sama dengan revisi buku |
| Audit `create_draft` | 1 event `accepted` |
| Audit `update_draft_metadata` | 1 event `accepted` |
| Audit `archive` | 1 event `accepted` |

Ini membuktikan jalur create → update CAS yang tidak stale → archive untuk satu admin dan satu buku dev. Uji dashboard terotentikasi berikutnya juga membuat buku sintetis lalu mengirim dua pembaruan paralel dengan `expectedRevision` yang sama; hasilnya tepat satu pembaruan diterima dan satu revisi stale ditolak. Ia **tidak** membuktikan isolasi antar-admin, retry idempoten, struktur node/komponen, atau skenario GAP/OPEN lain.

## DMMA-11 — Riwayat Perubahan

| Versi | Perubahan |
|---|---|
| v0.1.3-draft | Menambahkan bukti UI terotentikasi untuk penolakan CAS stale satu admin; tidak mengubah status GAP/OPEN. |
| v0.1.3-draft | Menambahkan bukti isolasi baca dua admin melalui RLS; belum membuktikan seluruh jalur mutasi atau idempotensi. |
| v0.1.3-draft | Mencatat bukti replay identik berurutan yang mengembalikan hasil sama; retensi tetap pending evidence. |
| v0.1.3-draft | Mencatat penerapan migration idempotensi dan hardening concurrency pada target dev; probe dua request paralel menghasilkan respons identik tanpa duplikasi. |
| v0.1.3-draft | 2026-11-19 11:26:43 WIB — Probe retention lifecycle pada dev: replay aktif dengan key/payload sama PASS, payload berbeda dengan key sama ditolak PASS; expiry, durasi, cadence, dan cleanup tetap PENDING EVIDENCE. |

