# DRAF — Paket Persetujuan Deployment Sesi Aktivitas Anonim

Status: **READY FOR INDEPENDENT AUDIT; SCN-06D3-027 TETAP GAP / PENDING EVIDENCE**  
Target: hanya `flipbook-studio-dev` (`sdkyikgwbobciwfzqfwx`).

## Deployment dev

Migration `20261119090000`, `20261119091000`, `20261119092000`, dan `20261119093000` diterapkan pada dev. Function `start-activity-session` aktif v1 dan `submit-activity` aktif v4; keduanya `verify_jwt=false` dengan validasi token sesi opaque di server. Daftar migration lokal/remote konsisten.

## Checklist audit

- [x] Project reference dan target dev diverifikasi.
- [x] Tidak ada token/password/service key pada artefak.
- [x] SQL/RPC, RLS default-deny, dan function deployment diverifikasi.
- [x] Runtime lifecycle, expiry, revoke, cross-attempt, konkurensi, retry, timeout, dan deadline diuji.
- [x] Rollback prosedural tersedia; tidak ada cleanup destruktif otomatis.
- [ ] Audit independen oleh pemeriksa terpisah.

## Hasil runtime 19 November 2026

Bukti: `docs/evidence/fs-doc-06/scn-06d3-027/anonymous-runtime-2026-11-19.json` dan ringkasannya pada `.md`. Rekap: **25 PASS, 0 FAIL**.

Keterbatasan: timeout client-abort belum membuktikan secara mandiri apakah request pertama telah commit; rekonsiliasi audit trail langsung belum lengkap. Rate limit in-memory, TTL sementara, dan registry lifecycle dev tetap risiko residual dan bukan kontrol produksi.

Keputusan: paket siap diajukan ke audit independen. Registry development hanya fixture pembuktian, bukan pengganti publish kanonis. `SCN-06D3-027` tetap **GAP / PENDING EVIDENCE**.
