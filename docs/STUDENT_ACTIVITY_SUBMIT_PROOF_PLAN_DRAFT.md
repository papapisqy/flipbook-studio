# RENCANA PEMBUKTIAN SUBMIT AKTIVITAS SISWA — DRAF

## SP-00 — Status dan batas

- Versi: `v0.1.1-draft`
- Status: **DRAF — READY FOR INDEPENDENT AUDIT; GAP / PENDING EVIDENCE**
- Lingkungan: `flipbook-studio-dev` saja.
- Cakupan: `SCN-06D3-027`; tidak mencakup publish, Storage, QR, backup, Cloudflare, atau produksi.

## SP-01 — Kontrak endpoint

Siswa tidak memiliki akun Supabase Auth. Request membawa token sesi aktivitas anonim yang diterbitkan server melalui tautan/QR; token CSPRNG, hanya hash yang disimpan server, terikat pada attempt dan memiliki expiry. Server memverifikasi token, scope attempt, lifecycle, deadline UTC, CAS, dan idempotensi. Pembaca tanpa token tidak memiliki hak finalisasi.

Key sama dengan payload sama mengembalikan outcome yang sama; key sama dengan payload berbeda ditolak. Dua key berbeda diarbitrasi pada attempt sehingga hanya satu penerimaan final yang sah.

## SP-02 — Model minimum kandidat

`activity_attempts` menyimpan attempt, versi aktivitas asal, deadline dan status; `attempt_answers` menyimpan jawaban diterima; `attempt_results` menyimpan hasil final server; `activity_submit_idempotency` menyimpan fingerprint, key dan outcome; `audit_events` menyimpan bukti tanpa token mentah atau jawaban rahasia. Nama tersebut kandidat logis, bukan keputusan skema fisik.

## SP-03 — Batas akses/RLS

Default deny untuk browser. Jalur submit memakai server tepercaya/RPC yang memeriksa konteks; service-role tidak dikirim ke browser. Kunci jawaban, bobot, dan hasil mentah tetap server-only. Kebijakan ini bukan SQL final.

## SP-04 — Uji konkurensi

Prasyarat runtime dev telah tersedia: aktivitas/attempt sintetis sah, dua sesi anonim, dua key berbeda, timestamp server dan evidence. Kirim dua payload paralel untuk attempt sama, lalu ulangi replay identik, konflik payload, koneksi lambat, dan request gagal sebelum respons.

PASS: paling banyak satu hasil final, tidak ada hasil bertentangan/overwrite senyap, versi asal tetap sama, mismatch ditolak, retry identik konsisten, dan tidak ada secret di respons/log. FAIL: hasil ganda, korupsi, finalisasi terlambat, versi berubah, atau kebocoran. BLOCKED/NOT EXECUTED hanya bila prasyarat tidak tersedia secara aman.

## SP-05 — Interleaving

Submit diterima sebelum auto-finalize; auto-finalize sebelum submit terlambat; submit dan finalisasi bersamaan; serta request masuk sebelum deadline tetapi penerimaan sah belum pasti. Waktu penerimaan server, bukan waktu klik, menjadi bukti. Tidak ada pilihan locking/isolation fisik yang ditetapkan di sini.

## SP-06 — Bukti dan status

Bukti disimpan di `docs/evidence/fs-doc-06/scn-06d3-027/`. Runtime dev menggunakan migration 900/910/920/930 dan function aktif start v1/submit v4. Evidence `anonymous-runtime-2026-11-19.json` mencatat 25 PASS, 0 FAIL, request/correlation ID, timestamp, status respons, lifecycle denial, RLS, deadline, konkurensi, idempotensi, dan retry timeout.

Keterbatasan: timeout client-abort belum membuktikan secara mandiri apakah request pertama telah commit; rekonsiliasi audit trail langsung belum lengkap. Rate limit in-memory, TTL sementara, dan registry lifecycle dev bukan kontrol produksi. `SCN-06D3-027` tetap **GAP / PENDING EVIDENCE** sampai audit independen dan persetujuan pemilik.

## SP-07 — Referensi baseline

APP_FLOW: `activity/start`, `save-answers`, `finalize`; PRODUCT_REQUIREMENTS/CORE_FEATURES: token sesi, deadline server, satu attempt MVP, scoring server-only, `Idempotency-Key`; `RLS_SECURITY.md`: default deny dan tanpa enumerasi.

## SP-08 — Kesiapan audit

Paket bukti siap diajukan kepada pemeriksa terpisah. Tidak ada klaim bahwa audit independen atau penutupan GAP telah terjadi.
