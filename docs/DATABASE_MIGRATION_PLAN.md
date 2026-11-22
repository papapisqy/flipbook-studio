# RENCANA MIGRASI DATABASE — FLIPBOOK STUDIO

## MP-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — Database Migration Plan |
| Versi | `v0.1.0-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Menetapkan urutan, dependensi, validasi, dan rollback konseptual untuk implementasi database di masa depan. |
| Bukan cakupan | Berkas migrasi, SQL, perintah CLI, konfigurasi Supabase, data seed, rollback executable, atau deployment. |

## MP-01 — Prinsip Migrasi

1. Tidak ada migrasi executable sebelum desain fisik, RLS/security, dan audit independen disetujui.
2. Setiap migrasi masa depan harus reproducible, dapat diuji, memiliki analisis dampak, dan tidak merusak data lama.
3. Snapshot, attempt, jawaban sah, hasil, dan audit historis tidak boleh dimutasi untuk menyesuaikan skema baru.
4. Evolusi snapshot memakai reader/validator multi-versi berbasis `schema_version`; matriks versi dan masa dukungan tetap belum final.
5. Rollback skema tidak boleh disamakan dengan rollback publikasi. Keduanya memiliki kontrak dan risiko berbeda.
6. Storage tidak berada dalam transaksi terdistribusi bersama database; migrasi yang menyentuh media memerlukan langkah kompensasi/reconciliation.

## MP-02 — Prasyarat Sebelum Migrasi Pertama

| Prasyarat | Bukti yang diperlukan | Status |
|---|---|---|
| ERD dan kamus data diaudit | Relasi, atribut, key, dan bentuk data kandidat direview. | Draf tersedia; belum diaudit. |
| Kontrak constraints diaudit | INV-001—013 dan transaksi kritis dipetakan. | Draf tersedia; belum diaudit. |
| RLS/security diaudit | Matriks akses/jalur server/threat model diterima. | Draf tersedia; belum diaudit. |
| Provider capability | Storage, cache, backup, restore, dan telemetry diverifikasi. | Belum dibuktikan. |
| GAP/OPEN | 7 GAP dan 3 OPEN memiliki proof plan. | Tetap terbuka. |
| Change governance | Perubahan baseline terkunci memakai change request. | Wajib. |

## MP-03 — Urutan Konseptual Sepuluh Tahap

| Tahap | Cakupan konseptual | Dependensi | Validasi sebelum lanjut | Rollback konseptual |
|---:|---|---|---|---|
| 01 | Foundation: schema boundary, identitas, waktu server, audit minimal, konfigurasi aman. | Keputusan arsitektur hybrid. | Default deny, identitas stabil, audit tidak bocor secret. | Tambahan struktur dapat dinonaktifkan tanpa menghapus bukti. |
| 02 | Books/drafts: buku, alias, struktur, komponen, CAS. | Tahap 01. | UUID stabil, parent sah, reorder, konflik CAS. | Tidak mengubah snapshot/hasil historis. |
| 03 | Themes/templates: override/preset/template sesuai fase. | Tahap 02. | Pewarisan token, reset override, scope sah. | Menjaga draf dan snapshot lama tetap terbaca. |
| 04 | Media: metadata, referensi, Storage privat, dependensi. | Tahap 02; capability Storage. | Upload aman, referensi, pending delete, mismatch handling. | Tidak menghapus object/referensi spekulatif. |
| 05 | Activities: definisi privat, sesi, attempt, jawaban, hasil. | Tahap 01; private boundary. | Token hash, UTC, idempotensi, satu hasil, pin versi. | Tidak mengubah attempt/hasil historis. |
| 06 | Publication: snapshot immutable, proyeksi publik, pointer aktif, audit. | Tahap 02, 04, 05. | Publish gagal tidak aktif, media valid, proyeksi aman. | Pointer/lifecycle dipulihkan hanya sesuai kontrak, bukan mutasi snapshot. |
| 07 | Learning sessions: recovery, disclosure hasil, retry grant. | Tahap 05; UI/UX state. | Ownership, resend aman; retry Fase 2 membuat sesi baru dan attempt baru melalui grant sah. | Recovery tidak menciptakan attempt/hasil baru; hanya retry grant yang sah. |
| 08 | Dynamic QR: target internal, riwayat, agregat non-PII. | Tahap 06; Fase 2. | Anti-siklus, lifecycle, agregat tanpa PII. | Menonaktifkan resolusi tanpa menghapus audit/histori. |
| 09 | Security hardening: RLS final, trusted paths, audit, lifecycle cache/Storage, rate controls. | Tahap 01—08; provider proof. | Uji anon/admin/siswa/Storage/revoke. | Perubahan policy dipantau dan dapat dikembalikan dengan audit. |
| 10 | Integration tests dan operasi: backup/restore, rekonsiliasi, kapasitas, observabilitas. | Tahap 01—09; provider proof. | Bukti DB+Storage+mapping, skenario konkurensi. | Tidak mengklaim recovery tanpa bukti; rencana kompensasi. |

Tahap 03, 07, dan 08 tidak menjadi syarat kelulusan MVP jika fiturnya berada pada Fase 2 atau belum dipakai MVP.

## MP-04 — Dependensi Kritis

| Kemampuan | Tidak boleh dibangun sebelum | Risiko bila urutan dilanggar |
|---|---|---|
| Publish aktif | Draf CAS, media dependensi, aktivitas privat, proyeksi valid, audit. | Pointer aktif pada versi parsial atau secret bocor. |
| Hapus media | Metadata/referensi/dependensi dan strategi rekonsiliasi. | Snapshot/attempt rusak. |
| Finalisasi aktivitas | Sesi token hash, attempt pin versi, jawaban sah, idempotensi. | Hasil ganda atau scoring salah. |
| Retry grant | Attempt/hasil historis dan lifecycle grant. | Retry menimpa histori. |
| QR dinamis | Publikasi/lifecycle target dan audit. | Redirect eksternal atau target tidak sah. |
| Backup/restore | Mapping media dan prosedur bukti. | Restore palsu/tidak lengkap. |

## MP-05 — Kompatibilitas dan Evolusi Skema

| Area | Kontrak perubahan |
|---|---|
| Snapshot JSONB | Snapshot lama immutable; Reader/validator multi-versi harus dapat membaca versi yang didukung. |
| Data relasional | Perubahan bentuk harus menjaga identity, relasi, audit, dan histori; transformasi data memerlukan uji sebelum/sesudah. |
| Proyeksi publik | Proyeksi baru divalidasi sebelum dilayani; tidak mengandung kunci/bobot/token/data siswa. |
| Aktivitas/hasil | Attempt lama tetap memakai aktivitas/versi asal. |
| Media | Perubahan mapping tidak boleh membuat referensi historis menjadi yatim atau menghapus object sah. |
| Policy akses | Perubahan RLS/trusted path diuji dengan deny-by-default dan matriks akses. |

## MP-06 — Rencana Validasi per Tahap

| Jenis bukti | Contoh |
|---|---|
| Struktur | Identity/foreign relationship sesuai ERD dan INV. |
| Otorisasi | Anon ditolak dari draf/secret; admin/siswa hanya scope sendiri. |
| Konkurensi | CAS draf, publish paralel, submit paralel, auto-finalize versus submit. |
| Lifecycle | Publish/rollback/unpublish/revoke tidak mengubah histori tak sah. |
| Storage | Media referensi, delete failure, cache/revoke, rekonsiliasi. |
| Recovery | Backup/restore DB+Storage+mapping dan bukti hasil. |
| Evolusi | Reader/rollback membaca snapshot historis yang didukung. |

## MP-07 — Ketentuan Rollback dan Kompensasi

- Rollback publikasi menunjuk versi tervalidasi; bukan mengubah snapshot lama.
- Rollback migrasi fisik masa depan harus menjaga data historis dan audit; jika tidak reversible, rencana forward-fix dan restore tervalidasi harus tersedia.
- Kegagalan Storage setelah database berubah membutuhkan pencatatan mismatch, audit, serta rekonsiliasi; tidak ada klaim atomisitas lintas sistem.
- Emergency revoke tetap berprioritas; restore tidak membuka konten revoked secara otomatis.
- Tidak ada penghapusan permanen data/media tanpa lifecycle, retensi, dependensi, dan bukti yang disetujui.

## MP-08 — GAP dan OPEN sebagai Gerbang

| Status | Skenario | Gerbang implementasi |
|---|---|---|
| GAP | SCN-06D3-005 | Buktikan serialisasi/arbitrasi publish dan satu pointer aktif. |
| GAP | SCN-06D3-008 | Buktikan race rollback/delete dan kompensasi Storage. |
| GAP | SCN-06D3-016 dan SCN-06D3-017 | Buktikan lifecycle pada API/cache/Storage. |
| GAP | SCN-06D3-027 dan SCN-06D3-029 | Buktikan submit/finalize paralel dan satu hasil. |
| GAP | SCN-06D3-043 | Buktikan backup/restore dan provider. |
| OPEN | SCN-06D3-011 | Tetapkan/ujikan rekonsiliasi orphan tanpa delete spekulatif. |
| OPEN | SCN-06D3-034 | Tetapkan/ujikan browser persistence, expiry, privacy, retry, recovery. |
| OPEN | SCN-06D3-044 | Verifikasi sumber telemetry, interval, ambang, dan keterkinian. |

## MP-09 — Tata Kelola Implementasi

Setiap perubahan fisik kelak harus memiliki: change request, dampak terhadap ERD/kamus/constraints/RLS/test plan, rencana rollout dan pemulihan, hasil pengujian, review keamanan, serta persetujuan sesuai status dokumen. Tidak ada file migrasi atau konfigurasi yang dibuat oleh dokumen ini.

## MP-10 — Status Akhir dan Tahap Berikutnya

Status dokumen tetap **DRAF — BELUM DIAUDIT**. Tahap dokumentasi terakhir sesuai master prompt adalah `DATABASE_TEST_PLAN.md`, yang akan menyusun skenario positif/negatif, RLS, transaksi, keamanan, dan bukti untuk 7 GAP serta 3 OPEN tanpa menjalankan pengujian implementasi.
