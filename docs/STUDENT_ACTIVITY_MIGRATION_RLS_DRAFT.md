# RANCANGAN MIGRATION DAN RLS AKTIVITAS SISWA — DRAF NON-EKSEKUSI

**Status:** DRAF — TIDAK BOLEH DIJALANKAN  
**Target konseptual:** `flipbook-studio-dev`  
**Cakupan:** hanya persiapan `SCN-06D3-027`.

## 1. Batas keselamatan

Dokumen ini bukan file migration Supabase dan tidak boleh ditempatkan pada direktori yang dipindai CLI. Tidak ada perubahan cloud, data, atau baseline yang dilakukan. Nama relasi bersifat kandidat logis sampai audit desain fisik menyetujuinya.

## 2. Kandidat struktur minimum

Kandidat relasi: `activity_attempts`, `attempt_answers`, `attempt_results`, `activity_submit_idempotency`, serta penggunaan `audit_events` foundation. Identitas konseptual wajib mencakup attempt, versi aktivitas asal, status, deadline UTC, dan hubungan ke sesi; hasil unik per attempt; key idempotensi unik dalam scope attempt dengan fingerprint payload dan outcome yang dapat direplay.

## 3. Kontrak RLS non-sintaktis

1. Default deny untuk browser dan anon.
2. Tidak ada grant mutasi langsung ke tabel kandidat.
3. Submit hanya melalui server tepercaya/RPC yang memvalidasi token sesi aktivitas anonim, scope attempt, lifecycle, deadline, dan idempotensi; JWT Supabase hanya untuk admin.
4. Pembacaan siswa dibatasi pada attempt miliknya setelah verifikasi token; admin dibatasi scope.
5. Kolom kunci jawaban, bobot, token mentah, dan scoring tidak diproyeksikan ke browser.
6. Setiap penolakan bersifat non-enumerating dan diaudit tanpa secret.

## 4. Prosedur audit sebelum eksekusi

- Review silang SP-01 sampai SP-06 dengan FS-DOC-06.
- Hasilkan SQL executable hanya setelah desain fisik disetujui secara terpisah.
- Jalankan static lint, pemeriksaan default-deny, dan diff pada lingkungan lokal/dev.
- Verifikasi project reference secara independen sebelum perintah CLI apa pun.
- Minta persetujuan eksekusi terpisah; dokumen ini tidak memberi izin menjalankan migration.
