# AUDIT MIGRASI FOUNDATION SUPABASE DEV — FLIPBOOK STUDIO

## FMA-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — Foundation Migration Audit |
| Versi | `v0.1.1-draft` |
| Status | **DRAF — EKSEKUSI FOUNDATION DEV TERVERIFIKASI; MENUNGGU AUDIT LANJUTAN** |
| Target yang diizinkan | `flipbook-studio-dev` (nonproduksi) |
| Artefak SQL | `supabase/migrations/20261119010000_foundation_schema.sql` |
| Eksekusi cloud | **BELUM DILAKUKAN** |

Dokumen ini mengaudit persiapan migrasi, bukan bukti bahwa migrasi telah diterapkan. Tidak ada data produksi, kredensial, atau nilai `.env.local` dicantumkan.

### Riwayat Perubahan

| Versi | Tanggal | Perubahan |
|---|---|---|
| `v0.1.0-draft` | 19 November 2026 | Persiapan SQL foundation dan audit statis sebelum eksekusi. |
| `v0.1.1-draft` | 19 November 2026 | Bukti eksekusi satu migration pada `flipbook-studio-dev` dan audit pasca-eksekusi hanya-baca. |

## FMA-01 — Batas Otorisasi

Migrasi hanya menyiapkan foundation berikut:

1. batas schema privat untuk data server-only masa depan;
2. profil identitas administrator yang merujuk `auth.users`;
3. buku privat, satu draf per buku, struktur node, dan komponen draf;
4. bentuk minimum peristiwa audit; serta
5. default-deny melalui pencabutan hak `anon`/`authenticated`, RLS aktif, dan tanpa policy akses klien.

Hal berikut **tidak** dibentuk: alias/slug publik, publikasi/snapshot/proyeksi, media atau Supabase Storage, aktivitas/sesi/attempt/jawaban/hasil, QR, backup/restore, Cloudflare, tema, seed, dan operasi aplikasi.

## FMA-02 — Verifikasi Target dan Prasyarat Eksekusi

Status endpoint nonmutatif pada lingkungan konfigurasi lokal menunjukkan Auth dan Storage dapat dijangkau, tetapi tidak membuktikan schema, RLS, atau privilege aplikasi. Project yang diberi nama pemilik adalah `flipbook-studio-dev`; referensi proyek aktual wajib diverifikasi lagi dari output CLI lokal tepat sebelum eksekusi dan dicocokkan dengan dashboard proyek nonproduksi.

Prasyarat sebelum persetujuan eksekusi:

| Pemeriksaan | Bukti wajib | Status saat ini |
|---|---|---|
| Target nonproduksi | output `supabase projects list` atau `supabase link` yang menunjukkan `flipbook-studio-dev` | PENDING — CLI belum tersedia pada workstation audit |
| Autentikasi lokal | sesi CLI lokal, tanpa memasukkan PAT/password di chat | PENDING |
| Tidak ada project produksi | pemeriksaan operator terhadap project-ref target | PENDING |
| Backup/snapshot dev bila data sudah ada | bukti pemulihan yang sesuai kebijakan dev | PENDING; tidak diperlukan bila database masih kosong |
| Review SQL ini | persetujuan eksekusi terpisah pemilik | PENDING |

## FMA-03 — Daftar Perubahan Database yang Diusulkan

| Objek | Tujuan | Batas keamanan |
|---|---|---|
| schema `private` | reservasi ruang server-only | `PUBLIC`, `anon`, dan `authenticated` dicabut dari schema ini |
| `admin_profiles` | profil aplikasi dari identitas `auth.users` | tidak ada policy klien; profil bukan klaim akses otomatis |
| `books` | agregat buku privat dan revision saat ini | tidak ada publish, slug, atau akses Reader |
| `book_drafts` | satu anchor draf/revision per buku | CAS prosedural belum dimasukkan |
| `draft_nodes` | struktur section/page dalam draf | FK mencegah parent lintas draf; anti-siklus tetap validasi server |
| `draft_components` | komponen milik node draf | FK komposit mencegah node lintas draf |
| `audit_events` | audit generik minimum yang aman | tidak ada token mentah, secret, atau PII yang diwajibkan |

## FMA-04 — Audit Statis SQL

| Kontrol | Hasil audit | Status |
|---|---|---|
| Batas scope | Enam tabel foundation saja; tidak ada objek publish, Storage, aktivitas siswa, QR, backup/restore, atau Cloudflare. | LULUS |
| Transaksi DDL | Seluruh DDL dibungkus `begin`/`commit`. Ini bukan transaksi terdistribusi. | LULUS |
| Mutasi data/seed | Tidak ada `INSERT`, `UPDATE`, atau `DELETE`. | LULUS |
| Default deny | Hak tabel `anon` dan `authenticated` dicabut; keenam tabel RLS diaktifkan dan dipaksa. | LULUS |
| Policy permisif | Tidak ada `CREATE POLICY`; karena itu tidak ada jalur baca/tulis klien setelah migrasi. | LULUS |
| Jalur privileged | Tidak ada `SECURITY DEFINER`, service-role key, secret, RPC, trigger, atau endpoint. | LULUS |
| Token/PII | Tidak ada kolom token mentah atau keharusan menyimpan PII siswa. | LULUS |
| CAS | Tabel memiliki revision anchor; prosedur mutasi CAS sengaja ditunda. | KONDISIONAL — tidak dapat diuji sebelum jalur server dirancang |
| Integritas struktur | FK draf/node/komponen menjaga scope; anti-siklus dan urutan sibling belum otomatis. | KONDISIONAL — validasi trusted server diperlukan |

RLS dan privilege digunakan bersamaan: pencabutan privilege mencegah akses Data API yang tidak diperlukan, sementara RLS mempertahankan postur menolak secara bawaan untuk tabel yang kelak mungkin mendapat grant terbatas. Pendekatan ini sesuai panduan resmi Supabase mengenai penggunaan gabungan grants dan RLS, serta kebutuhan meninjau default privileges. [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) dan [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## FMA-05 — Rancangan RLS Foundation

| Principal | `admin_profiles` | Buku/draf/struktur/komponen | Audit | Alasan |
|---|---|---|---|---|
| `anon` | DENY | DENY | DENY | tidak ada pembaca publik dalam scope foundation |
| `authenticated` | DENY | DENY | DENY | autentikasi saja bukan otorisasi aplikasi |
| server tepercaya masa depan | BELUM DIBUKA | BELUM DIBUKA | BELUM DIBUKA | harus memakai jalur, scope, dan audit yang disetujui terpisah |
| owner migrasi | sesuai hak database | sesuai hak database | sesuai hak database | hanya untuk administrasi migrasi; bukan kontrak aplikasi |

Tidak ada policy `USING (true)` atau grant `SELECT`/`INSERT` ke role browser. Dengan demikian aplikasi frontend saat ini juga belum boleh memulai query database sampai kontrak server/RLS berikutnya diaudit.

## FMA-06 — Prosedur Eksekusi dan Rollback Terkendali

1. Operator memasang Supabase CLI dari sumber resmi dan masuk secara lokal; jangan menaruh PAT, password database, atau service-role key di chat maupun file bukti.
2. Operator memverifikasi project reference pada CLI dan dashboard adalah `flipbook-studio-dev`; jika ada perbedaan, **berhenti**.
3. Operator membaca ulang hash artefak SQL dan audit ini, memastikan tidak ada perubahan setelah persetujuan.
4. Setelah persetujuan eksekusi terpisah, jalankan hanya migration foundation melalui mekanisme CLI/link yang disetujui untuk project dev.
5. Jalankan pemeriksaan pasca-eksekusi: enam tabel ada, RLS aktif/forced, role `anon` dan `authenticated` tidak memiliki privilege tabel, tidak ada policy permisif, dan tidak ada data seed.
6. Jika eksekusi gagal, jangan menganggap rollback otomatis aman. Catat error/audit dev dan gunakan forward-fix atau rollback yang telah ditinjau sesuai objek yang benar-benar dibuat. Karena artefak ini belum dijalankan, rollback saat ini **tidak berlaku**.

## FMA-07 — Rencana Uji Keamanan Pasca-Eksekusi

| Uji | Metode | PASS |
|---|---|---|
| Anon read | panggil Data API dengan anon key terhadap setiap tabel foundation | seluruh request ditolak/tidak mengembalikan data |
| Authenticated read/write | gunakan akun dummy yang autentik tetapi bukan jalur server | seluruh read/write ditolak |
| RLS state | inspeksi katalog PostgreSQL dengan jalur admin lokal | RLS enabled dan forced pada enam tabel; policy klien kosong |
| Privilege | inspeksi grants tabel | `anon` dan `authenticated` tidak memiliki privilege tabel |
| Scope FK | uji pada database dev: komponen tidak dapat menunjuk node dari draf lain | operasi ditolak |
| Anti-seed | hitung record sesudah migrasi | nol record baru dari migrasi |

Pengujian ini belum dilaksanakan. Ia tidak menutup 7 GAP dan 3 OPEN, yang tetap **PENDING EVIDENCE**.

## FMA-08 — Keterlacakan dan Risiko Residual

| Kontrak | Cakupan foundation | Status |
|---|---|---|
| ENT-001 / DB-REQ-001 | profil admin | disiapkan, belum dieksekusi |
| ENT-003 / DB-REQ-003, 008 | buku dan anchor revision draf | disiapkan, belum dieksekusi |
| ENT-005 / REL-002 / INV-001, INV-007 | struktur draf scoped | disiapkan sebagian; anti-siklus/CAS tetap jalur server |
| ENT-006 / REL-003 | komponen draf scoped | disiapkan, belum dieksekusi |
| ENT-018 / DB-REQ-021 | audit minimum | disiapkan, belum dieksekusi |
| INV-012 | default deny dan trust boundary | disiapkan, belum dibuktikan pada provider |

Risiko residual: mekanisme CAS, kebijakan scope admin, append-only audit, anti-siklus, urutan sibling, dan semua lifecycle publikasi/Storage/aktivitas memerlukan keputusan/jalur server atau bukti teknis lanjutan. Tidak satu pun dari risiko tersebut ditutup oleh migrasi foundation.

## FMA-09 — Keputusan yang Diperlukan Sebelum Eksekusi

1. Persetujuan eksekusi eksplisit setelah operator dapat membuktikan project reference `flipbook-studio-dev` secara lokal.
2. Persetujuan bahwa postur awal tanpa policy klien memang diinginkan; dokumen ini merekomendasikannya demi default-deny.
3. Ketersediaan Supabase CLI lokal untuk melakukan inspeksi dan eksekusi nonproduksi secara terkontrol.

Syarat di atas telah dipenuhi untuk migration foundation ini melalui persetujuan eksekusi terpisah pemilik. Syarat yang sama tetap berlaku bagi migration berikutnya; dokumen ini tidak memberi otorisasi blanket untuk objek di luar foundation.

## FMA-10 — Bukti Eksekusi dan Audit Pasca-Eksekusi

Pada 19 November 2026, CLI yang tertaut menjalankan satu-satunya migration berikut pada target bernama `flipbook-studio-dev` dengan reference ID yang sudah diverifikasi: `20261119010000_foundation_schema.sql`. Output CLI menyatakan migration selesai dan daftar migration remote mencocokkan timestamp lokal/remote `20261119010000`.

| Pemeriksaan hanya-baca | Hasil aktual | Status |
|---|---|---|
| Riwayat migration | Satu migration foundation tercatat lokal dan remote. | LULUS |
| Tabel foundation | Keenam tabel ada. | LULUS |
| RLS | `rls_enabled=true` dan `rls_forced=true` pada keenam tabel. | LULUS |
| Policy klien | `policy_count=0` pada keenam tabel. | LULUS — default deny dipertahankan |
| Privilege tabel browser | Tidak ada grant untuk `anon` atau `authenticated`. | LULUS |
| Schema `private` | `USAGE=false` bagi `anon` dan `authenticated`. | LULUS |
| Seed/mutasi data | Jumlah record pada keenam tabel adalah nol. | LULUS |
| Scope di luar foundation | Tidak diperiksa sebagai objek baru karena migration hanya berisi foundation; tidak ada seed. | LULUS terbatas |

Catatan: label `production` pada output CLI adalah label environment remote CLI, bukan penggantian nama target. Eksekusi hanya disetujui setelah nama dan reference ID dashboard diverifikasi sebagai proyek nonproduksi `flipbook-studio-dev`. Audit ini tidak membuktikan jalur aplikasi, CAS, policy scope admin, append-only audit, anti-siklus, atau 7 GAP dan 3 OPEN. Seluruhnya tetap **PENDING EVIDENCE**.
