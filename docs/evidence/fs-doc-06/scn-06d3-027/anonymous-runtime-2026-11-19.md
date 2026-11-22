# Ringkasan Bukti Runtime — SCN-06D3-027

Tanggal: 19 November 2026 (UTC)  
Target: `flipbook-studio-dev`  
Project ref: `sdkyikgwbobciwfzqfwx`  
Run ID: `477d06dc-9347-4996-b978-2c4df16c10e2` (run historis; artefak JSON kemudian ditimpa oleh rerun terkontrol)

## Deployment yang diuji

- Migration: `20261119090000`, `20261119091000`, `20261119092000`, `20261119093000`.
- Function: `start-activity-session` aktif v1; `submit-activity` aktif v4; keduanya `verify_jwt=false` dengan validasi sesi opaque server-side.

## Rekap hasil

Harness runtime menyelesaikan **25 PASS, 0 FAIL**. Cakupan meliputi lifecycle inactive/revoked/expired, token invalid, cross-session, submit valid, replay identik, konflik payload, CAS stale, submit paralel dengan key berbeda, RLS langsung, deadline server, dan retry setelah timeout klien.

Bukti historis ringkas berada di `run-2026-11-19.md`, `follow-up-2026-11-19.md`, dan `timeout-retry-2026-11-19.md`. Artefak JSON saat ini merekam rerun yang terkena rate limit (24/15/1), sehingga tidak boleh dipakai sebagai bukti PASS historis. Token sesi direduksi menjadi `[REDACTED]`.

## Keterbatasan dan status

- Timeout client-abort membuktikan retry aman dan satu outcome akhir, tetapi tidak membuktikan apakah request pertama telah diterima/commit sebelum koneksi terputus.
- Rekonsiliasi audit trail langsung terhadap seluruh kondisi database belum menjadi bukti terpisah.
- Rate limit in-memory, TTL sementara, dan registry lifecycle dev bukan kontrol produksi.
- Rerun terakhir terkena rate limit in-memory; hasil tersebut dicatat sebagai kegagalan harness/prasyarat, bukan kegagalan mekanisme submit.

Status: **READY FOR INDEPENDENT AUDIT**. Status resmi `SCN-06D3-027`: **GAP / PENDING EVIDENCE**.
