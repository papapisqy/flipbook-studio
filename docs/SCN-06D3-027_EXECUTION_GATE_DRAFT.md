# GERBANG EKSEKUSI SCN-06D3-027 — DRAF

Status kesiapan: **READY FOR INDEPENDENT AUDIT**. Status kebijakan skenario tetap **GAP / PENDING EVIDENCE** sampai audit independen dan persetujuan pemilik.

## Artefak

- Migration kandidat: `supabase/migrations/20261119070000_activity_submit_foundation.sql`
- Edge Function kandidat: `supabase/functions/submit-activity/index.ts`
- Rencana uji: `docs/STUDENT_ACTIVITY_SUBMIT_PROOF_PLAN_DRAFT.md`
- Rollback draft: `docs/SCN-06D3-027_ROLLBACK_DRAFT.md`

## Pemeriksaan statis sebelum cloud

1. Pastikan project reference CLI adalah `sdkyikgwbobciwfzqfwx` dan bukan produksi.
2. Jalankan lint SQL/format dan review manual terhadap default-deny, `security definer`, `search_path`, token, idempotency, dan lock attempt.
3. Bangun Edge Function dengan toolchain Deno/Supabase tanpa deployment.
4. Review bahwa service-role hanya berada di environment Edge Function dan tidak masuk respons/log.
5. Siapkan rollback dengan migration kompensasi yang belum dieksekusi.

Hasil pemeriksaan lokal: `npm run test` lulus (3/3) dan `npm run build` lulus. Pemeriksaan statis menemukan RLS aktif, akses tabel dicabut untuk `anon`/`authenticated`, eksekusi RPC hanya untuk `service_role`, row lock attempt, pemeriksaan mismatch idempotensi, serta respons `no-store`. Lint/health lokal Supabase belum dapat dijalankan karena Docker tidak tersedia.

## Catatan eksekusi dev

- Migration `20261119070000_activity_submit_foundation.sql`: berhasil diterapkan pada ref `sdkyikgwbobciwfzqfwx`.
- Edge Function `submit-activity`: rancangan lokal memakai token sesi aktivitas anonim; JWT Supabase tetap khusus admin. Gateway `verify_jwt=false` belum dideploy dan menunggu audit keamanan endpoint.
- Migration audit trail `20261119080000_activity_submit_audit_trail.sql`: berhasil diterapkan pada ref yang sama.
- Smoke test tanpa Authorization: HTTP 401 `UNAUTHORIZED_NO_AUTH_HEADER`.
- Verifikasi dry-run berikutnya: database remote up-to-date.
- Uji SCN-06D3-027: dieksekusi dengan attempt sintetis; satu request HTTP 200 dan satu HTTP 409, hasil akhir tunggal. Bukti tersamarkan: `docs/evidence/fs-doc-06/scn-06d3-027/run-2026-11-19.md`.
- Status uji paralel: **TERVERIFIKASI TERBATAS** berdasarkan bukti tersamarkan; satu request HTTP 200 dan satu HTTP 409, hasil akhir tunggal.
- Status uji timeout/retry: **TERVERIFIKASI TERBATAS**; retry key/payload identik menghasilkan satu penerimaan, satu jawaban, satu hasil, dan satu record idempotensi. Urutan penerimaan request pertama sebelum client-abort belum dapat dibuktikan.
- Bukti timeout: `docs/evidence/fs-doc-06/scn-06d3-027/timeout-retry-2026-11-19.md`.
- Status resmi skenario tetap **GAP / PENDING EVIDENCE**; pemeriksaan ini dilakukan oleh pelaksana yang sama dan belum memenuhi independensi auditor.
- Bukti lanjutan: `docs/evidence/fs-doc-06/scn-06d3-027/follow-up-2026-11-19.md`.

## Keputusan gerbang

Eksekusi migration, deployment function, dan pembuatan data sintetis cloud telah diotorisasi terbatas pada dev. Tidak ada status GAP yang berubah sebelum audit independen dan persetujuan pemilik.
