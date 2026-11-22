# AUDIT CAPABILITY PROVIDER — DRAF

## PCA-00 — Metadata

- Versi: `v0.1.1-draft`
- Status: **DRAF — DESK RESEARCH + PEMERIKSAAN KONEKTIVITAS NON-MUTATIF**
- Tanggal pemeriksaan: 19 November 2026 (Asia/Jakarta).
- Metode: dokumentasi resmi; tidak ada uji akun/provider dan tidak ada klaim capability paket proyek aktual.

## PCA-01 — Klasifikasi

`VERIFIED` = didokumentasikan resmi; `CONDITIONAL` = tersedia dengan konfigurasi/plan/izin; `UNVERIFIED` = capability atau paket proyek belum dapat dibuktikan; `UNSUPPORTED` = tidak didukung oleh bukti resmi yang diperiksa.

## PCA-02 — Temuan Supabase

| Area | Klasifikasi | Bukti resmi dan kesimpulan |
|---|---|---|
| PostgreSQL, koneksi, transaksi | VERIFIED | [Database overview](https://supabase.com/docs/guides/database/overview) menyatakan proyek mendapat Postgres; [connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) merekomendasikan direct connection untuk backup/restore dan transaction pooler untuk serverless. Isolation/locking spesifik aplikasi tetap perlu uji. |
| Auth/RLS/Data API | CONDITIONAL | [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) mengharuskan RLS dan grants pada exposed tables; konfigurasi/policy aplikasi belum diuji. |
| RPC/Edge/server tepercaya | CONDITIONAL | [Database functions](https://supabase.com/docs/guides/database/functions) dan [secure data](https://supabase.com/docs/guides/database/secure-data) mendukung fungsi/Edge Functions, namun privilege, `search_path`, grant, dan ownership wajib dibuktikan. |
| Storage privat/signed URL | CONDITIONAL | Storage dan kontrol akses memerlukan bucket/policy/jalur aplikasi yang belum dikonfigurasi; signed URL/lifecycle revoke harus diuji terhadap SCN-016/017. |
| Backup/restore DB | CONDITIONAL | [Database overview](https://supabase.com/docs/guides/database/overview) menyebut daily backup dan PITR pada paid plans; backup tidak mencakup object Storage. Paket, restore nyata, dan ekspor operasional proyek: UNVERIFIED. |
| Kuota/rate limits/free tier | UNVERIFIED | Tidak ada capability akun/proyek atau endpoint metrik yang diuji. Jangan gunakan angka paket sebagai kontrak tanpa verifikasi dashboard/API resmi pada saat implementasi. |

## PCA-03 — Temuan Cloudflare

| Area | Klasifikasi | Bukti resmi dan kesimpulan |
|---|---|---|
| Pages hosting/limit build-aset | VERIFIED | [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) mendokumentasikan batas Free saat diperiksa, termasuk 500 build/bulan, 20.000 file, aset 25 MiB; capability akun aktual tetap conditional. |
| Cache Pages dan stale risk | VERIFIED | [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) menyebut asset Pages di Tiered Cache dan custom cache rule dapat menyajikan stale content. Jalur revoke tidak boleh bergantung pada cache statis. |
| Purge/invalidation cache | CONDITIONAL | [Invalidate cached content](https://developers.cloudflare.com/cache/guides/invalidate-cache/) dan [purge API](https://developers.cloudflare.com/api/go/resources/cache/methods/purge/) mendokumentasikan purge/invalidate dan izin/rate limit tergantung plan. Token/zone/limit proyek belum diverifikasi. |
| Pages build-cache purge | VERIFIED | [Pages API](https://developers.cloudflare.com/api/resources/pages/) mendokumentasikan endpoint purge build cache; ini bukan bukti purge konten lifecycle aplikasi. |
| Monitoring/kuota API | UNVERIFIED | Audit tidak menemukan bukti resmi bahwa metrik yang diperlukan tersedia untuk akun/proyek ini dengan interval/akurasi yang diperlukan. Tetap SCN-044 OPEN. |

## PCA-04 — Dampak terhadap Skenario

| Skenario | Provider dependency | Status bukti |
|---|---|---|
| 005/027/029 | Postgres concurrency/transaction behavior di lingkungan nyata | PENDING EVIDENCE |
| 008/011/043 | Storage plus manifest, backup dan restore lintas DB/Storage | PENDING EVIDENCE |
| 016/017 | Cloudflare cache dan Supabase Storage akses privat | PENDING EVIDENCE |
| 034 | Browser storage dan server reconciliation | PENDING EVIDENCE |
| 044 | API/dashboard telemetry dan freshness | PENDING EVIDENCE |

## PCA-05 — Kesimpulan

Dokumentasi resmi mendukung arah arsitektur secara konseptual, tetapi tidak membuktikan konfigurasi, paket, perilaku concurrency, restore, purge, signed URL, atau telemetry proyek. Seluruh 7 GAP dan 3 OPEN tetap tidak berubah.

## PCA-06 — Pemeriksaan Aktual Proyek Dev

| Area | Hasil | Klasifikasi | Batas bukti |
|---|---|---|---|
| Client Vite | URL dan publishable key tersedia lokal; client dibundel tanpa secret privileged. | VERIFIED terbatas | Tidak membuktikan hak tabel/RLS. |
| Auth health | `GET /auth/v1/health` = `HTTP 200`. | VERIFIED | Hanya liveness endpoint. |
| Data API root | `GET /rest/v1/` = `HTTP 401`. | CONDITIONAL | Bukan uji tabel, schema, atau policy. |
| Storage endpoint | `GET /storage/v1/bucket` = `HTTP 200`. | CONDITIONAL | Tidak membuktikan bucket, privasi, signed URL, atau lifecycle. |
| Admin/Cloudflare | Tidak ada CLI, PAT, database password, zone, atau token yang digunakan. | UNVERIFIED | Tidak ada perubahan cloud. |

Pemeriksaan ini read-only, tidak menyimpan respons maupun kredensial, dan tidak mengubah status 10 skenario.
