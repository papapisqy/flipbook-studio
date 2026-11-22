# AUDIT MIGRASI AKSES BACA ADMIN — FLIPBOOK STUDIO

## AAMA-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Versi | `v0.1.1-draft` |
| Status | **DRAF — AKSES BACA ADMIN DEV TERVERIFIKASI; AUDIT SCOPE LANJUTAN DIPERLUKAN** |
| Artefak | `supabase/migrations/20261119020000_admin_read_access.sql` |
| Target potensial | `flipbook-studio-dev` saja |
| Eksekusi cloud | **BELUM DILAKUKAN** |

## AAMA-01 — Kontrak Akses

Migration ini hanya membuka **SELECT** bagi pengguna `authenticated` yang memiliki baris `admin_profiles` berstatus `active`. Scope setiap buku ditentukan oleh `books.owner_admin_id = auth.uid()`.

| Objek | Akses browser setelah migration | Batas |
|---|---|---|
| `admin_profiles` | baca profil sendiri yang aktif | tidak ada insert/update/delete dari browser |
| `books` | baca buku milik sendiri | tidak ada tulis; tidak ada buku orang lain |
| `book_drafts`, `draft_nodes`, `draft_components` | baca graph draf dari buku milik sendiri | tidak ada tulis/CAS browser |
| `audit_events` | tetap DENY | hanya jalur server/operasional masa depan |

Tidak ada akses untuk `anon`, dan user Auth tanpa profil `active` tetap tidak memperoleh data apa pun.

## AAMA-02 — Provisioning Profil Admin

Pembuatan user di Supabase Auth **tidak** membuat `admin_profiles` otomatis. Itu disengaja: policy ini tidak memiliki `INSERT` untuk `authenticated`, sehingga pengguna tidak bisa menaikkan haknya sendiri.

Profil admin hanya boleh dibuat atau diaktifkan oleh jalur server tepercaya yang akan diaudit terpisah. Jalur tersebut minimal harus memverifikasi identitas operator, alasan pemberian akses, target user, outcome, dan audit aman. Tidak ada service-role key, password database, atau endpoint provisioning dalam artefak ini.

## AAMA-03 — Audit Statis

| Kontrol | Hasil yang diharapkan |
|---|---|
| Policy | Lima policy `FOR SELECT TO authenticated`; nol policy `INSERT`, `UPDATE`, atau `DELETE`. |
| Scope | Semua policy data buku bergantung pada `auth.uid()` dan kepemilikan buku. |
| Status admin | Profil harus `active`; user Auth biasa tidak lolos. |
| Audit | Tidak ada policy; audit tetap default-deny. |
| Privilege | `SELECT` diberikan hanya untuk lima tabel yang mempunyai policy scoped. |
| Anon | Tetap tidak menerima grant/policy. |
| Server | Mutasi dan provisioning belum diberikan ke browser. |

## AAMA-04 — Uji Pasca-Eksekusi yang Wajib

| Skenario | PASS |
|---|---|
| Anon query lima tabel | seluruh query ditolak atau mengembalikan nol data sesuai RLS/privilege |
| User Auth tanpa profil | tidak dapat membaca profil/buku/draf |
| Profil `active` tanpa buku | dapat membaca profil sendiri saja; daftar buku kosong |
| Dua admin dummy | tiap admin hanya melihat graph buku dengan `owner_admin_id` miliknya |
| Insert/update/delete via publishable key | ditolak untuk semua tabel foundation |
| Query audit via publishable key | ditolak atau nol data; tidak ada detail audit bocor |

## AAMA-05 — Risiko Residual dan Gerbang Eksekusi

Migration ini tidak menyelesaikan CAS, append-only audit, provisioning admin, publish, Storage, aktivitas siswa, QR, dan 7 GAP/3 OPEN. Ia juga tidak membuktikan bahwa user Auth saat ini merupakan administrator aplikasi.

Sebelum eksekusi, diperlukan:

1. review SQL dan dry-run terhadap `flipbook-studio-dev`;
2. keputusan jalur provisioning profil pertama yang tidak memberi self-escalation;
3. persetujuan eksekusi eksplisit pemilik; dan
4. audit pasca-eksekusi memakai dua akun dummy untuk membuktikan isolasi scope.

## AAMA-06 — Bukti Eksekusi Dev

Pada 19 November 2026, migration `20261119020000_admin_read_access.sql` diterapkan hanya pada `flipbook-studio-dev` setelah preview menunjukkan tepat dua migration akses/provisioning dan tanpa seed/role tambahan.

Pemeriksaan hanya-baca pasca-eksekusi membuktikan satu policy pada masing-masing dari `admin_profiles`, `books`, `book_drafts`, `draft_nodes`, dan `draft_components`; tidak ada policy pada `audit_events`. Audit isolasi untuk dua admin dan penolakan DML via publishable key belum dijalankan, sehingga statusnya tetap **PENDING EVIDENCE**.
