# SCN-06D3-027 — Rancangan Audit Trail dan Instrumentasi Timeout

Versi: v0.1.0-draft  
Status: DRAF — PENDING EVIDENCE  
Lingkungan: `flipbook-studio-dev` saja

## Tujuan dan batas

Dokumen ini menyiapkan bukti yang dapat diaudit untuk submit paralel dengan
idempotency key berbeda. Dokumen tidak mengubah baseline, tidak menjalankan
migration cloud, dan tidak menyatakan `SCN-06D3-027` CLOSED.

## Validasi autentikasi lokal

Siswa tidak memiliki akun Supabase Auth. `submit-activity` secara lokal menerima
header `x-activity-session` berisi token acak CSPRNG yang diterbitkan server;
server menghitung hash SHA-256 dan memeriksa attempt, expiry, lifecycle, deadline,
CAS, serta idempotensi sebelum RPC. JWT Supabase tetap khusus jalur administrator.
Implementasi historis berikut tidak lagi menjadi kontrak siswa:
`supabase/functions/submit-activity/index.ts` sebelumnya menggunakan verifikasi JWT
kriptografis melalui JWKS Supabase (`jose.jwtVerify`) dengan issuer
`${SUPABASE_URL}/auth/v1`, audience `authenticated`, expiry bawaan JWT, dan
subject wajib. Token yang tidak valid, kedaluwarsa, issuer/audience salah, atau
role selain `authenticated` ditolak sebelum RPC. Hash token tetap hanya dipakai
untuk pencocokan sesi pada RPC; hash bukan pengganti verifikasi JWT.

Status: **TERVERIFIKASI SECARA STATIS — GATEWAY CLOUD TERVERIFIKASI**.

## Kontrak audit trail minimum

Implementasi lokal menulis log terstruktur tanpa rahasia. Setiap event memuat:

| Event | Data minimum |
|---|---|
| `request_received` | `request_id`, `correlation_id`, timestamp UTC, metode |
| `request_rejected` | ID, timestamp UTC, kategori alasan, status transaksi |
| `idempotency_conflict` | ID, timestamp UTC, status ditolak; tanpa payload/key mentah |
| `submit_accepted` | ID, timestamp UTC, attempt/version sintetis, status `committed` |
| finalisasi | Dicatat oleh prosedur RPC/audit server bila diaktifkan; bukti cloud masih pending |

Bearer token, payload jawaban, kunci jawaban, token sesi mentah, dan PII tidak
ditulis. `x-request-id` dan `x-correlation-id` dikembalikan sebagai header untuk
menghubungkan respons dengan log.

Penyimpanan audit persisten tersedia melalui migration
`20261119080000_activity_submit_audit_trail.sql` pada project ref
`sdkyikgwbobciwfzqfwx`; RLS tetap default-deny dan akses service-role saja.
Bukti runtime event dan audit trail tetap perlu dikumpulkan dari pengujian
terautentikasi; migration aktif bukan bukti bahwa skenario sudah lulus.

## Matriks bukti timeout

Setiap percobaan wajib menghubungkan:

`Request ID → timestamp server → identitas uji tersamarkan → validasi → status transaksi → audit event → respons → kondisi akhir database`.

| Keadaan | Bukti minimum | Status saat ini |
|---|---|---|
| Request belum diterima | Tidak ada `request_received` untuk ID | Harness belum dijalankan |
| Diterima belum commit | `request_received` tanpa `submit_accepted`, transaksi gagal/rollback | PENDING EXECUTION |
| Commit terjadi, respons hilang | `submit_accepted` + status `committed`, klien timeout/abort | PENDING EXECUTION |
| Retry key sama | Respons replay identik, tidak ada operasi tambahan | Bukti sebelumnya terbatas; audit independen pending |

Pengujian harus memakai fault injection/abort yang menyimpan request ID dari
header. Satu kondisi akhir database saja tidak cukup untuk menyatakan exactly-once.

## Pemeriksaan RLS dan deployment

Pemeriksaan berikut memerlukan bukti konfigurasi cloud aktual dan belum dilakukan:

1. pengguna sah dapat memanggil jalur yang diizinkan;
2. pengguna lain tidak dapat membaca atau mengubah attempt;
3. token invalid/kedaluwarsa dan tanpa autentikasi ditolak;
4. respons dan log tidak membocorkan attempt lain atau rahasia;
5. migration/function version dan project reference cocok dengan `flipbook-studio-dev`.

Hasil verifikasi deployment lama: function `submit-activity` versi 3 dengan
`verify_jwt=true` dan penolakan tanpa Authorization. Ini artefak historis yang
tidak sesuai kontrak anonim-siswa. Perubahan gateway ke `verify_jwt=false` belum
dideploy dan menunggu audit keamanan endpoint.

Checklist deployment: `supabase db push --dry-run --remote`, pemeriksaan daftar
function/version, uji endpoint dengan data sintetis, pengumpulan log, lalu audit
independen. Tidak ada langkah cloud yang diotorisasi oleh dokumen ini.

## Status audit

- Perbaikan JWT dan logging: **RESOLVED secara lokal dan terkonfirmasi deployment gateway**.
- Audit trail persisten: **DEPLOYED — bukti event runtime masih PENDING EXECUTION**.
- Fault injection timeout: **PENDING EXECUTION**.
- RLS runtime, bukti server-side, dan pengujian lintas pengguna: **PENDING EVIDENCE**.
- `SCN-06D3-027`: **GAP / PENDING EVIDENCE**.

