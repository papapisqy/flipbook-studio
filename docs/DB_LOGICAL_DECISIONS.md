# KEPUTUSAN ARSITEKTUR LOGIS DATABASE — FLIPBOOK STUDIO

## LDR-00 — Identitas dan Status

- **Kode:** FS-DOC-06 — Supporting Logical Decision Record
- **Nama file:** `docs/DB_LOGICAL_DECISIONS.md`
- **Versi:** `v0.1.1-approved-locked`
- **Status:** **APPROVED & LOCKED — KEPUTUSAN LOGIS TERBATAS**
- **Nomor perubahan:** `CR-DB-003 — PERSETUJUAN KEPUTUSAN ARSITEKTUR LOGIS DATABASE`
- **Dasar:** Persetujuan eksplisit pemilik proyek setelah audit independen Revisi 06C-4.
- **Bahasa:** Indonesia.

### Riwayat Revisi Terkendali

| CR | Tanggal | Dampak administratif | Versi |
|---|---|---|---|
| CR-IA-001 | 18 November 2026 | Menyelaraskan status IA-Q-001—IA-Q-004 sebagai keputusan pemilik tanpa mengubah LDB-Q, keputusan CR-DB-003, kandidat data, atau rancangan fisik. | `v0.1.0-owner-approved-decisions` → `v0.1.1-revised-cr-ia-001` |
| CR-IA-001-RELOCK | 18 November 2026 | Penguncian kembali setelah audit konsistensi tanpa mengubah LDB-Q, keputusan CR-DB-003, kandidat data, atau rancangan fisik. | `v0.1.1-revised-cr-ia-001` → `v0.1.1-approved-locked` |

Dokumen ini mencatat keputusan arsitektur logis yang terbatas. Dokumen ini bukan pengganti `DATABASE_DESIGN.md`, bukan skema fisik database, dan tidak menetapkan nama tabel final, kolom, tipe PostgreSQL, indeks fisik, SQL, migrasi, maupun kebijakan RLS sintaktis. FS-DOC-06 secara keseluruhan belum disetujui atau dikunci.

## LDR-01 — Dokumen Acuan

| Dokumen | Status dan peran |
|---|---|
| FS-DOC-01 `PRODUCT_REQUIREMENTS.md` | APPROVED & LOCKED; kebutuhan snapshot, penilaian, media, keamanan, dan reliabilitas. |
| FS-DOC-02 `APP_FLOW.md` | APPROVED & LOCKED; alur publish, rollback, aktivitas, Storage, dan operasi tepercaya. |
| FS-DOC-03 `INFORMATION_ARCHITECTURE.md` | `v1.0.2-approved-locked`; batas informasi publik/admin dan keputusan IA. |
| FS-DOC-04 `CORE_FEATURES.md` | `v1.0.1-approved-locked`; feature, dependency, dan acceptance criteria turunan. |
| FS-DOC-05 `UI_UX_SPEC.md` | `v1.0.1-approved-locked`; batas UI, privacy, dan traceability. |
| `DB_CONCEPTUAL_DECISIONS.md` | Catatan pendukung `CR-DB-001`; arah konseptual yang telah disetujui. |
| `DATABASE_CONCEPTUAL_MODEL.md` | `v1.0.1-approved-locked`; model konseptual dan `CR-DB-002`. |

## LDR-02 — Ruang Lingkup CR-DB-003

`CR-DB-003` menyetujui hanya empat keputusan logical: LDB-Q-001 Alternatif A, LDB-Q-002 Alternatif B, LDB-Q-003 Alternatif C, dan LDB-Q-004 Alternatif A. Perubahan ini juga mencatat AUD-06C4-001 dan AUD-06C4-002 sebagai ketentuan wajib.

Persetujuan ini tidak menutup keputusan logical lain, tidak mengubah CR-DB-001 atau CR-DB-002, dan tidak mengunci keseluruhan logical database design maupun FS-DOC-06.

## LDR-03 — Keputusan LDB-Q-001

**Keputusan:** **DISETUJUI OLEH PEMILIK — CR-DB-003.**

**Alternatif A: snapshot JSONB tunggal terstruktur dengan versi skema internal.**

1. Setiap versi publikasi memiliki snapshot JSONB lengkap dan immutable.
2. Snapshot memiliki identitas versi dan penanda versi skema internal.
3. Reader tidak merekonstruksi publikasi dari draf yang berubah.
4. Publish, rollback, dan histori mengacu pada versi immutable yang tepat.
5. Perubahan format wajib menjaga kompatibilitas versi historis.
6. Struktur field JSONB final belum ditetapkan oleh keputusan ini.

Keputusan ini memenuhi pemisahan draf relasional dari snapshot terbit immutable dan tidak mengubah requirement snapshot lengkap.

## LDR-04 — Keputusan LDB-Q-002

**Keputusan:** **DISETUJUI OLEH PEMILIK — CR-DB-003.**

**Alternatif B: representasi data penilaian rahasia immutable yang terpisah secara akses dan terikat pada versi asal.**

1. Kunci jawaban, bobot rahasia, dan konfigurasi penilaian sensitif tidak tersedia pada payload publik.
2. Representasi rahasia berada pada batas akses privat/server tepercaya.
3. Representasi tersebut terikat secara immutable pada snapshot publikasi dan identitas versi aktivitas asal.
4. Penilaian menggunakan definisi aktivitas dan rahasia yang sesuai dengan attempt historis.
5. Publish tidak boleh mengaktifkan versi apabila representasi rahasia yang diwajibkan tidak valid atau tidak konsisten.
6. Rancangan wajib memenuhi `INV-013`.
7. Nama tabel, kolom, tipe, constraint fisik, dan kebijakan RLS rinci belum ditetapkan.

Pemisahan representasi tidak menghapus kewajiban memiliki snapshot JSONB lengkap sesuai baseline.

## LDR-05 — Keputusan LDB-Q-003

**Keputusan:** **DISETUJUI OLEH PEMILIK — CR-DB-003.**

**Alternatif C: proyeksi publik dibuat dan divalidasi saat publish, sedangkan akses Reader tetap diperiksa saat permintaan.**

1. Proyeksi publik immutable dibuat dari versi publikasi tervalidasi.
2. Proyeksi hanya memuat data yang boleh dibaca Reader.
3. Proyeksi tidak memuat kunci jawaban, bobot rahasia, token, atau data siswa.
4. Akses Reader wajib memeriksa status publikasi dan versi aktif.
5. Unpublish dan emergency revoke membatasi akses baru melalui seluruh jalur yang dikendalikan aplikasi.
6. Snapshot lengkap tidak boleh tersedia melalui akses anonim langsung ke Supabase.
7. Strategi cache dan invalidasi belum ditentukan secara fisik.

## LDR-06 — Keputusan LDB-Q-004

**Keputusan:** **DISETUJUI OLEH PEMILIK — CR-DB-003.**

**Alternatif A: dependensi media menggunakan referensi eksplisit.**

1. Dependensi snapshot terhadap media dapat diperiksa tanpa pencarian bebas seluruh JSONB.
2. Media yang masih diperlukan snapshot aktif atau historis tidak boleh dihapus tidak aman.
3. Dependensi mendukung verifikasi rollback.
4. Media tersedia dan terverifikasi sebelum aktivasi publikasi.
5. Kegagalan operasi Storage tidak boleh menghasilkan snapshot aktif parsial.
6. Objek Storage yang tidak direferensikan akibat kegagalan harus dapat direkonsiliasi.
7. Detail reference counting, penamaan Storage, dan retensi belum diputuskan.

## LDR-07 — Ketentuan AUD-06C4-001

**Status:** **DISETUJUI OLEH PEMILIK — KETENTUAN WAJIB.**

**Pengendalian cache dan emergency revoke:**

- Pemeriksaan status publikasi ditegakkan pada jalur akses yang dikendalikan aplikasi.
- Cache, URL publik, atau Storage tidak boleh menyediakan jalur akses baru yang melewati kontrol lifecycle.
- Emergency revoke memblokir akses baru yang dikendalikan aplikasi.
- Salinan yang telah diterima atau disimpan pengguna sebelumnya tidak dapat dijamin ditarik kembali.
- Detail gateway, cache-control, invalidasi, dan URL media ditentukan pada rancangan teknis lanjutan.

## LDR-08 — Ketentuan AUD-06C4-002

**Status:** **DISETUJUI OLEH PEMILIK — KETENTUAN WAJIB.**

**Perlindungan media terhadap penghapusan bersamaan:**

- Pemeriksaan dependensi saja tidak cukup apabila penghapusan dapat berjalan bersamaan dengan publish atau rollback.
- Proses penghapusan dikoordinasikan dengan proses yang membuat atau menggunakan referensi media.
- Media yang diperlukan snapshot, attempt historis relevan, atau proses aktivasi tidak boleh dihapus.
- Rancangan lanjutan menjelaskan perlindungan terhadap kondisi balapan.
- Operasi PostgreSQL dan Supabase Storage tidak diasumsikan berada dalam satu transaksi terdistribusi otomatis.

## LDR-09 — Integritas dan Keamanan

Keputusan ini konsisten dengan ENT-001 sampai ENT-020, REL-001 sampai REL-018, INV-001 sampai INV-013, serta DB-REQ-001 sampai DB-REQ-026.

- Reader hanya menerima proyeksi publik.
- Rahasia penilaian berada pada batas server tepercaya.
- Attempt tetap dipin ke definisi aktivitas dan versi publikasi asal.
- Publish dan rollback menjaga integritas snapshot serta media.
- RLS memakai prinsip default-deny.
- Token siswa dibuat di browser sesuai baseline; server hanya menyimpan hash-nya.
- Operasi PostgreSQL dan Storage tidak diasumsikan menjadi satu transaksi terdistribusi.

## LDR-10 — Keputusan yang Masih Terbuka

| ID | Status | Lingkup tetap terbuka |
|---|---|---|
| LDB-Q-005 | TERBUKA | Bentuk audit generik atau per-domain. |
| LDB-Q-006 | TERBUKA | Retensi idempotency key dan hasil operasi. |
| LDB-Q-007 | TERBUKA | Sumber observasi kapasitas. |
| LDB-Q-008 | TERBUKA | Persistensi antrean jawaban lokal. |
| DB-Q-007 sampai DB-Q-010 | TERBUKA | Instrumentasi publish, antrean lokal, backup/provider, dan metrik kuota. |
| IA-Q-001 sampai IA-Q-004 | DECIDED/CLOSED — CR-IA-001 | Keputusan pemilik tercatat: navigasi sidebar admin, breadcrumb kontekstual, informasi publish bertingkat yang aman, dan lokasi indikator antrean jawaban. Detail teknis tetap pada keputusan DB/LDB terkait. |
| IA-Q-005 | DISETUJUI/DITUTUP | Keputusan sebelumnya tetap berlaku. |

LDB-Q-001 sampai LDB-Q-004 ditandai disetujui hanya pada ruang lingkup CR-DB-003. Semua pertanyaan rancangan logis belum selesai.

## LDR-11 — Keterlacakan

| Catatan keputusan | Invariant / DB-REQ | Sumber baseline yang dapat diverifikasi |
|---|---|---|
| CR-DB-003; LDB-Q-001 | INV-002, INV-003, INV-004; DB-REQ-009, DB-REQ-010 | `PRODUCT_REQUIREMENTS.md` FR-PUB-003/004 (baris 193–194); `APP_FLOW.md` AF-02-015 (baris 692–710); `DATABASE_CONCEPTUAL_MODEL.md` baris 94–96. |
| CR-DB-003; LDB-Q-002 | INV-012, INV-013; DB-REQ-017, DB-REQ-018, DB-REQ-019, DB-REQ-022 | `PRODUCT_REQUIREMENTS.md` FR-ACT-003 (baris 216), NFR-SEC-004 (baris 258); `APP_FLOW.md` AF-03-014/015 (baris 1097–1122); `DATABASE_CONCEPTUAL_MODEL.md` baris 104–105. |
| CR-DB-003; LDB-Q-003 | INV-002, INV-004, INV-012; DB-REQ-009, DB-REQ-010, DB-REQ-012, DB-REQ-019 | `DATABASE_CONCEPTUAL_MODEL.md` baris 35, 51, 112, 122–130; `APP_FLOW.md` AF-03-024 (baris 1228–1236). |
| CR-DB-003; LDB-Q-004 | INV-005, INV-010; DB-REQ-007, DB-REQ-009, DB-REQ-025 | `PRODUCT_REQUIREMENTS.md` FR-MED-001/003 (baris 240–242); `APP_FLOW.md` AF-03-021 (baris 1187–1199); `DATABASE_CONCEPTUAL_MODEL.md` baris 97, 102. |
| AUD-06C4-001 | INV-004, INV-006, INV-012; DB-REQ-010, DB-REQ-011, DB-REQ-012, DB-REQ-022 | `PRODUCT_REQUIREMENTS.md` FR-PUB-006/007 (baris 196–197); `APP_FLOW.md` AF-03-018—020. |
| AUD-06C4-002 | INV-005, INV-010; DB-REQ-007, DB-REQ-009, DB-REQ-025 | `CORE_FEATURES.md` CF-AC-008; `PRODUCT_REQUIREMENTS.md` FR-MED-003 (baris 242). |

## LDR-12 — Pengendalian Perubahan dan Batas Persetujuan

- `CR-DB-001` tetap berlaku.
- `CR-DB-002` tetap berlaku.
- `CR-DB-003` disetujui oleh pemilik proyek pada ruang lingkup dokumen ini.
- Baseline sebelumnya tetap dapat ditelusuri; FS-DOC-03, FS-DOC-04, FS-DOC-05, dan model konseptual telah dikunci kembali setelah audit konsistensi CR-IA-001.
- Model konseptual tetap terkunci.
- Persetujuan CR-DB-003 tidak mengunci keseluruhan rancangan logis dan tidak mengunci FS-DOC-06.
- Setiap perubahan terhadap keputusan CR-DB-003 memerlukan change request baru, analisis dampak, dan persetujuan pemilik proyek.
