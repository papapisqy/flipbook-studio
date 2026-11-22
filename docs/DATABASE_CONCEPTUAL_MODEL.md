# MODEL DATA KONSEPTUAL — FLIPBOOK STUDIO

## CDM-00 — Identitas dan Status Dokumen

- **Kode:** FS-DOC-06 — Dokumen Pendukung Model Konseptual
- **Nama file:** `docs/DATABASE_CONCEPTUAL_MODEL.md`
- **Versi:** `v1.0.1-approved-locked`
- **Status:** **DISETUJUI DAN DIKUNCI — MODEL KONSEPTUAL SAJA**
- **Dasar keputusan:** `CR-DB-001 — CONCEPTUAL DATABASE ARCHITECTURE APPROVAL`
- **Nomor perubahan:** `CR-DB-002 — PERSETUJUAN DAN PENGUNCIAN MODEL DATA KONSEPTUAL`
- **Dasar persetujuan:** Persetujuan eksplisit pemilik proyek setelah audit independen Revisi 06B-5.
- **Ruang lingkup persetujuan:** Model konseptual dan `INV-013`.
- **Batas persetujuan:** Tidak mencakup rancangan logis, fisik, SQL, migrasi, RLS teknis, maupun penguncian FS-DOC-06 secara keseluruhan.
- **Bahasa:** Indonesia

### Riwayat Revisi Terkendali

| CR | Tanggal | Dampak administratif | Versi |
|---|---|---|---|
| CR-IA-001 | 18 November 2026 | Menyelaraskan status IA-Q-001—IA-Q-004 sebagai keputusan pemilik; tidak mengubah ENT, REL, INV, DB-REQ, fase, atau keputusan konseptual CR-DB-001/002. | `v1.0.0-approved-locked` → `v1.0.1-revised-cr-ia-001` |
| CR-IA-001-RELOCK | 18 November 2026 | Penguncian kembali setelah audit konsistensi; tidak mengubah ENT, REL, INV, DB-REQ, fase, atau keputusan konseptual. | `v1.0.1-revised-cr-ia-001` → `v1.0.1-approved-locked` |

Dokumen ini menjelaskan model data pada tingkat konseptual sebagai bahan penyusunan FS-DOC-06 — `DATABASE_DESIGN.md`. Dokumen ini bukan rancangan fisik database, tidak menetapkan tabel, kolom, tipe PostgreSQL, indeks, SQL, migrasi, kebijakan RLS rinci, maupun konfigurasi Supabase. Dokumen ini juga bukan bukti implementasi atau pengujian aplikasi.

## CDM-01 — Dokumen Acuan dan Keputusan Arsitektur

| Acuan | Status | Peran dalam model konseptual |
|---|---|---|
| FS-DOC-01 `PRODUCT_REQUIREMENTS.md` | APPROVED & LOCKED | Requirement produk, keamanan, reliabilitas, media, aktivitas, dan publikasi. |
| FS-DOC-02 `APP_FLOW.md` | APPROVED & LOCKED | Alur autosave, publish, lifecycle, QR, aktivitas, backup, dan operasi berotorisasi. |
| FS-DOC-03 `INFORMATION_ARCHITECTURE.md` | `v1.0.2-approved-locked`, APPROVED & LOCKED | Batas informasi publik/admin, inventaris halaman/state, dan keputusan IA-Q-001—005. |
| FS-DOC-04 `CORE_FEATURES.md` | APPROVED & LOCKED | Feature, dependensi, dan acceptance criteria turunan. |
| FS-DOC-05 `UI_UX_SPEC.md` | `v1.0.1-approved-locked`, APPROVED & LOCKED | Batas UI, privacy, traceability, state A/B/C, dan keputusan IA-Q-001—005. |
| `DB_CONCEPTUAL_DECISIONS.md` | Supporting Decision Record | `CR-DB-001`, koreksi AUD-DB, dan batas keputusan konseptual. |

`CR-DB-001` menyetujui pada lingkup konseptual: draf relasional dan snapshot JSONB immutable, soft archive dengan hard delete terbatas, CAS pada level draf buku untuk MVP, idempotency per attempt dan jenis operasi, integritas media berbasis hash/referensi, serta RLS default-deny dengan operasi privileged pada server tepercaya.

## CDM-02 — Gambaran Umum Model Data

Administrator membuat buku dengan UUID stabil, mengelola metadata, slug, struktur, komponen, tema, dan media draf privat. Mutasi draf memakai CAS (*compare-and-swap*: penyimpanan hanya diterima jika revisi yang diharapkan masih cocok). Ketika publish berhasil, draf tervalidasi dirakit menjadi snapshot JSONB immutable lengkap sebagai sumber historis; media diverifikasi, pointer versi aktif berubah atomik, dan audit dicatat.

Snapshot lengkap yang disimpan tidak otomatis menjadi payload untuk Reader. Reader anonim hanya memperoleh proyeksi publik dari snapshot aktif yang memuat informasi yang diizinkan untuk dibaca. Kunci jawaban, bobot rahasia, dan konfigurasi penilaian sensitif tidak masuk proyeksi tersebut serta hanya dapat digunakan oleh server tepercaya untuk penilaian.

Aktivitas yang hasilnya dicatat meminta identitas minimum dan membuat sesi dengan token yang disimpan sebagai hash. Attempt terikat pada definisi aktivitas dan snapshot publikasi asal; deadline memakai waktu server UTC, penilaian berjalan di server, dan hasil ditampilkan melalui disclosure yang diizinkan. Pada tahap rancangan logis, data penilaian rahasia dapat tetap berada pada bagian snapshot immutable dengan akses dibatasi atau direpresentasikan sebagai bagian immutable terpisah yang tetap terikat pada snapshot. Kedua alternatif harus menjaga keterikatan versi yang sama dan tidak menyiratkan entitas atau tabel baru pada model konseptual ini. QR statis tersedia pada MVP; QR dinamis dan agregat non-PII adalah Fase 2.

## CDM-03 — Daftar Entitas Konseptual

| ID | Entitas dan fungsi | Identitas / tanggung jawab | Hubungan utama | Keamanan / fase / DB-REQ |
|---|---|---|---|---|
| ENT-001 | Principal administrator | Identitas administrator yang berotorisasi menjalankan operasi privat. | Mengelola buku dan menjadi asal tindakan audit. | Privat admin; MVP; DB-REQ-001/022. |
| ENT-002 | Konfigurasi aplikasi | Preferensi serta allowlist yang didukung. | Dikelola ENT-001. | Privat admin; MVP; DB-REQ-002. |
| ENT-003 | Buku | UUID stabil, metadata, status, dan pointer versi aktif. | Memiliki alias, struktur, dan snapshot. | Campuran; MVP; DB-REQ-003/010/011. |
| ENT-004 | Alias slug | Riwayat slug publik untuk redirect sah. | Banyak alias menuju satu ENT-003. | Resolusi publik; MVP; DB-REQ-004. |
| ENT-005 | Node struktur | Bab/halaman stabil beserta posisi/hierarki. | Bagian ENT-003; memiliki komponen. | Draf privat/snapshot publik; MVP; DB-REQ-005. |
| ENT-006 | Komponen draf | Konten, tata letak, perilaku, dan referensi media yang dapat berubah. | Milik ENT-005. | Privat admin; MVP/Fase 2; DB-REQ-006/008. |
| ENT-007 | Konfigurasi tema | Pewarisan dan override tema Buku → Node → Komponen. | Berlaku bagi ENT-003/005/006. | Privat admin/snapshot publik; MVP/Fase 2; DB-REQ-006. |
| ENT-008 | Metadata aset media | Hash, verifikasi, status draf/publikasi, dan dependensi aset. | Direferensikan komponen dan snapshot. | Operasional privat; MVP; DB-REQ-007/025. |
| ENT-009 | Snapshot versi publikasi | Representasi JSONB immutable lengkap dari draf tervalidasi sebagai sumber versi historis. | Banyak snapshot per buku; paling banyak satu aktif. | Snapshot lengkap berada pada batas akses yang dibatasi; Reader hanya menerima proyeksi publik dari snapshot aktif; MVP; DB-REQ-009/010/025. |
| ENT-010 | Definisi aktivitas pada snapshot | Representasi konseptual aktivitas immutable yang terikat pada snapshot asal, mencakup konten yang boleh diproyeksikan dan data penilaian sensitif yang hanya dipakai server. | Menjadi dasar sesi dan attempt serta mempertahankan versi aktivitas asal. | Server/private dengan proyeksi publik terbatas; MVP/Fase 2; DB-REQ-017. |
| ENT-011 | Sesi siswa | Nama/kelas minimum dan hash token sesi. | Mengotorisasi satu attempt. | Privat siswa; MVP; DB-REQ-016. |
| ENT-012 | Attempt aktivitas | Pengerjaan yang dipin pada aktivitas/snapshot asal, deadline, dan status finalisasi. | Memiliki jawaban dan hasil. | Privat siswa; MVP; DB-REQ-018/019. |
| ENT-013 | Jawaban diterima | Jawaban yang sah menurut server. | Banyak jawaban dapat terkait satu attempt. | Privat siswa; MVP; DB-REQ-018. |
| ENT-014 | Hasil final | Hasil penilaian server yang persisten. | Maksimum satu per attempt; disclosure diproyeksikan server. | Privat/terfilter; MVP; DB-REQ-019. |
| ENT-015 | Retry grant | Izin acak sekali pakai dan kedaluwarsa untuk attempt baru. | Berasal dari attempt lama. | Privat; Fase 2; DB-REQ-020. |
| ENT-016 | Target QR dinamis | Short code serta target internal yang valid. | Memiliki audit perubahan dan agregat harian. | Campuran; Fase 2; DB-REQ-014. |
| ENT-017 | Agregat QR harian | Counter akses berhasil/gagal tanpa PII. | Banyak agregat per ENT-016. | Operasional privat; Fase 2; DB-REQ-015. |
| ENT-018 | Peristiwa audit | Bukti tindakan kritis dan privileged. | Dapat merujuk buku, snapshot, QR, grant, atau operasi. | Audit privat; MVP/Fase 2; DB-REQ-021. |
| ENT-019 | Observasi kapasitas | Indikator kuota dan peringatan operasional. | Mendukung dashboard/operasi. | Operasional privat; MVP; DB-REQ-023; tidak wajib menjadi penyimpanan internal. |
| ENT-020 | Bukti backup/pemulihan | Bukti bahwa database, media, snapshot, dan restore diverifikasi. | Memeriksa mapping snapshot-media. | Operasional privat; MVP; DB-REQ-024; tidak wajib menjadi penyimpanan internal. |

**Bukan entitas persisten otomatis:** Status B pending/offline, proyeksi disclosure, konteks konflik sementara, riwayat revisi lengkap, progres Reader, preferensi aksesibilitas, dan objek biner Storage. Hal ini menerapkan AUD-DB-001 sampai AUD-DB-003.

## CDM-04 — Hubungan Antarentitas

| ID | Hubungan dan kardinalitas | Kepemilikan / lifecycle / penghapusan |
|---|---|---|
| REL-001 | ENT-003 Buku 1 → 0..N ENT-004 Alias slug. | Alias harus tetap menuju buku/slug valid; tidak menjadi redirect diam-diam ke target lain. |
| REL-002 | ENT-003 Buku 1 → 0..N ENT-005 Node struktur. | Struktur draf dapat diarsipkan/dihapus terbatas tanpa menghapus snapshot historis. |
| REL-003 | ENT-005 Node 1 → 0..N ENT-006 Komponen draf. | Mutasi struktur mengikuti CAS dan batas nesting. |
| REL-004 | ENT-003/005/006 → ENT-007 Tema. | Override opsional; penghapusan override kembali ke pewarisan, bukan orphan. |
| REL-005 | ENT-006 Komponen ↔ 0..N ENT-008 Media. | Media berreferensi tidak boleh dihapus tidak aman. |
| REL-006 | ENT-003 Buku 1 → 0..N ENT-009 Snapshot; 0..1 aktif. | Snapshot historis immutable dan berdependensi terlindungi. |
| REL-007 | ENT-009 Snapshot 1 → 0..N ENT-008 Media. | Media harus tersedia/terverifikasi sebelum publish atau rollback. |
| REL-008 | ENT-009 Snapshot 1 → 0..N ENT-010 Definisi aktivitas. | Attempt historis tetap dipin ke versi aktivitas asal. |
| REL-009 | ENT-010 Aktivitas 1 → 0..N ENT-011 Sesi siswa. | Sesi baru ditolak bila status publikasi tidak mengizinkan. |
| REL-010 | ENT-011 Sesi 1 → 0..1 ENT-012 Attempt. | Pemulihan memakai attempt sama; MVP satu attempt. Fase 2 hanya membuat sesi dan attempt baru melalui ENT-015 Retry grant yang sah; hasil lama dipertahankan. |
| REL-011 | ENT-012 Attempt 1 → 0..N ENT-013 Jawaban diterima. | Hanya jawaban sah sebelum deadline dapat digunakan untuk hasil. |
| REL-012 | ENT-012 Attempt 1 → 0..1 ENT-014 Hasil final. | Finalisasi idempoten; tidak ada hasil duplikat. |
| REL-013 | ENT-012 Attempt lama 1 → 0..N ENT-015 Retry grant historis. | Satu grant dikonsumsi paling banyak sekali dan tidak bypass lifecycle buku. |
| REL-014 | ENT-016 Target QR 1 → 0..N ENT-017 Agregat harian. | Tidak memuat identitas, IP, GPS, atau fingerprint. |
| REL-015 | ENT-016 Target QR 1 → 0..N ENT-018 Audit. | Perubahan target dipertahankan sebagai bukti audit. |
| REL-016 | Subjek kritis → 0..N ENT-018 Audit. | Penghapusan subjek dibatasi bila audit wajib masih diperlukan. |
| REL-017 | ENT-020 Bukti pemulihan → verifikasi snapshot/media. | Bukti dapat berasal dari sistem/provider/catatan operasional; bukan relasi fisik yang ditetapkan. |
| REL-018 | ENT-019 Observasi kapasitas → konteks operasional. | Sumber provider, perhitungan aplikasi, atau kombinasi masih terbuka. |

## CDM-05 — Aturan Integritas

| ID | Aturan |
|---|---|
| INV-001 | UUID tidak berubah akibat urut ulang, pindah induk, atau perubahan nomor urut. |
| INV-002 | Snapshot aktif/historis tidak berubah setelah publikasi. |
| INV-003 | Perubahan pointer aktif, audit wajib, dan pemulihan kegagalan diperlakukan atomik secara konseptual. |
| INV-004 | Publish gagal tidak boleh menampilkan snapshot parsial atau mengganti versi aktif lama. |
| INV-005 | Rollback hanya boleh mengaktifkan snapshot dengan media target terverifikasi. |
| INV-006 | Unpublish/revoke tidak menghapus histori wajib atau memberi nilai nol otomatis. |
| INV-007 | Mutasi draf stale tidak boleh menimpa mutasi lebih baru. |
| INV-008 | Retry/finalisasi dengan idempotency key sama tidak membuat hasil ganda. |
| INV-009 | Waktu server UTC menentukan validitas deadline, bukan waktu perangkat. |
| INV-010 | Media yang masih dirujuk snapshot/attempt tidak dapat dihapus tidak aman. |
| INV-011 | QR dinamis tidak boleh menuju target eksternal, siklus, tidak aktif, unpublish, atau revoke. |
| INV-012 | Aktor anonim tidak dapat membaca/memutasi data privat; operasi privileged melewati server tepercaya. |
| INV-013 | **DISETUJUI — ATURAN INTEGRITAS KONSEPTUAL:** setiap attempt tetap terikat pada definisi aktivitas dan versi publikasi asalnya; publish baru, rollback, atau perubahan draf tidak mengubah jawaban, hasil, atau dasar penilaian historis. |

## CDM-06 — Siklus Hidup Data

1. **Pembuatan buku:** ENT-003 dibuat dengan UUID stabil, metadata dan slug; alias lama dipertahankan bila slug berubah.
2. **Penyuntingan draf:** ENT-005 sampai ENT-007 bermutasi melalui expected revision; conflict tidak melakukan silent overwrite.
3. **Media:** ENT-008 draf tetap privat; hash/referensi dan verifikasi melindungi integritas media.
4. **Publish:** draf tervalidasi dirakit sebagai ENT-009 snapshot JSONB immutable lengkap; media diverifikasi; pointer aktif dan audit berubah atomik. Snapshot lengkap dipertahankan sebagai sumber historis, sedangkan Reader hanya memperoleh proyeksi publik yang diizinkan dari snapshot aktif.
5. **Lifecycle publikasi:** unpublish, immediate block, revoke, serta rollback mengubah akses/pointer tanpa menghancurkan histori wajib.
6. **Sesi dan attempt:** ENT-011 dibuat hanya saat aktivitas tercatat; token mentah tidak disimpan; ENT-012 dipin ke definisi aktivitas dan snapshot publikasi asal. Publish baru, rollback, atau perubahan draf tidak mengubah dasar penilaian historis attempt tersebut.
7. **Jawaban dan hasil:** jawaban sah disimpan dan dinilai melalui server tepercaya; finalisasi idempoten menghasilkan paling banyak satu ENT-014; disclosure adalah proyeksi server. Kunci jawaban, bobot rahasia, dan konfigurasi penilaian sensitif tidak dikirim kepada Reader.
8. **Pengarsipan dan penghapusan:** soft archive menyembunyikan data mutabel; hard delete membutuhkan pemeriksaan dependensi snapshot, media, hasil, dan audit.

## CDM-07 — Klasifikasi Keamanan dan Privasi

| Klasifikasi | Cakupan |
|---|---|
| Data publik | Metadata buku aktif, proyeksi publik yang diizinkan dari snapshot aktif (bukan snapshot lengkap), resolusi slug/deep link, QR statis valid. |
| Data privat administrator | Draf, struktur, komponen, tema, media draf, pengaturan, lifecycle controls. |
| Data privat siswa | Nama/kelas minimum, hash session token, attempt, jawaban, hasil sesuai otorisasi. |
| Data khusus server | Kunci jawaban, bobot rahasia, konfigurasi penilaian sensitif, logika scoring, token mentah, service-role secret, operasi privileged. Data penilaian rahasia dapat berada pada bagian snapshot immutable dengan akses dibatasi atau representasi immutable terpisah; pemilihan rancangan fisik tetap terbuka hingga tahap logical design. |
| Data audit/operasional | Audit, observasi kapasitas, bukti backup/pemulihan, target QR dan agregat yang diizinkan. |
| Data lokal perangkat | Status B, progres Reader, preferensi aksesibilitas, konteks konflik sementara. |
| Objek Supabase Storage | Media draf privat dan media publikasi immutable yang terverifikasi. |

Kunci jawaban, bobot rahasia, konfigurasi penilaian sensitif, token sesi mentah, dan data siswa tidak boleh masuk ke proyeksi snapshot publik. Pemisahan snapshot lengkap, proyeksi publik, dan data khusus server adalah batas akses konseptual; pemisahan ini tidak otomatis mewajibkan tabel atau entitas baru.

## CDM-08 — Pemisahan MVP dan Fase 2

| Area | MVP | Fase 2 |
|---|---|---|
| Draf/publikasi | CAS draf buku, snapshot immutable, publish, rollback, unpublish, revoke. | Penyempurnaan yang tidak mengubah invariant MVP. |
| Aktivitas | Identitas minimum, satu attempt, deadline server, finalisasi idempoten, hasil terfilter. | Retry grant dan attempt baru berizin. |
| QR | QR statis untuk URL buku sah. | QR dinamis, short code, audit target, agregat non-PII. |
| Operasional | Audit, monitoring kuota, backup/restore requirement. | Optimalisasi operasional/provider yang masih terbuka. |

## CDM-09 — Matriks Keterlacakan Kebutuhan

| DB-REQ | Pemenuhan konseptual |
|---|---|
| DB-REQ-001 | ENT-001, operasi tepercaya, INV-012. |
| DB-REQ-002 | ENT-002 dan validasi pengaturan privat. |
| DB-REQ-003 | ENT-003, REL-001/002/006, INV-001. |
| DB-REQ-004 | ENT-004, REL-001, resolusi slug sah. |
| DB-REQ-005 | ENT-005, REL-002/003, INV-001. |
| DB-REQ-006 | ENT-006/007, REL-003/004, validasi draf. |
| DB-REQ-007 | ENT-008, REL-005, objek Storage, INV-010. |
| DB-REQ-008 | Current revision pada draf, CAS process, INV-007; tanpa kewajiban full revision history. |
| DB-REQ-009 | ENT-009, REL-006—008, INV-002. |
| DB-REQ-010 | ENT-003/009/018, REL-006/016, INV-003/004. |
| DB-REQ-011 | Lifecycle process, ENT-003/009/018, INV-005/006. |
| DB-REQ-012 | Resolusi publik terkontrol, INV-012, proyeksi snapshot aktif. |
| DB-REQ-013 | Proses ekspor QR statis; tidak wajib menjadi entitas persisten. |
| DB-REQ-014 | ENT-016/018, REL-015, INV-011. |
| DB-REQ-015 | ENT-017, REL-014, agregat tanpa PII. |
| DB-REQ-016 | ENT-011, REL-009/010, hash token sesi. |
| DB-REQ-017 | ENT-010, snapshot immutable, data server-only. |
| DB-REQ-018 | ENT-012/013, REL-010/011, INV-008/009. |
| DB-REQ-019 | ENT-014, REL-012, disclosure sebagai proyeksi server. |
| DB-REQ-020 | ENT-015, REL-013, validasi server. |
| DB-REQ-021 | ENT-018, REL-015/016, audit tindakan kritis. |
| DB-REQ-022 | RLS/trusted server boundary, INV-012. |
| DB-REQ-023 | ENT-019, provider metric, catatan operasional. |
| DB-REQ-024 | ENT-020, backup media/database, restore evidence. |
| DB-REQ-025 | ENT-008/009/018, REL-005/007/016, INV-010. |
| DB-REQ-026 | Data lokal perangkat secara default; persistensi server tetap terbuka. |

## CDM-10 — Keputusan yang Masih Terbuka

- **DB-Q-007—010:** TERBUKA — instrumentasi publish, antrean jawaban lokal, kebijakan backup/provider, serta sumber/agregasi kuota.
- **IA-Q-001—004:** **DECIDED/CLOSED melalui CR-IA-001** — sidebar admin/URL stabil, breadcrumb kontekstual, informasi publish bertingkat yang aman, serta lokasi indikator antrean jawaban. Detail persistence browser, expiry, retry, dan recovery tetap terbuka pada keputusan teknis terkait.
- **IA-Q-005:** DISETUJUI/DITUTUP — satu area `P-ADM-013`; QR statis MVP, QR dinamis Fase 2, tanpa route baru.
- Detail rancangan logis yang belum diputuskan: bentuk final JSONB, representasi konseptual ENT-010 pada logical design, retensi, penamaan objek Storage, reference counting, RLS policy matrix, serta mekanisme transaksi privileged.

## CDM-11 — Catatan Pemeriksaan dan Persetujuan

### CR-DB-002 — Persetujuan dan Penguncian Model Data Konseptual

- **Status:** **DISETUJUI OLEH PEMILIK**.
- **Ruang lingkup:** Persetujuan model konseptual, pengesahan `INV-013`, dan penguncian dokumen pendukung konseptual.
- **Keputusan yang dipertahankan:** Keputusan yang tetap terbuka pada CDM-10 adalah DB-Q-007—010 dan detail rancangan logis yang dicantumkan; IA-Q-001—005 sudah memiliki keputusan tercatat melalui CR-IA-001 dan CR-IA-005.

`CR-DB-001` tetap berlaku dan tidak diubah. Versi `v1.0.1-approved-locked` mengunci penyelarasan administratif CR-IA-001 setelah audit konsistensi. FS-DOC-06 `DATABASE_DESIGN.md` secara keseluruhan belum disetujui atau dikunci. Perubahan substansial berikutnya terhadap dokumen konseptual memerlukan permintaan perubahan baru, analisis dampak, dan persetujuan pemilik proyek.
