# DRAF — Audit Keamanan Sesi Aktivitas Anonim

Versi: v0.1.1-draft  
Status: DRAF — READY FOR INDEPENDENT SECURITY AUDIT  
Lingkungan: `flipbook-studio-dev` (`sdkyikgwbobciwfzqfwx`)

## Kontrak keamanan

Siswa tidak memakai Supabase Auth. Endpoint menerbitkan token 32 byte dari CSPRNG, hanya hash SHA-256 yang disimpan server, dan token diikat ke satu attempt dengan expiry, deadline, serta revoke. Tidak ada akses langsung klien ke tabel; RLS default-deny dan RPC internal dibatasi.

`submit-activity` memvalidasi token opaque, binding attempt, versi aktivitas, lifecycle, expiry/revoke, deadline UTC, CAS, dan idempotensi. Token mentah, kunci jawaban, serta data sensitif tidak ditulis ke log atau evidence.

## Hasil audit dan runtime

- CSPRNG/hash, expiry/revoke/binding, lifecycle denial, konkurensi, RLS, deadline, dan respons tanpa secret: PASS pada runtime dev.
- `verify_jwt=false` hanya dipakai pada endpoint publik yang memiliki autentikasi sesi opaque server-side; function aktif v1/v4.
- `npm test`: PASS (2 file, 5 test). `npm run build`: PASS, dengan peringatan ukuran chunk Vite.
- Evidence: `docs/evidence/fs-doc-06/scn-06d3-027/anonymous-runtime-2026-11-19.json`; 25 PASS, 0 FAIL.

## Risiko residual

TTL satu jam dan rate limiting in-memory adalah kontrol nonproduksi sementara. Registry lifecycle adalah fixture dev, bukan lifecycle publish kanonis. Timeout client-abort dan rekonsiliasi audit trail langsung belum terbukti penuh. SCN-06D3-027 tetap **GAP / PENDING EVIDENCE** sampai audit independen.
