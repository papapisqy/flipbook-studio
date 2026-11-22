# KONTRAK SERVER MUTASI BUKU/DRAF — FLIPBOOK STUDIO

**Versi:** v0.1.3-draft  
**Status:** DRAF — VERTICAL SLICE DASAR TERVERIFIKASI DI NONPRODUKSI  
**Source lokal:** `supabase/functions/mutate-book-draft/index.ts`  
**Target deployment potensial:** `flipbook-studio-dev` saja

## BMS-01 — Tujuan dan Batas

Function Edge `mutate-book-draft` adalah satu-satunya calon jalur aplikasi untuk tiga mutasi foundation: membuat buku+draf, memperbarui metadata draf dengan CAS, dan mengarsipkan buku. Ia tidak mengakses atau mengubah node, komponen, publish, Storage, aktivitas siswa, QR, backup/restore, maupun data produksi.

Function telah dideploy hanya ke dev. Uji request terotentikasi dan CAS stale satu admin telah selesai, tetapi fungsi belum dapat dianggap sebagai bukti seluruh kontrak penyimpanan draf karena isolasi dua admin, idempotensi, struktur node/komponen, dan skenario GAP/OPEN belum diuji.

## BMS-02 — Kontrak Keamanan

| Tahap | Kontrak |
|---|---|
| Autentikasi | `withSupabase({ auth: 'user' })` mewajibkan JWT user sah. |
| Otorisasi aplikasi | `ctx.userClaims.id` harus memiliki `admin_profiles.access_status = active`; login Auth semata tidak cukup. |
| Privilege | `context.supabaseAdmin` dipakai setelah pemeriksaan tersebut untuk memanggil RPC server-only. Service-role tidak masuk browser atau respons. |
| Scope | RPC memverifikasi pemilik buku, profil aktif, status draf, serta expected revision. |
| Respons | Error publik bersifat generik; log server hanya menyimpan code, caller ID, dan correlation ID, tanpa token atau metadata draf. |

## BMS-03 — Operasi

| Operasi | Input wajib | RPC | Hasil sukses | Batas |
|---|---|---|---|---|
| `create` | `bookId`, `draftId`, `title` | `admin_create_book_with_draft` | buku+draf revision 0 | UUID dibuat pemanggil tepercaya; belum idempoten |
| `update_metadata` | `bookId`, `expectedRevision`, `title`, `draftMetadata` objek | `admin_update_book_draft_metadata_cas` | revisi berikutnya | stale write ditolak; tidak menyentuh struktur node/komponen |
| `archive` | `bookId`, `expectedRevision` | `admin_archive_book_cas` | revisi berikutnya, status archived | bukan hard delete |

## BMS-04 — Prasyarat Deploy yang Belum Dipenuhi

1. Hanya origin `http://localhost:5173` diterima. Wrapper luar menangani preflight sebelum `withSupabase`; wildcard CORS bawaan tidak diteruskan ke browser lokal.
2. Review source independen dan verifikasi versi runtime Edge Function.
3. Deploy hanya ke `flipbook-studio-dev`, dengan JWT verification aktif.
4. Uji akun non-admin, buku milik admin lain, serta error RPC.
5. UI harus mengganti data mock hanya setelah semua uji tersebut lulus.

## BMS-05 — Risiko Residual

- Tidak ada idempotensi mutasi create atau kebijakan retensi correlation ID.
- Deploy dan preflight asal lokal harus diverifikasi sesudah setiap perubahan source. Pemanggilan RPC terotentikasi tetap memerlukan uji terpisah.

## BMS-06 — Bukti Deploy Nonproduksi

Function `mutate-book-draft` hanya dideploy ke `flipbook-studio-dev` dan berstatus aktif pada versi deploy 3. Gateway mewajibkan JWT (`verify_jwt = true`). Versi 3 memperbaiki pembacaan identitas caller menjadi `ctx.userClaims.id` sesuai kontrak `@supabase/server`. Bukti nonmutasi yang tersedia:

| Uji | Hasil |
|---|---|
| `OPTIONS` dari `http://localhost:5173` | `204` dengan `Access-Control-Allow-Origin: http://localhost:5173` dan metode `POST, OPTIONS` |
| `OPTIONS` dari origin asing | `403 origin_not_allowed` |
| `POST` tanpa JWT | `401` di gateway; handler tidak berjalan |

Gateway dapat memberi header CORS generik pada respons `401` yang dihentikan sebelum handler. Itu bukan izin operasi: tidak ada JWT berarti request ditolak sebelum mutasi atau pembacaan data. Uji create, CAS update nonstale, archive, serta conflict stale satu admin telah dilakukan; pemisahan dua admin dan retry idempoten belum dilakukan sehingga seluruh GAP/OPEN tetap **PENDING EVIDENCE**.

## BMS-07 — Bukti Mutasi Terotentikasi

Satu admin aktif berhasil membuat satu buku sintetis, memperbarui metadata dengan expected revision yang sesuai, lalu mengarsipkannya. Database membuktikan buku dan anchor draf sama-sama berakhir pada revisi 2, serta tiga audit accepted (`create_draft`, `update_draft_metadata`, `archive`) tersedia. Dashboard terotentikasi kemudian membuat buku sintetis lain dan mengirim dua pembaruan paralel dengan `expectedRevision` yang sama; pesan PASS menyatakan tepat satu pembaruan diterima dan satu revisi stale ditolak. Uji dua admin juga menunjukkan admin kedua dapat membuat buku sendiri, sedangkan admin pertama tidak melihat buku tersebut melalui pembacaan RLS. Uji ini tidak mencakup retry idempoten.
- CAS struktur node/komponen, validasi antisiklus, dan ordering tetap belum tersedia.
- Tujuh GAP dan tiga OPEN tetap **PENDING EVIDENCE**.

## BMS-08 — Riwayat Perubahan

| Versi | Perubahan |
|---|---|
| v0.1.3-draft | Mencatat bukti uji CAS stale terotentikasi satu admin; tidak menutup GAP/OPEN. |
| v0.1.3-draft | Mencatat bukti isolasi data dua admin melalui RLS; tidak menutup retry idempoten atau GAP/OPEN lain. |
| v0.1.3-draft | 2026-11-19 11:26:43 WIB — Mencatat replay berurutan/paralel serta probe retention lifecycle: hasil bisnis replay aktif identik dan payload berbeda ditolak; retensi numerik, expiry, cadence, dan cleanup tetap PENDING EVIDENCE. |

## BMS-09 — Artefak Idempotensi Siap Audit

`supabase/migrations/20261119050000_draft_book_idempotency.sql` dan `20261119060000_draft_book_idempotency_concurrency.sql` telah diterapkan pada proyek dev. Edge Function aktif v4 menggunakan tiga RPC idempoten. Replay berurutan, probe dua request paralel, dan penolakan payload berbeda dengan key sama diverifikasi terbatas. Kebijakan retensi berbasis lifecycle dicatat; durasi numerik, expiry, cadence, dan cleanup belum diverifikasi.
