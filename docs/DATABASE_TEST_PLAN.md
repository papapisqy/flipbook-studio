# RENCANA PENGUJIAN DATABASE DAN KEAMANAN — FLIPBOOK STUDIO

## TP-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — Database Test Plan |
| Versi | `v0.1.0-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Menetapkan bukti uji positif, negatif, RLS, transaksi, lifecycle, dan operasi sebelum implementasi database dinyatakan siap. |
| Bukan cakupan | Menjalankan test, SQL, test fixture nyata, migrasi, policy RLS sintaktis, atau klaim bahwa aplikasi telah diuji. |

## TP-01 — Prinsip Pembuktian

1. Setiap test masa depan mencatat precondition, aktor, input, waktu server, hasil yang diharapkan, bukti aman, dan data yang tidak boleh berubah.
2. PASS implementasi hanya dapat diberikan setelah test dijalankan pada lingkungan terkontrol dan bukti direview.
3. Skenario GAP/OPEN tetap berstatus demikian sampai bukti memenuhi kriteria penutupan pada dokumen ini.
4. Pengujian keamanan tidak boleh memakai data siswa nyata, token nyata, service role secret, atau data sensitif pada log.
5. Uji provider hanya sah setelah capability Storage/cache/backup/telemetry diverifikasi secara resmi.

## TP-02 — Lingkungan dan Data Uji Konseptual

| Kebutuhan | Ketentuan |
|---|---|
| Administrator uji | Principal terotorisasi dan principal tanpa scope untuk uji penolakan. |
| Reader/siswa uji | Reader anonim; sesi siswa A/B dengan token acak uji yang tidak dipersistenkan pada bukti. |
| Buku/versi | Satu buku draf, dua versi publikasi, slug aktif/alias, media valid dan media sengaja tidak siap. |
| Aktivitas | Konfigurasi privat, deadline UTC, attempt v1, outcome disclosure terbatas. |
| Media/Storage | Object yang dirujuk/tidak dirujuk, kegagalan sebelum/selepas operasi. |
| Waktu | Jam server dapat dikontrol/diamati untuk batas deadline dan lifecycle. |
| Audit | Sink audit aman untuk memeriksa correlation/outcome tanpa secret atau PII berlebih. |

## TP-03 — Integritas Buku, Draf, dan Snapshot

| ID | Skenario | Hasil wajib | Referensi |
|---|---|---|---|
| TP-001 | Pindah/reorder halaman/node. | UUID stabil; link internal tetap menuju objek sama. | INV-001; FR-BOK-002 |
| TP-002 | Duplikasi halaman/komponen. | Objek baru menerima ID baru; histori/hasil tidak tersalin keliru. | INV-001; baseline struktur |
| TP-003 | Dua autosave expected revision sama. | Paling banyak satu write sah; lainnya konflik tanpa silent overwrite. | INV-007; CAS |
| TP-004 | Edit draf setelah publish. | Snapshot/proyeksi versi lama tidak berubah. | INV-002 |
| TP-005 | Publish dengan struktur/komponen tak valid. | Pointer aktif lama tetap; audit outcome gagal aman. | INV-003/004 |
| TP-006 | Publish v2 setelah v1 aktif. | v2 hanya aktif setelah prasyarat lengkap; audit dan pointer konsisten. | INV-003/004; SCN-06D3-005 |
| TP-007 | Rollback ke versi historis valid. | Versi target tervalidasi; attempt/hasil historis tidak berubah. | INV-005/006/013 |
| TP-008 | Snapshot/proyeksi dibaca setelah evolusi schema. | Reader/validator versi didukung membaca snapshot tanpa mutasi. | LDM-Q-001; DEC-06E4-003 |

## TP-04 — RLS, Otorisasi, dan Privasi

| ID | Aktor/skenario | Hasil wajib | Referensi |
|---|---|---|---|
| TP-009 | Reader anonim meminta draf/snapshot lengkap. | Ditolak tanpa payload privat. | RS-04; INV-012 |
| TP-010 | Reader meminta proyeksi versi aktif valid. | Hanya konten publik yang diizinkan tersedia. | LDB-Q-003; INV-012 |
| TP-011 | Siswa A meminta attempt/jawaban/hasil siswa B. | Ditolak tanpa enumerasi data. | REL-010—012; NFR-SEC-004 |
| TP-012 | Admin tanpa scope meminta buku/media lain. | Ditolak; tidak bocor metadata sensitif. | RS-04/05 |
| TP-013 | Browser mencoba membaca kunci/bobot/scoring. | Tidak ada dalam proyeksi, respons, log, atau Data API publik. | ENT-010; NFR-SEC-004 |
| TP-014 | Audit dibaca Reader/siswa. | Ditolak; admin/operasional hanya scope/redaksi aman. | LDB-Q-005 |
| TP-015 | Token mentah diperiksa pada database/log/bukti. | Tidak ditemukan; hanya hash/verifier yang relevan. | FR-ACT-002 |
| TP-016 | QR agregat diakses. | Admin melihat agregat non-PII; raw scan/PII tidak tersedia. | FR-LNK-008 |

## TP-05 — Aktivitas, Deadline, dan Finalisasi

| ID | Skenario | Hasil wajib | Referensi |
|---|---|---|---|
| TP-017 | Pemulihan sesi setelah koneksi putus. | Menggunakan attempt sama; tidak membuat attempt baru pada MVP. | REL-010; INV-009 |
| TP-018 | Simpan jawaban sebelum deadline. | Jawaban diterima server dan status UI dapat menjadi diterima hanya setelah konfirmasi. | INV-009; IA-Q-004 |
| TP-019 | Resend key idempotensi sama. | Outcome sama; tidak membuat jawaban/hasil ganda. | INV-008 |
| TP-020 | Submit setelah deadline UTC. | Ditolak aman; tidak menjadi dasar hasil. | INV-009 |
| TP-021 | Double submit key berbeda pada attempt sama. | Satu state sah dan maksimal satu hasil; bukti audit tersedia. | SCN-06D3-027 |
| TP-022 | Auto-finalize ketika deadline. | Memakai jawaban server yang sah sesuai kontrak. | INV-008/009/013 |
| TP-023 | Empat interleaving submit–auto-finalize. | Outcome deterministik setelah mekanisme fisik dipilih; sebelum itu tidak boleh ditandai PASS. | SCN-06D3-029 |
| TP-024 | Retry grant Fase 2 dikonsumsi ulang. | Konsumsi pertama membuat sesi baru dan attempt baru; konsumsi kedua ditolak; attempt/hasil lama utuh. | REL-010/013; INV-006/008 |

## TP-06 — Media, Storage, dan Lifecycle Publikasi

| ID | Skenario | Hasil wajib | Referensi |
|---|---|---|---|
| TP-025 | Publish dengan media belum siap. | Publish tidak aktif; pointer lama utuh. | INV-005; SCN-06D3-008 |
| TP-026 | Delete media yang dirujuk snapshot/attempt. | Delete ditahan/pending; dependensi direvalidasi dan diaudit. | INV-010 |
| TP-027 | Rollback bersamaan dengan delete media. | Tidak ada versi aktif dengan media tak tersedia; mismatch ditangani. | SCN-06D3-008 |
| TP-028 | Kegagalan setelah delete object Storage. | Mismatch metadata–Storage ditandai, diaudit, dan masuk rekonsiliasi. | LDM-09/10; OPEN-011 |
| TP-029 | Unpublish/immediate block. | Akses baru ditolak sesuai lifecycle; histori tetap. | INV-006 |
| TP-030 | Emergency revoke lewat API/cache/Storage. | Akses baru terkontrol ditolak; salinan lokal tidak diklaim dapat ditarik. | SCN-06D3-016/017 |
| TP-031 | Restore setelah revoke. | Restore tidak membuka akses revoked otomatis. | DEC-06E6-004 |

## TP-07 — Slug, Deep Link, dan QR

| ID | Skenario | Hasil wajib | Referensi |
|---|---|---|---|
| TP-032 | Resolusi slug lama/alias. | Mengarah ke tujuan internal sah atau state aman, bukan redirect diam-diam. | FR-LNK-002/003 |
| TP-033 | Deep link tujuan tak tersedia/revoked. | Menampilkan state aman tanpa membocorkan konten. | S-APP-007/008/009 |
| TP-034 | QR dinamis target eksternal/siklus/nonaktif. | Ditolak saat simpan/resolusi. | INV-011; Fase 2 |
| TP-035 | Increment agregat QR bersamaan. | Agregat target/periode konsisten, non-PII, dan bukan klaim siswa unik. | FR-LNK-008; Fase 2 |

## TP-08 — Backup, Restore, Kuota, dan Rekonsiliasi

| ID | Skenario | Hasil wajib | Referensi |
|---|---|---|---|
| TP-036 | Backup operasional kemudian restore. | Bukti database, Storage, mapping, snapshot, attempt, hasil, dan dependensi lengkap. | SCN-06D3-043 |
| TP-037 | Rekonsiliasi orphan Storage. | Tidak ada delete spekulatif; object/mapping/tindak lanjut tercatat. | SCN-06D3-011 |
| TP-038 | Telemetry provider tidak tersedia/usang. | Ditandai tidak pasti, bukan nol; tanpa aksi destruktif/upgrade otomatis. | SCN-06D3-044 |
| TP-039 | Antrean lokal pada perangkat bersama/reload/expiry. | Tidak menampilkan data siswa lain; server tetap sumber benar; detail belum PASS sebelum mekanisme dipilih. | SCN-06D3-034 |

## TP-09 — Aksesibilitas dan Antarmuka yang Mempengaruhi Data

| ID | Skenario | Hasil wajib |
|---|---|---|
| TP-040 | Status antrean jawaban dekat simpan/kirim. | Tertunda/diperiksa/diterima/ditolak/perlu tindakan terbaca; status lokal tidak disamakan penerimaan server. |
| TP-041 | Metrik publish di UI. | Ringkasan/detail hanya dari data terverifikasi; tidak memaparkan rahasia atau angka perkiraan. |
| TP-042 | Reader mobile/keyboard/reduced motion. | Akses Reader tidak mengubah lifecycle/attempt secara tidak sah; fallback tetap dapat digunakan. |
| TP-043 | Breadcrumb/sidebar admin. | Navigasi tidak menambah hak akses dan URL langsung tetap divalidasi scope/lifecycle. |

## TP-10 — Matriks Penutupan GAP dan OPEN

| Status | ID | Bukti minimum untuk penutupan | Tidak cukup untuk menutup |
|---|---|---|---|
| GAP | SCN-06D3-005 | Uji dua publish dengan arbitrasi fisik, satu pointer aktif, audit keduanya. | Hanya dokumentasi urutan publish. |
| GAP | SCN-06D3-008 | Uji rollback/delete media termasuk kegagalan Storage dan kompensasi. | Hanya pemeriksaan relasi. |
| GAP | SCN-06D3-016 | Uji revoke pada API dan cache/provider yang dipakai. | Menyembunyikan tombol/route UI. |
| GAP | SCN-06D3-017 | Uji URL/object Storage sebelum/sesudah lifecycle berubah. | Bucket/URL yang diasumsikan aman. |
| GAP | SCN-06D3-027 | Uji submit paralel key berbeda dan satu state/hasil. | Uji submit tunggal. |
| GAP | SCN-06D3-029 | Empat interleaving dengan mekanisme fisik terpilih. | Mengandalkan timestamp klien atau dokumentasi. |
| GAP | SCN-06D3-043 | Restore nyata DB+Storage+mapping, capability provider, bukti hasil. | Ekspor tanpa restore. |
| OPEN | SCN-06D3-011 | Metode/jadwal/beban rekonsiliasi, bukti tindak lanjut tanpa delete spekulatif. | Daftar object tanpa tindakan terukur. |
| OPEN | SCN-06D3-034 | Mekanisme browser, privacy perangkat, expiry/retry, recovery/sinkronisasi diuji. | Status UI saja. |
| OPEN | SCN-06D3-044 | Capability sumber, interval/ambang, accuracy/freshness evidence. | Nilai kuota tanpa sumber/waktu. |

## TP-11 — Kriteria Kelulusan dan Pelaporan

- Setiap test mencatat ID test, versi skema/aplikasi, lingkungan, data uji, waktu server, hasil, bukti audit yang sudah disanitasi, dan status PASS/FAIL/BLOCKED.
- Kegagalan keamanan, kebocoran secret, akses lintas scope, hasil ganda, pointer publish tidak konsisten, atau kehilangan histori adalah blocker implementasi.
- GAP/OPEN tidak boleh berubah menjadi PASS hanya karena test plan tersedia.
- Hasil pengujian provider dipisahkan dari asumsi paket gratis dan disertai sumber capability aktual.

## TP-12 — Status Akhir

Dokumen tetap **DRAF — BELUM DIAUDIT**. Semua tujuh GAP dan tiga OPEN tetap terbuka. Tidak ada test dijalankan oleh dokumen ini.
