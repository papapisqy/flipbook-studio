# SPESIFIKASI DATABASE FINAL — DRAF PERSIAPAN

## DFS-00 — Metadata, Versi, Status, dan Baseline

| Item | Nilai |
|---|---|
| Proyek | Flipbook Studio |
| Identitas | FS-DOC-06 — Database Final Specification Draft |
| Versi | `v0.7.3-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Menyiapkan spesifikasi menuju desain fisik tanpa membuat SQL, migrasi, atau implementasi. |

Baseline: FS-DOC-01 sampai FS-DOC-05; `DB_CONCEPTUAL_DECISIONS.md`; `DATABASE_CONCEPTUAL_MODEL.md`; `DB_LOGICAL_DECISIONS.md`; `DATABASE_LOGICAL_MODEL.md`; dan `DATABASE_SECURITY_LIFECYCLE_DRAFT.md`. CR-DB-001 sampai CR-DB-004 tetap berlaku. FS-DOC-06 secara keseluruhan belum disetujui atau dikunci.

### Riwayat Perubahan

| Versi | Tahap | Perubahan | Status |
|---|---|---|---|
| `v0.1.0-draft` | 06E-1 | Kerangka awal DFS-00 sampai DFS-16. | DRAF |
| `v0.2.0-draft` | 06E-2 | Perincian atribut 23 kandidat, REL-001—018, kontrak integritas, prioritas keputusan, GAP/OPEN, dan keterlacakan. | DRAF — BELUM DIAUDIT |
| `v0.2.1-draft` | 06E-2A | Rincian atribut konseptual per kandidat dan matriks keterlacakan INV-001—013. | DRAF — BELUM DIAUDIT |
| `v0.3.0-draft` | 06E-3 | Kontrak desain kritis, alternatif mitigasi GAP/OPEN, keputusan P0, dan kriteria bukti. | DRAF — BELUM DIAUDIT |
| `v0.4.0-draft` | 06E-4A | Konsolidasi empat kebijakan P0 yang disetujui pemilik; rincian teknis tetap belum final. | DRAF — BELUM DIAUDIT |
| `v0.4.0-draft` | 06E-4A-R1 | Koreksi audit terbatas atas status retensi, strategi backup, referensi skenario, dan kesiapan. | DRAF — BELUM DIAUDIT |
| `v0.5.0-draft` | 06E-4B-A | Konsolidasi enam keputusan P1 yang disetujui pemilik; detail teknis tetap belum final. | DRAF — BELUM DIAUDIT |
| `v0.5.0-draft` | 06E-4B-A-R1 | Penyelesaian dua temuan audit pada penghalang SCN-06D3-034 dan SCN-06D3-044. | DRAF — BELUM DIAUDIT |
| `v0.6.0-draft` | Audit dan konsolidasi otomatis | Integrasi DEC-06E5-001—010 dan DEC-06E6-001—006; penyelarasan kontrak kritis dan keterlacakan. | DRAF — BELUM DIAUDIT |

| `v0.7.0-draft` | 06E-7 | Pencatatan empat keputusan P2 pemilik untuk IA-Q-001 sampai IA-Q-004 dan rencana bertahap desain fisik tanpa SQL atau perubahan baseline terkunci. | DRAF — BELUM DIAUDIT |
| `v0.7.1-draft` | 06E-7-R1 | Pencatatan CR-IA-001 dan keputusan teknis retry grant: sesi baru serta attempt baru pada Fase 2; normalisasi rujukan skenario audit. | DRAF — BELUM DIAUDIT |

| `v0.7.2-draft` | CR-IA-001 alignment | Penyelarasan referensi administratif setelah patch terkendali FS-DOC-03/04/05 dan dokumen konseptual/logis; tidak mengubah GAP, OPEN, atau keputusan teknis. | DRAF — BELUM DIAUDIT |
| `v0.7.3-draft` | CR-IA-001 re-lock sync | Penyelarasan referensi status setelah penguncian ulang terkendali; dokumen tetap DRAF dan tidak mengubah GAP, OPEN, atau keputusan teknis. | DRAF — BELUM DIAUDIT |

## DFS-01 — Ruang Lingkup dan Batas Spesifikasi

Dokumen ini menerjemahkan kontrak konseptual/logis yang telah disetujui menjadi kebutuhan desain fisik yang masih perlu diaudit. Dokumen tidak menetapkan nama tabel final, SQL, tipe PostgreSQL final, indeks fisik, constraint fisik, RLS sintaktis, endpoint, maupun provider capability. Keputusan bertanda **DISETUJUI** diwarisi dari baseline; item bertanda **TERBUKA** memerlukan keputusan pemilik atau audit teknis lanjutan.

## DFS-02 — Inventaris 23 Kandidat Data Logis

| # | Kandidat | Asal | Status konseptual/logis |
|---:|---|---|---|
| 1 | Principal admin | ENT-001 | KANDIDAT privat MVP |
| 2 | Konfigurasi aplikasi | ENT-002 | KANDIDAT privat MVP |
| 3 | Buku | ENT-003 | KEWAJIBAN DATA MVP |
| 4 | Alias slug | ENT-004 | KEWAJIBAN DATA MVP |
| 5 | Node struktur draf | ENT-005 | KEWAJIBAN DATA MVP |
| 6 | Komponen draf | ENT-006 | KEWAJIBAN DATA MVP/Fase 2 |
| 7 | Override tema | ENT-007 | KANDIDAT MVP/Fase 2 |
| 8 | Metadata media | ENT-008 | KEWAJIBAN DATA MVP |
| 9 | Versi publikasi/snapshot | ENT-009 | KEWAJIBAN DATA MVP |
| 10 | Proyeksi snapshot publik | Turunan ENT-009 | KEWAJIBAN DATA; bukan record fisik wajib per versi |
| 11 | Definisi aktivitas rahasia | ENT-010 | KEWAJIBAN DATA MVP |
| 12 | Sesi siswa | ENT-011 | KEWAJIBAN DATA MVP |
| 13 | Attempt aktivitas | ENT-012 | KEWAJIBAN DATA MVP |
| 14 | Jawaban diterima | ENT-013 | KEWAJIBAN DATA MVP |
| 15 | Hasil final | ENT-014 | KEWAJIBAN DATA MVP |
| 16 | Retry grant | ENT-015 | KEWAJIBAN DATA Fase 2 |
| 17 | Target QR dinamis | ENT-016 | KANDIDAT Fase 2 |
| 18 | Agregat QR harian | ENT-017 | KANDIDAT Fase 2 |
| 19 | Peristiwa audit | ENT-018 | KEWAJIBAN DATA MVP/Fase 2 |
| 20 | Observasi kapasitas | ENT-019 | BUKAN PENYIMPANAN FISIK WAJIB |
| 21 | Bukti backup/pemulihan | ENT-020 | BUKAN PENYIMPANAN FISIK WAJIB |
| 22 | Hasil operasi idempoten | Turunan DB-Q-004 | Kebijakan lifecycle DISETUJUI PEMILIK; rincian retensi BELUM FINAL |
| 23 | Dependensi snapshot-media | REL-007 | KEWAJIBAN DATA MVP |

## DFS-03 — Klasifikasi Entitas Fisik, Representasi Logis, dan Data Operasional

| Kelas | Kandidat | Kontrak |
|---|---|---|
| Calon relasi persisten | Buku, alias, node, komponen, media, versi, aktivitas rahasia, sesi, attempt, jawaban, hasil, retry, audit | Kontrak audit generik terpusat berklasifikasi domain DISETUJUI PEMILIK; bentuk fisik belum final. |
| JSONB immutable | Snapshot publikasi; bagian versi aktivitas sesuai keputusan logical | LDB-Q-001 dan LDB-Q-002 disetujui; evolusi schema tetap LDM-Q-001. |
| Proyeksi/turunan | Proyeksi publik, disclosure hasil, hasil idempoten | Bukan tabel otomatis; proyeksi publik tervalidasi sebelum aktivasi. |
| Storage | Objek media | Metadata/referensi wajib; Storage tidak atomik dengan PostgreSQL. |
| Client-local | Status B, progres Reader, preferensi, konflik sementara, antrean jawaban terbatas | Antrean lokal dibatasi sesi/attempt; bukan bukti server dan token sesi mentah tidak dipersistenkan otomatis. |
| Operasional | Kapasitas, backup/restore evidence, reconciliation | Telemetri provider dan perhitungan aplikasi dapat dikombinasikan; bentuk penyimpanan tidak diwajibkan. |

## DFS-04 — Inventaris Atribut dan Kebutuhan Tipe Data

Istilah “atribut” di bawah adalah kebutuhan konseptual/logis, bukan nama kolom atau tipe PostgreSQL final. `Wajib` berarti kewajiban nilai secara konseptual; `Kunci` berarti identitas/keunikan yang diperlukan. Klasifikasi **DISETUJUI** diwarisi dari baseline atau CR terkunci, **TURUNAN TERJUSTIFIKASI** diperlukan untuk menjalankan kontrak tersebut, dan **USULAN BELUM DISETUJUI** tidak boleh menjadi keputusan fisik tanpa audit lanjutan.

| # | Kandidat; asal | Fungsi dan atribut konseptual | Klasifikasi; wajib/kunci | Relasi, mutabilitas, keamanan/lifecycle | Risiko dan keputusan terbuka |
|---:|---|---|---|---|---|
| 1 | Principal admin; ENT-001 | Identitas principal, status otorisasi, scope administrasi. | DISETUJUI; identitas wajib dan unik. | Subjek audit; mutable terbatas; privat admin. | Escalation/IDOR; detail claims fisik belum diputuskan. |
| 2 | Konfigurasi aplikasi; ENT-002 | Nilai konfigurasi aplikasi yang berotorisasi dan jejak perubahan. | TURUNAN TERJUSTIFIKASI; identitas konfigurasi wajib. | Diaudit; mutable terkontrol; privat. | Konfigurasi rahasia/publik tercampur; LDB-Q-005. |
| 3 | Buku; ENT-003 | UUID stabil, metadata, slug aktif, status draf/lifecycle, revision saat ini. | DISETUJUI; UUID wajib/unik; slug sah. | Induk alias/node/versi; mutable melalui CAS; privat sampai proyeksi publik. | Stale overwrite/slug salah; INV-001/007. |
| 4 | Alias slug; ENT-004 | Alias, referensi buku, status/resolusi alias. | DISETUJUI; alias unik dalam scope resolusi. | Bergantung pada buku; mutable lifecycle; publik hanya jika resolusi sah. | Alias mengarah salah/loop; REL-001, INV-012. |
| 5 | Node struktur draf; ENT-005 | UUID stabil, parent, jenis, posisi, status arsip. | DISETUJUI; UUID wajib/unik; parent/posisi konseptual wajib bila berlaku. | Anak buku/node; mutable CAS; privat draf. | Siklus/nesting/urut rusak; REL-002, INV-001/007. |
| 6 | Komponen draf; ENT-006 | UUID stabil, node pemilik, jenis, konfigurasi konten, posisi. | DISETUJUI; UUID wajib/unik. | Mengacu node, tema, media; mutable CAS; privat draf. | Referensi media/struktur inkonsisten; REL-003/005. |
| 7 | Override tema; ENT-007 | Scope penerapan dan nilai override. | TURUNAN TERJUSTIFIKASI; identitas scope wajib bila dipakai. | Menempel buku/node/komponen; mutable; privat draf. | Orphan/pewarisan salah; representasi REL-004 terbuka. |
| 8 | Metadata media; ENT-008 | Identitas media, hash/verifikasi, lokasi objek, status kesiapan, referensi lifecycle. | DISETUJUI; identitas dan verifikasi wajib. | Dirujuk komponen/snapshot; mutable status, objek immutable; privat/Storage. | Hapus saat dirujuk/mismatch Storage; LDM-Q-002, INV-010. |
| 9 | Versi publikasi/snapshot; ENT-009 | Identitas versi, snapshot immutable, schema version, status lifecycle, jejak aktivasi. | DISETUJUI; identitas wajib/unik; isi immutable. | Banyak per buku, satu aktif; privat operasional dengan proyeksi publik. | Versi parsial/riwayat berubah; INV-002—005, LDM-Q-001. |
| 10 | Proyeksi snapshot publik; turunan ENT-009 | Konten Reader yang diizinkan, identitas sumber versi, bukti validasi lifecycle. | DISETUJUI; sumber versi/validasi wajib. | Turunan immutable dari snapshot; publik kondisional. | Rahasia bocor/cache melewati revoke; LDB-Q-003. |
| 11 | Definisi aktivitas rahasia; ENT-010 | Identitas aktivitas dalam versi, aturan, deadline, kunci dan bobot rahasia. | DISETUJUI; identitas versi/aktivitas wajib. | Terikat snapshot; immutable setelah publish; server-only. | Secret masuk proyeksi publik; INV-013, LDB-Q-002. |
| 12 | Sesi siswa; ENT-011 | Identitas sesi, hash token/verifier, scope aktivitas, status/lifecycle. | DISETUJUI; token mentah dilarang disimpan; hash/verifier wajib. | Mengacu aktivitas dan attempt; mutable lifecycle; privat siswa/server. | Replay/IDOR/sesi saat revoke; REL-009/010, INV-012. |
| 13 | Attempt aktivitas; ENT-012 | Identitas attempt, sesi, versi/aktivitas asal, deadline UTC, status finalisasi. | DISETUJUI; identitas wajib; satu attempt MVP. | Dipin historis; mutable sampai final; privat siswa/server. | Attempt baru tak sah/histori berubah; INV-009/013. |
| 14 | Jawaban diterima; ENT-013 | Identitas jawaban, attempt, waktu server diterima, payload sah, key idempotensi. | DISETUJUI; relasi attempt/waktu server wajib. | Banyak per attempt; catatan sah tidak ditimpa; privat/server-only. | Terima terlambat/duplikasi; INV-008/009; LDB-Q-006. |
| 15 | Hasil final; ENT-014 | Identitas attempt, outcome final, dasar disclosure terbatas, waktu finalisasi. | DISETUJUI; maksimal satu hasil per attempt. | Immutable setelah finalisasi; privat dengan proyeksi server. | Double result/rahasia bocor; REL-012, INV-008/013. |
| 16 | Retry grant; ENT-015 | Identitas grant, attempt asal, verifier, kedaluwarsa, status konsumsi. | DISETUJUI Fase 2; verifier/expiry wajib. | Konsumsi grant membuat sesi baru dan attempt baru yang sah; satu kali konsumsi; privat/server-only. | Reuse/bypass lifecycle; REL-010/013, INV-006/008. |
| 17 | Target QR dinamis; ENT-016 | Identitas/short code, target internal, status target dan lifecycle. | DISETUJUI Fase 2; short code/target wajib. | Dirujuk agregat/audit; mutable terkontrol; publik hanya resolusi kondisional. | Eksternal/siklus/target tidak aktif; INV-011. |
| 18 | Agregat QR harian; ENT-017 | Konteks target, periode agregasi, hitungan non-PII. | TURUNAN TERJUSTIFIKASI Fase 2; target/periode wajib. | Turunan dari resolusi sah; operasional privat admin. | PII tersimpan/agregasi keliru; REL-014. |
| 19 | Peristiwa audit; ENT-018 | Aktor/komponen, tindakan, subjek, waktu, hasil, bukti aman. | DISETUJUI; identitas peristiwa dan waktu wajib. | Banyak subjek kritis; append-only konseptual; operasional privat. | Token/PII berlebih atau bukti hilang; LDB-Q-005. |
| 20 | Observasi kapasitas; ENT-019 | Sumber metrik, waktu observasi, ringkasan kapasitas/kuota. | USULAN BELUM DISETUJUI sebagai penyimpanan internal. | Operasional; dapat provider/perhitungan; lifecycle belum final. | Data usang/cost overclaim; LDB-Q-007, DB-Q-010. |
| 21 | Bukti backup/pemulihan; ENT-020 | Sumber bukti, cakupan data/media, waktu, hasil verifikasi restore. | TURUNAN TERJUSTIFIKASI; bukti bila operasi dilakukan. | Operasional/provider; bukan relasi fisik wajib. | Restore tanpa media/mapping; DB-Q-009, REL-017. |
| 22 | Hasil operasi idempoten; turunan DB-Q-004 | Key operasi, scope, outcome sah, bukti replay, masa retensi. | Kebijakan lifecycle DISETUJUI PEMILIK — 06E-4; detail BELUM FINAL. | Terikat operasi privat; immutable per key secara konseptual. | Replay/outcome ganda; INV-008, LDB-Q-006, DEC-06E4-001. |
| 23 | Dependensi snapshot-media; REL-007 | Identitas snapshot/attempt, media, status verifikasi dependensi. | DISETUJUI; kedua referensi wajib/unik bersama. | Immutable untuk snapshot; privat operasional. | Media hilang pada publish/rollback; INV-005/010, LDB-Q-004. |

Tipe PostgreSQL, penamaan kolom, nullable final, enum fisik, presisi waktu, format JSONB, strategi verifier tambahan, dan bentuk fisik hasil idempoten **tetap TERBUKA**; tabel ini tidak menetapkannya.

### Register Atribut Konseptual Individual

| Kandidat | Atribut konseptual | Makna | Wajib/kondisional | Identitas/keunikan | Klasifikasi keputusan | Privasi | Mutabilitas | Referensi baseline | Status verifikasi |
|---|---|---|---|---|---|---|---|---|---|
| 1 Principal admin | Identitas principal | Subjek administrator untuk otorisasi/audit. | Wajib. | Unik konseptual. | DISETUJUI. | Privat admin. | Stabil. | ENT-001; DB-REQ-001; INV-012. | TERVERIFIKASI konseptual. |
| 1 Principal admin | Scope/status akses | Batas tindakan yang boleh diminta. | Wajib saat ada akses. | Terikat principal. | TURUNAN TERJUSTIFIKASI. | Privat admin. | Mutable terotorisasi. | FR-ADM-002; NFR-SEC-001. | TERVERIFIKASI konseptual. |
| 2 Konfigurasi | Identitas konfigurasi | Pembeda nilai konfigurasi yang dikelola. | Kondisional bila konfigurasi dipersistenkan. | BELUM DITENTUKAN. | USULAN BELUM DISETUJUI. | Privat. | Mutable terkontrol. | ENT-002; DB-REQ-002. | BELUM DITENTUKAN. |
| 2 Konfigurasi | Nilai dan jejak perubahan | Nilai aman serta bukti perubahan terotorisasi. | Kondisional. | Terikat identitas konfigurasi. | TURUNAN TERJUSTIFIKASI. | Privat/server-only bila rahasia. | Mutable; audit wajib bila kritis. | FR-ADM-004; DB-REQ-021. | TERVERIFIKASI konseptual. |
| 3 Buku | UUID stabil | Identitas buku yang tidak berubah karena reorder/slug. | Wajib. | Unik konseptual. | DISETUJUI. | Privat sampai diproyeksikan. | Immutable identitas. | ENT-003; INV-001; DB-REQ-003. | TERVERIFIKASI. |
| 3 Buku | Metadata, slug aktif, revision | Metadata draf, resolusi slug, dan dasar CAS. | Wajib; metadata rinci kondisional. | Slug sah dalam scope. | DISETUJUI/TURUNAN. | Privat draf. | Mutable melalui CAS. | DB-REQ-003/004/008; INV-007. | TERVERIFIKASI konseptual. |
| 4 Alias slug | Nilai alias | Alias yang dapat diresolusikan sah. | Kondisional. | Unik dalam scope resolusi. | DISETUJUI. | Publik kondisional. | Mutable lifecycle. | ENT-004; REL-001; DB-REQ-004. | TERVERIFIKASI. |
| 4 Alias slug | Referensi buku/status | Tujuan buku dan status resolusi alias. | Wajib bila alias ada. | Terikat alias. | DISETUJUI. | Publik kondisional. | Mutable terotorisasi. | FR-LNK-002/003; INV-012. | TERVERIFIKASI konseptual. |
| 5 Node draf | UUID dan parent | Identitas node dan posisinya dalam hierarki. | Wajib. | UUID unik; parent kondisional untuk akar. | DISETUJUI. | Privat draf. | Identitas stabil; parent dapat berubah CAS. | ENT-005; REL-002; INV-001/007. | TERVERIFIKASI. |
| 5 Node draf | Jenis, posisi, arsip | Struktur/urutan dan lifecycle node. | Wajib saat node aktif. | Unik urutan BELUM DITENTUKAN. | TURUNAN TERJUSTIFIKASI. | Privat draf. | Mutable CAS. | DB-REQ-005; AF-03-024. | TERVERIFIKASI konseptual. |
| 6 Komponen draf | UUID, node pemilik, jenis | Identitas komponen dan tempatnya. | Wajib. | UUID unik. | DISETUJUI. | Privat draf. | Stabil identitas; konten mutable CAS. | ENT-006; REL-003; DB-REQ-006. | TERVERIFIKASI. |
| 6 Komponen draf | Konfigurasi/posisi | Konten dan urutan komponen. | Wajib sesuai jenis komponen. | BELUM DITENTUKAN per jenis. | TURUNAN TERJUSTIFIKASI. | Privat draf. | Mutable CAS. | FR-CMP-001; REL-003/005. | TERVERIFIKASI konseptual. |
| 7 Override tema | Scope override | Buku/node/komponen yang menerima override. | Kondisional. | Representasi scope BELUM DITENTUKAN. | USULAN BELUM DISETUJUI. | Privat draf. | Mutable. | ENT-007; REL-004. | BELUM DITENTUKAN. |
| 7 Override tema | Nilai override | Nilai yang diwariskan/ditimpa. | Kondisional. | Terikat scope. | TURUNAN TERJUSTIFIKASI. | Privat draf. | Mutable. | DB-REQ-006; FR-THM-001. | TERVERIFIKASI konseptual. |
| 8 Metadata media | Identitas, hash, lokasi | Pembeda media, verifikasi integritas, dan objek Storage. | Wajib. | Identitas unik; hash/strategi dedupe BELUM DITENTUKAN. | DISETUJUI/TURUNAN. | Privat/Storage. | Metadata status mutable; objek immutable. | ENT-008; DB-REQ-007. | TERVERIFIKASI konseptual. |
| 8 Metadata media | Status kesiapan/dependensi | Kelayakan media untuk publish/rollback. | Wajib saat dirujuk. | Terikat media. | DISETUJUI. | Privat operasional. | Mutable terkontrol. | REL-005/007; INV-005/010. | TERVERIFIKASI. |
| 9 Snapshot | Identitas versi dan schema version | Pembeda snapshot serta versi pembacaan historis. | Wajib. | Unik per versi konseptual. | DISETUJUI. | Privat operasional. | Immutable setelah publish. | ENT-009; INV-002; LDB-Q-001. | TERVERIFIKASI. |
| 9 Snapshot | Isi snapshot/lifecycle | Representasi lengkap dan status publish/rollback. | Wajib. | Terikat buku. | DISETUJUI. | Privat; bukan payload Reader otomatis. | Immutable isi; pointer terpisah. | DB-REQ-009/010; INV-003/004. | TERVERIFIKASI. |
| 10 Proyeksi publik | Identitas sumber versi | Menautkan proyeksi ke snapshot tervalidasi. | Wajib. | Satu sumber versi konseptual. | DISETUJUI. | Publik kondisional. | Immutable per versi. | DB-REQ-012; LDB-Q-003. | TERVERIFIKASI konseptual. |
| 10 Proyeksi publik | Konten yang diizinkan/bukti validasi | Data Reader tanpa secret serta bukti lifecycle. | Wajib saat dilayani. | Terikat sumber. | DISETUJUI. | Publik kondisional. | Immutable; invalid oleh lifecycle. | INV-012; FR-PUB-005/007. | TERVERIFIKASI konseptual. |
| 11 Aktivitas rahasia | Identitas dalam snapshot | Pembeda definisi aktivitas versi asal. | Wajib bila aktivitas ada. | Unik dalam versi BELUM DITENTUKAN. | DISETUJUI. | Server-only. | Immutable sesudah publish. | ENT-010; REL-008; INV-013. | TERVERIFIKASI. |
| 11 Aktivitas rahasia | Aturan, deadline, kunci/bobot | Dasar validasi dan scoring yang tidak dikirim ke Reader. | Wajib sesuai aktivitas. | Terikat aktivitas/version. | DISETUJUI. | Server-only. | Immutable sesudah publish. | DB-REQ-017; NFR-SEC-004. | TERVERIFIKASI konseptual. |
| 12 Sesi siswa | Identitas sesi dan hash/verifier | Pemulihan sesi tanpa menyimpan token mentah. | Wajib. | Token mentah hanya browser; verifier/hash server. | DISETUJUI. | Privat siswa/server. | Mutable lifecycle. | ENT-011; DB-REQ-016; FR-ACT-002. | TERVERIFIKASI. |
| 12 Sesi siswa | Scope aktivitas/status | Batas sesi terhadap aktivitas/lifecycle. | Wajib. | Terikat aktivitas/sesi. | DISETUJUI. | Privat siswa/server. | Mutable lifecycle. | REL-009/010; INV-012. | TERVERIFIKASI. |
| 13 Attempt | Identitas, sesi, versi/aktivitas asal | Keterikatan historis pengerjaan. | Wajib. | Unik attempt; satu MVP per sesi. | DISETUJUI. | Privat siswa/server. | Mutable sampai final. | ENT-012; REL-010; INV-013. | TERVERIFIKASI. |
| 13 Attempt | Deadline UTC/status finalisasi | Dasar validitas dan state pengerjaan. | Wajib. | Terikat attempt. | DISETUJUI. | Privat siswa/server. | Mutable terkontrol. | INV-009; DB-REQ-018. | TERVERIFIKASI. |
| 14 Jawaban diterima | Identitas attempt/waktu server | Bukti jawaban yang diterima sah. | Wajib. | Terikat attempt; urutan fisik BELUM DITENTUKAN. | DISETUJUI. | Privat/server-only. | Tidak ditimpa secara diam-diam. | REL-011; INV-009. | TERVERIFIKASI konseptual. |
| 14 Jawaban diterima | Payload sah/key idempotensi | Isi jawaban dan perlindungan replay. | Wajib saat submit. | Key unik dalam scope operasi BELUM DITENTUKAN. | Kebijakan lifecycle DISETUJUI PEMILIK — 06E-4; detail BELUM FINAL. | Privat/server-only. | Immutable catatan sah. | INV-008; LDB-Q-006, DEC-06E4-001. | TERVERIFIKASI konseptual. |
| 15 Hasil final | Identitas attempt/outcome | Hasil paling banyak satu untuk attempt. | Wajib saat final. | Unik per attempt. | DISETUJUI. | Privat; disclosure server. | Immutable setelah final. | ENT-014; REL-012; INV-008. | TERVERIFIKASI. |
| 15 Hasil final | Dasar disclosure/waktu final | Informasi hasil yang boleh diproyeksikan. | Kondisional. | Terikat hasil. | TURUNAN TERJUSTIFIKASI. | Privat/server-only sebelum disclosure. | Immutable. | DB-REQ-019; INV-013. | TERVERIFIKASI konseptual. |
| 16 Retry grant | Identitas/verifier/kedaluwarsa | Otorisasi retry tanpa token grant mentah persisten. | Wajib Fase 2. | Grant unik; verifier server. | DISETUJUI. | Server-only. | Mutable sekali konsumsi. | ENT-015; DB-REQ-020. | TERVERIFIKASI. |
| 16 Retry grant | Attempt asal/status konsumsi | Menjaga histori dan satu kali pemakaian. | Wajib Fase 2. | Terikat attempt lama. | DISETUJUI. | Server-only. | Final saat dikonsumsi. | REL-013; INV-006/008. | TERVERIFIKASI. |
| 17 Target QR | Short code/identitas target | Resolusi ke target internal aktif. | Wajib Fase 2. | Short code unik konseptual. | DISETUJUI. | Publik hanya resolusi kondisional. | Mutable terotorisasi. | ENT-016; FR-LNK-005/006. | TERVERIFIKASI konseptual. |
| 17 Target QR | Status/lifecycle target | Penolakan eksternal, siklus, dan target tidak aktif. | Wajib Fase 2. | Terikat target. | DISETUJUI. | Privat operasional. | Mutable lifecycle. | INV-011; DB-REQ-014. | TERVERIFIKASI. |
| 18 Agregat QR | Target/periode agregat | Konteks hitungan non-PII. | Wajib bila agregat disimpan. | Unik periode BELUM DITENTUKAN. | TURUNAN TERJUSTIFIKASI. | Privat admin. | Mutable sebagai agregat. | ENT-017; REL-014; DB-REQ-015. | BELUM DITENTUKAN detail. |
| 18 Agregat QR | Hitungan non-PII | Metrik tanpa identitas, IP, GPS, fingerprint. | Wajib bila disajikan. | Terikat target/periode. | DISETUJUI. | Privat admin. | Mutable agregat. | FR-LNK-008; INV-011. | TERVERIFIKASI konseptual. |
| 19 Audit | Identitas/waktu/aktor/subjek | Bukti tindakan kritis dengan konteks aman. | Wajib untuk tindakan wajib audit. | Identitas peristiwa unik. | DISETUJUI. | Operasional privat. | Append-only konseptual. | ENT-018; DB-REQ-021. | TERVERIFIKASI konseptual. |
| 19 Audit | Aksi/hasil/bukti aman | Outcome tanpa token mentah/secret/PII berlebih. | Wajib bila dicatat. | Terikat peristiwa. | Audit generik berklasifikasi domain DISETUJUI PEMILIK — 06E-4B; bentuk fisik BELUM FINAL. | Operasional privat. | Append-only konseptual. | INV-012; LDB-Q-005; DEC-06E4B-001. | TERVERIFIKASI konseptual. |
| 20 Kapasitas | Sumber/waktu observasi | Asal dan waktu metrik kapasitas. | Kondisional operasional. | BELUM DITENTUKAN. | Telemetri provider + perhitungan aplikasi DISETUJUI PEMILIK — 06E-4B; detail BELUM FINAL. | Operasional privat. | Mutable/tergantung provider. | ENT-019; LDB-Q-007; DEC-06E4B-005. | TERVERIFIKASI konseptual; provider belum diverifikasi. |
| 20 Kapasitas | Ringkasan kuota | Informasi risiko, sumber, dan waktu observasi tanpa upgrade otomatis. | Kondisional. | Terikat observasi. | Monitoring hibrida berbasis risiko DISETUJUI PEMILIK — 06E-4B; detail BELUM FINAL. | Operasional privat. | Mutable. | DB-Q-010; NFR-CST-001/002; DEC-06E4B-006. | TERVERIFIKASI konseptual. |
| 21 Bukti recovery | Sumber/cakupan/waktu | Bukti backup/restore data, media, mapping. | Kondisional saat operasi. | BELUM DITENTUKAN. | TURUNAN TERJUSTIFIKASI. | Operasional privat. | Append-only konseptual. | ENT-020; REL-017; DB-REQ-024. | TERVERIFIKASI konseptual. |
| 21 Bukti recovery | Hasil verifikasi restore | Status bukti yang tidak mengklaim sukses bila media/mapping hilang. | Kondisional. | Terikat bukti. | DISETUJUI. | Operasional privat. | Immutable bukti. | NFR-REL-003; AC-REL-001. | TERVERIFIKASI konseptual. |
| 22 Hasil idempoten | Key/scope operasi | Identitas replay yang sah. | Wajib untuk operasi idempoten. | Unik dalam scope BELUM DITENTUKAN. | DISETUJUI konseptual. | Privat/server-only. | Immutable per key. | DB-Q-004; INV-008. | TERVERIFIKASI konseptual. |
| 22 Hasil idempoten | Outcome/bukti/retensi | Hasil operasi yang dapat dikembalikan ulang. | Wajib saat outcome disimpan; durasi/expiry/pembersihan BELUM FINAL. | Terikat key. | Kebijakan lifecycle DISETUJUI PEMILIK — 06E-4. | Privat/server-only. | Immutable sampai lifecycle berakhir. | LDB-Q-006; DEC-06E4-001; SCN-06D3-027/029. | BELUM DITENTUKAN rincian retensi. |
| 23 Dependensi media | Referensi snapshot/attempt dan media | Ikatan eksplisit terhadap media wajib. | Wajib bila media dipakai. | Gabungan unik BELUM DITENTUKAN fisik. | DISETUJUI. | Privat operasional. | Immutable untuk snapshot. | REL-007; DB-REQ-025. | TERVERIFIKASI. |
| 23 Dependensi media | Status verifikasi | Bukti media tersedia untuk publish/rollback. | Wajib sebelum aktivasi/rollback. | Terikat dependensi. | DISETUJUI. | Privat operasional. | Mutable sebelum aktivasi; historis sesudahnya. | INV-005/010; LDB-Q-004. | TERVERIFIKASI konseptual. |

## DFS-05 — Identitas, Relasi, dan Integritas Referensial

### Register REL-001 sampai REL-018

| REL | Asal → tujuan; kardinalitas | Ketergantungan identitas dan perubahan/penghapusan | Snapshot/histori dan otorisasi | INV; referensi; verifikasi |
|---|---|---|---|---|
| REL-001 | Buku → Alias; 1 → 0..N | Alias harus menunjuk buku/slug sah; penghapusan buku tidak boleh memutus histori resolusi tanpa lifecycle. | Resolusi publik kondisional; admin mengelola. | INV-001/012; CDM-04; TERVERIFIKASI. |
| REL-002 | Buku → Node; 1 → 0..N | Node bergantung buku; arsip/hapus draf tidak menghapus snapshot. | Draf privat/CAS. | INV-001/007; CDM-04; TERVERIFIKASI. |
| REL-003 | Node → Komponen; 1 → 0..N | Komponen bergantung node dan urutan sah. | Draf privat/CAS. | INV-001/007; CDM-04; TERVERIFIKASI. |
| REL-004 | Buku/Node/Komponen → Tema; 0..N scope | Override hilang kembali ke pewarisan, tidak orphan. | Admin/draf terotorisasi. | REL-004 representasi TERBUKA; TERVERIFIKASI konseptual. |
| REL-005 | Komponen ↔ Media; 0..N ↔ 0..N | Referensi harus diperiksa sebelum hapus media. | Media privat/Storage; admin hanya meminta delete. | INV-010; DB-REQ-007/025; TERVERIFIKASI. |
| REL-006 | Buku → Snapshot; 1 → 0..N, 0..1 aktif | Snapshot milik buku; aktif hanya setelah validasi. | Histori immutable; server aktivasi. | INV-002—004; DB-REQ-009/010; TERVERIFIKASI. |
| REL-007 | Snapshot → Media; 1 → 0..N | Dependensi eksplisit/verifikasi wajib sebelum publish/rollback. | Histori dan media terlindungi; server-only write. | INV-005/010; LDB-Q-004; TERVERIFIKASI. |
| REL-008 | Snapshot → Aktivitas rahasia; 1 → 0..N | Definisi terikat versi asal, tidak berubah sesudah publish. | Server-only; tidak masuk proyeksi publik. | INV-013; LDB-Q-002; TERVERIFIKASI. |
| REL-009 | Aktivitas → Sesi; 1 → 0..N | Sesi baru hanya jika lifecycle publik mengizinkan. | Token diverifikasi server; privat siswa. | INV-012; DB-REQ-016; TERVERIFIKASI. |
| REL-010 | Sesi → Attempt; 1 → 0..1 MVP | Pemulihan memakai attempt sama; Fase 2 hanya lewat retry grant. | Ownership/versi asal diuji server. | INV-009/013; DB-REQ-018/020; TERVERIFIKASI. |
| REL-011 | Attempt → Jawaban; 1 → 0..N | Jawaban sah terkait attempt, deadline server, idempotensi. | Tidak bisa lintas sesi; server menerima. | INV-008/009; DB-REQ-018; TERVERIFIKASI. |
| REL-012 | Attempt → Hasil final; 1 → 0..1 | Maksimum satu hasil; hasil tidak ditulis ulang oleh attempt lain. | Disclosure proyeksi server saja. | INV-008/013; DB-REQ-019; TERVERIFIKASI. |
| REL-013 | Attempt lama → Retry grant; 1 → 0..N historis | Grant konsumsi paling satu kali dan tidak menghapus attempt/hasiI lama. | Server-only; Fase 2. | INV-006/008; DB-REQ-020; TERVERIFIKASI. |
| REL-014 | Target QR → Agregat; 1 → 0..N | Agregat hanya resolusi sah dan non-PII. | Admin berotorisasi; Fase 2. | INV-011; DB-REQ-015; detail TERBUKA. |
| REL-015 | Target QR → Audit; 1 → 0..N | Perubahan target menyisakan bukti audit. | Privat operasional; Fase 2. | INV-011/012; DB-REQ-014/021; TERVERIFIKASI. |
| REL-016 | Subjek kritis → Audit; 1 → 0..N | Hapus dibatasi selama bukti wajib diperlukan. | Privat/audit server. | INV-003/006/012; DB-REQ-021; TERVERIFIKASI. |
| REL-017 | Bukti recovery → Snapshot/Media; kondisional | Bukti verifikasi mapping, bukan foreign key fisik wajib. | Operasional privat. | INV-010; DB-REQ-024/025; TERVERIFIKASI konseptual. |
| REL-018 | Observasi kapasitas → Konteks operasional; kondisional | Kombinasi telemetri provider/perhitungan aplikasi dan monitoring risiko disetujui; detail sumber/cadence tetap belum final. | Operasional privat. | DB-REQ-023; DEC-06E4B-005/006. |

### Kontrak Integritas

| Kelompok | Kewajiban disetujui | Mekanisme tetap terbuka | Risiko bila gagal; skenario terkait |
|---|---|---|---|
| Identitas dan struktur | INV-001 UUID stabil; slug/alias sah; parent/urutan tidak mengubah identitas; INV-007 CAS menolak stale write. | Bentuk constraint, cascade, dan isolation fisik. | ID/struktur salah atau silent overwrite; SCN-06D3-002/005/019/020. |
| Publikasi | INV-002 snapshot immutable; INV-003 pointer/audit atomik; INV-004 gagal publish tidak aktif; proyeksi tervalidasi; secret terpisah; dependensi media eksplisit. | Lock/serialisasi publish, kompatibilitas JSONB, koordinasi Storage. | Snapshot parsial, media hilang, secret bocor; SCN-06D3-001—008. |
| Aktivitas siswa | Hash/verifier token, INV-009 UTC server, INV-008 idempotensi/satu hasil, INV-013 pin versi asal, retry Fase 2 tidak menimpa histori. | Retensi key/outcome dan determinisme interleaving submit/finalize. | Replay, hasil ganda, deadline salah; SCN-06D3-021—034. |
| Operasional | Audit privat, INV-010 media terproteksi, restore memeriksa DB/media/mapping, monitoring tidak memicu biaya otomatis. | Bentuk audit, rekonsiliasi, provider/cadence backup/kuota. | Bukti kurang, orphan Storage, restore palsu; SCN-06D3-011/041—045. |

Penghapusan fisik hanya boleh dipertimbangkan setelah pemeriksaan dependensi snapshot, media, attempt, hasil, dan audit. Bentuk foreign key, constraint, cascade/restrict, serta transaction isolation tetap belum diputuskan.

## DFS-06 — Kontrak Immutable Snapshot, Public Projection, dan Private Scoring

1. Publish membentuk snapshot JSONB lengkap, immutable, dan memiliki schema version internal.
2. Snapshot lengkap tidak dikirim otomatis kepada Reader.
3. Proyeksi publik dibuat serta divalidasi sebelum pointer aktif diaktifkan.
4. Definisi aktivitas rahasia tetap private/server-only; kunci, bobot, dan scoring tidak masuk payload Reader.
5. Reader, siswa, dan admin hanya **REQUEST-CONDITIONAL** untuk proyeksi publik; server melakukan pemeriksaan lifecycle, revoke, scope, serta jalur cache/Storage.
6. Hasil disclosure adalah proyeksi server, bukan hak baca langsung terhadap rahasia penilaian.

Emergency revoke diprioritaskan terhadap publish/rollback melalui **DEC-06E6-001**: akses tidak dapat pulih kecuali melalui tindakan eksplisit dan sah. Restore juga tidak boleh otomatis membuka kembali akses yang telah dicabut (**DEC-06E6-004**). Kedua kebijakan bersifat konseptual; mekanisme prioritas dan pemulihan fisik tetap BELUM FINAL.

Dasar: ENT-009/010/014, INV-002/004/012/013, DB-REQ-009/012/017/019/022, LDB-Q-001 sampai LDB-Q-003.

## DFS-07 — Kontrak CAS, Transaksi, Idempotensi, dan Konkurensi

- CAS draf memakai expected revision dan wajib menolak stale write tanpa silent overwrite.
- Publish dan rollback mengubah pointer serta audit atomik dalam batas PostgreSQL.
- Storage promotion/delete berada di luar transaksi PostgreSQL; kegagalan lintas layanan wajib ditandai, diaudit, dan direkonsiliasi.
- Jawaban/finalisasi menggunakan deadline UTC dan idempotensi; hasil akhir maksimal satu per attempt.
- SCN-06D3-029 tetap GAP: baseline mewajibkan satu hasil serta jawaban sah sebelum deadline, tetapi belum menetapkan locking/isolation fisik untuk interleaving auto-finalize versus submit.
- Retensi key/outcome mengikuti kebijakan lifecycle operasi yang **DISETUJUI PEMILIK — 06E-4** melalui DEC-06E4-001; durasi numerik, kedaluwarsa, dan mekanisme pembersihan tetap **BELUM FINAL**.

### Kontrak Kritis Publish dan Rollback

**Kewajiban baseline:** admin hanya meminta operasi melalui jalur berotorisasi; server memvalidasi draf/CAS, struktur, media, aktivitas, dan proyeksi publik sebelum aktivasi. Snapshot serta representasi rahasia dipersiapkan secara immutable. Dependensi media dilindungi; satu pointer aktif dan audit yang relevan berubah atomik dalam batas PostgreSQL. Storage tidak diasumsikan atomik dengan PostgreSQL; kegagalan prasyarat tidak boleh mengaktifkan versi.

**Usulan mekanisme — BELUM DISETUJUI:** serialisasi konseptual pada scope buku untuk publish, rollback, dan delete media; revalidasi expected revision/pointer tepat sebelum aktivasi; pencatatan status pemulihan untuk kegagalan lintas Storage. Alternatifnya adalah (A) serialisasi per buku, (B) arbitrasi optimistic berbasis pointer/revisi, atau (C) antrean operasi terotorisasi. A menyederhanakan bukti satu aktif tetapi mengurangi paralelisme; B lebih ringan namun membutuhkan bukti retry/konflik; C meningkatkan auditability namun menambah operasional. Tidak satu pun dipilih.

**Bukti yang diperlukan:** uji dua publish (`SCN-06D3-005`), rollback berlawanan delete media (`SCN-06D3-008`), publish gagal, rollback media hilang, dan audit/pointer konsisten. Risiko residual tetap GAP sampai isolation, kompensasi Storage, dan provider behavior diverifikasi.

DEC-06E5-001 menyetujui serialisasi publish per buku. DEC-06E5-002 menetapkan Pending Delete dengan revalidasi dependensi; DEC-06E6-002 menegaskan perlindungan dependensi media lebih prioritas daripada delete dan snapshot tidak boleh aktif bila media belum terverifikasi. DEC-06E6-001 memberi emergency revoke prioritas atas publish/rollback. Kebijakan-kebijakan ini tidak memilih locking, queue, ataupun transaksi fisik; `SCN-06D3-005` dan `SCN-06D3-008` tetap GAP.

### Kontrak Kritis Aktivitas Siswa dan Konkurensi

Token sesi mentah hanya berada di browser; server menyimpan hash/verifier. Setiap request memvalidasi token, ownership sesi/attempt, versi aktivitas asal, deadline UTC, status finalisasi, dan idempotensi. Server-only scoring menjaga kunci/bobot rahasia. Hasil final maksimal satu per attempt.

`SCN-06D3-029` tetap **GAP** dan memiliki empat interleaving yang wajib diuji: (1) submit diterima sah sebelum auto-finalize; (2) auto-finalize selesai sebelum submit terlambat; (3) submit dan finalisasi berjalan bersamaan sebelum deadline; (4) request submit tiba sebelum deadline tetapi penerimaan sah belum dipastikan ketika finalisasi berjalan. Baseline mengharuskan deadline UTC, jawaban sah, dan satu hasil, tetapi tidak menentukan locking atau isolation fisik untuk interleaving 3—4. Usulan alternatif: arbitrasi atomik pada state attempt, proses finalisasi server yang dapat mengulang aman, atau antrean per attempt; masing-masing **REKOMENDASI — BELUM DISETUJUI**. Bukti penutupan memerlukan desain fisik, uji konkurensi, dan pemeriksaan bahwa informasi attempt lain tidak bocor.

### Kontrak Rekonsiliasi Jawaban dan Instrumentasi Publish

DEC-06E4B-003 menyetujui persistensi lokal terbatas untuk jawaban belum berhasil dikirim: hanya dalam konteks sesi dan attempt, untuk pemulihan/pengiriman ulang, dengan minimisasi data pribadi. Data lokal bukan bukti penerimaan server, tidak menjamin penerimaan setelah deadline UTC, dan tidak mengizinkan persistensi token sesi mentah secara otomatis. DEC-06E4B-004 menyetujui rekonsiliasi server: cek sesi/attempt/lifecycle/deadline/finalisasi, bandingkan outcome lokal dengan server, kirim ulang operasi sah memakai idempotency key yang sama, gunakan outcome server bila sudah diterima, dan jangan membuat attempt baru atau hasil ganda. Status konseptual UI adalah tertunda, sedang diperiksa, diterima, ditolak, atau memerlukan tindakan siswa. Algoritma retry, jumlah/interval, format lokal, serta isolasi fisik tetap **BELUM FINAL**; `SCN-06D3-034` tetap OPEN dan `SCN-06D3-027`/`SCN-06D3-029` tetap GAP.

DEC-06E4B-002 menyetujui instrumentasi tahapan kritis publish: request, validasi draf, snapshot immutable, validasi proyeksi publik, dependensi media, aktivasi pointer, dan outcome akhir menggunakan correlation ID konsisten. Outcome berhasil hanya diakui setelah pointer sah aktif; kegagalan sebelum itu tidak mengubah versi aktif. Format event, telemetry, retensi, dan transaksi fisik tetap **BELUM FINAL**; `SCN-06D3-005` tetap GAP.

DEC-06E5-005 menyetujui revisi jawaban dengan optimistic version. DEC-06E5-006 menetapkan finalisasi atomik dengan first valid commit wins, dan DEC-06E6-003 menegaskan jawaban hanya diterima setelah commit server sah serta finalisasi memakai keadaan jawaban konsisten secara atomik. Tidak ada algoritma locking, isolation level, atau skema fisik yang ditetapkan; `SCN-06D3-027` dan `SCN-06D3-029` tetap GAP.

## DFS-08 — Model Otorisasi Konseptual dan Kebutuhan RLS

Reader anonim hanya dapat meminta proyeksi publik tervalidasi dan masih diizinkan lifecycle. Admin dapat meminta tindakan sesuai scope, tetapi server tepercaya mengeksekusi publish, rollback, lifecycle, scoring, delete media, grant retry, dan operasi privileged. Siswa bertoken hanya dapat meminta operasi untuk sesi/attempt sendiri. Proses operasional dibatasi pada backup, restore, kapasitas, dan rekonsiliasi.

RLS default-deny, private schema, trusted server boundary, serta penolakan akses lintas-sesi adalah **DISETUJUI secara konseptual**. Sintaks policy, claims, service-role custody, dan pemisahan peran fisik tetap belum ditetapkan.

### Kontrak Akses Audit dan Data Lokal

Audit generik terpusat hanya dapat diakses pihak berwenang. Setiap peristiwa konseptual membawa domain/jenis, aktor atau komponen, subjek, waktu server, outcome, correlation ID bila relevan, serta metadata tervalidasi dan terbatas. Audit append-only secara konseptual dan tidak memuat token mentah, kunci jawaban, bobot rahasia, atau PII tidak perlu. Penyimpanan lokal jawaban meminimalkan data serta wajib membatasi kebocoran antar siswa pada perangkat bersama. Bentuk RLS, claims, enkripsi lokal, dan representasi fisik **BELUM FINAL**.

DEC-06E5-004 menetapkan media privat hanya dilayani melalui trusted server setelah pemeriksaan otorisasi, scope, dan lifecycle; URL Storage langsung bukan dasar akses. Kebijakan ini melengkapi default-deny dan tidak menetapkan bucket, signed URL, policy RLS, atau mekanisme fisik lain.

### Kontrak Revoke dan Akses Publik

**Kewajiban baseline:** Reader anonim, siswa bertoken, dan admin hanya `REQUEST-CONDITIONAL`; server `EXECUTE-SERVER-ONLY` setelah memeriksa lifecycle, scope, tujuan, serta revoke. Unpublish grace mempertahankan attempt aktif sampai deadline sambil menolak sesi baru; immediate block menghentikan mutasi baru; emergency revoke memblokir akses baru tanpa mengubah hasil historis atau memberi nilai nol otomatis.

**Usulan mekanisme — BELUM DISETUJUI:** pemeriksaan lifecycle yang sama pada API/proyeksi, cache, dan jalur object Storage; hindari URL yang dapat dipakai tanpa pemeriksaan ulang. Alternatif A memakai jalur aplikasi terkontrol untuk seluruh konten privat/publik lifecycle-sensitive; B memakai akses objek terbatas waktu dengan revalidasi; C memakai invalidasi cache terintegrasi provider. A membatasi bypass tetapi menambah beban jalur server; B bergantung waktu/validasi; C **PERLU VERIFIKASI PROVIDER**. Konten yang telah diunduh sebelumnya tidak dapat ditarik kembali secara absolut; kontrak hanya mengatur akses baru. Bukti: uji `SCN-06D3-016/017` melalui API, cache, dan Storage.

Kebijakan DEC-06E5-003 memilih jalur aplikasi terkontrol untuk Emergency Revoke dan DEC-06E5-004 memilih media privat melalui trusted server. DEC-06E6-001 mengatur prioritas revoke atas publish/rollback. Alternatif fisik sebelumnya tidak disahkan oleh keputusan ini; cache/provider dan kontrol akses fisik tetap PERLU VERIFIKASI PROVIDER. `SCN-06D3-016` dan `SCN-06D3-017` tetap GAP.

## DFS-09 — Storage, Dependensi Media, dan Rekonsiliasi

Media memakai metadata, hash, status, lokasi, dan dependensi eksplisit terhadap komponen/snapshot. Media yang dirujuk snapshot atau attempt tidak boleh dihapus tidak aman. Delete media membutuhkan pemeriksaan dependensi, perlindungan terhadap race publish/rollback/delete, dan audit.

Kegagalan sebelum delete objek mempertahankan referensi sah. Kegagalan sesudah delete objek dapat menciptakan mismatch metadata–Storage yang harus ditandai, diaudit, serta direkonsiliasi. Kebijakan rekonsiliasi LDM-Q-002 **DISETUJUI PEMILIK — 06E-4** melalui DEC-06E4-004; jadwal, metode, batas beban, dan bukti operasional tetap **BELUM FINAL**.

### Kontrak Storage dan Rekonsiliasi

**Kewajiban baseline:** media yang dipakai snapshot/attempt tidak dihapus tidak aman; dependensi diverifikasi sebelum publish/rollback; mismatch PostgreSQL—Storage ditandai dan diaudit. Kebijakan **DISETUJUI PEMILIK — 06E-4** melalui DEC-06E4-004 memilih kombinasi pemeriksaan berkala dan pemeriksaan setelah kegagalan operasi. Tidak ada penghapusan spekulatif. Bukti penutupan `SCN-06D3-011` dan `SCN-06D3-008` adalah laporan objek, mapping, keputusan tindak lanjut, dan uji kegagalan sebelum/sesudah penghapusan. Jadwal, metode, batas beban, serta format bukti tetap **BELUM FINAL**.

DEC-06E5-002 menyetujui Pending Delete dengan revalidasi dependensi sebelum penghapusan. DEC-06E5-008 menambahkan karantina logis dan pembersihan orphan terkendali; tidak ada objek dihapus spekulatif. Kebijakan ini tidak menetapkan state machine, periode karantina, atau job fisik. `SCN-06D3-008` tetap GAP dan `SCN-06D3-011` tetap OPEN sampai desain/pengujian operasional tersedia.

## DFS-10 — Lifecycle Publikasi dan Aktivitas Siswa

Unpublish grace mengizinkan attempt aktif sampai deadline dan menolak sesi baru. Immediate block menghentikan mutasi baru. Emergency revoke memblokir akses baru melalui jalur aplikasi terkendali tanpa memberi nilai nol otomatis. Rollback hanya mengalihkan pointer ke target yang media-nya terverifikasi.

Attempt tetap dipin ke aktivitas/snapshot asal. Publish baru, rollback, atau perubahan draf tidak mengubah jawaban, hasil, atau dasar penilaian historis. Retry grant Fase 2 yang sah membuat **sesi baru dan attempt baru** tanpa menghapus attempt lama; satu sesi tetap memiliki paling banyak satu attempt.

### Lifecycle Antrean Jawaban Lokal

Antrean lokal dapat terbentuk hanya untuk jawaban belum diterima server, dibatasi pada sesi dan attempt. Saat koneksi kembali, aplikasi memeriksa status server lalu menandai status konseptual: tertunda, sedang diperiksa, diterima, ditolak, atau memerlukan tindakan siswa. Antrean dibersihkan setelah konfirmasi server atau kebijakan kedaluwarsa aman yang belum final. Tidak ada attempt baru otomatis, dan finalisasi/histori tidak boleh ditimpa. Ini kebijakan konseptual DEC-06E4B-003/004; bukan desain browser atau penyimpanan fisik.

DEC-06E5-009 menegaskan pemulihan antrean lokal harus diverifikasi terhadap sesi, attempt, lifecycle, deadline, dan outcome server sebelum resend; operasi sama menggunakan idempotency key sama. Status OPEN tidak berubah sampai storage browser, expiry, retry, dan pengujian recovery/sinkronisasi dibuktikan.

## DFS-11 — Audit, Backup/Restore, dan Monitoring Kuota

Audit mencatat tindakan kritis melalui batas privat dan tidak boleh memuat token mentah, kunci jawaban, bobot rahasia, atau PII yang tidak perlu. DEC-06E4B-001 menetapkan audit generik terpusat dengan klasifikasi domain dan jenis peristiwa, aktor/komponen, subjek, waktu server, outcome, correlation ID relevan, serta metadata tervalidasi. Bentuk fisik, indeks, schema metadata, dan retensi numerik tetap **BELUM FINAL**.

Backup harus mencakup data relasional, media fisik, dan mapping snapshot-media. Restore harus diuji; backup DB tanpa media atau restore beda waktu tidak boleh diklaim berhasil. Kebijakan **DISETUJUI PEMILIK — 06E-4** melalui DEC-06E4-002 menetapkan ekspor operasional terverifikasi sebagai strategi utama; backup provider hanya tambahan opsional dan tetap **PERLU VERIFIKASI PROVIDER**. Cadence, retensi, lokasi backup, metode ekspor, serta prosedur teknis tetap **BELUM FINAL**. Kebijakan sumber hibrida observasi dan monitoring risiko melalui DEC-06E4B-005/006 sudah disetujui, tanpa mewajibkan tabel metrik; source/cadence rinci tetap belum final. Monitoring tidak boleh memicu upgrade berbayar otomatis.

### Kontrak Operasional

Audit harus aman: tidak memuat token mentah, kunci/bobot, atau PII yang tidak perlu. Restore yang dapat diklaim berhasil membutuhkan bukti database, media, dan mapping snapshot-media yang konsisten. Strategi utama pilihan B adalah **ekspor operasional terverifikasi — DISETUJUI PEMILIK 06E-4** melalui DEC-06E4-002, tanpa menyetujui cadence, tooling, metode ekspor, atau prosedur teknis. Backup/provider terkelola hanya tambahan opsional dan **PERLU VERIFIKASI PROVIDER** sebelum dianggap tersedia pada paket apa pun. DEC-06E4B-005 menetapkan kombinasi telemetri provider terverifikasi dan perhitungan aplikasi; metrik harus membedakan resmi, estimasi, atau tidak tersedia serta menyimpan sumber/waktu observasi secara konseptual. DEC-06E4B-006 menetapkan monitoring hibrida berbasis risiko: pemeriksaan ringan berkala, pembaruan manual admin, dan pemeriksaan tambahan pasca operasi berdampak dengan pembatasan/penggabungan beban. Tidak ada upgrade otomatis, penghapusan media, penghentian aktivitas, atau tindakan destruktif berdasarkan peringatan kuota. Provider capability, interval, ambang, API, dan penyimpanan fisik tetap **BELUM FINAL**. Bukti `SCN-06D3-043` dan `SCN-06D3-044` memerlukan capability provider, jadwal, cakupan, hasil restore, dan sumber/cadence metrik.

DEC-06E5-007 mempertegas backup independen wajib dan backup provider hanya opsional. DEC-06E6-004 melarang restore membuka kembali akses revoked, sedangkan DEC-06E6-005 mewajibkan restore memverifikasi database, Storage, snapshot, attempt, hasil akhir, dan dependensi. DEC-06E5-010 dan DEC-06E6-006 mengharuskan monitoring menyatakan sumber, kepastian, risiko, serta status tidak tersedia/kedaluwarsa sebagai tidak pasti—bukan nol—tanpa tindakan destruktif. Detail provider, operasi, dan prosedur tetap BELUM FINAL.

## DFS-12 — Kebutuhan Indeks dan Performa

Kebutuhan konseptual: pencarian identitas/slug sah, scope buku dan struktur, active pointer, resolusi session/attempt, idempotency lookup, QR short code, agregat harian, audit menurut domain/subjek/waktu/correlation ID, observasi menurut sumber/waktu, dan pemeriksaan dependensi media. Tidak ada indeks fisik, metode akses, atau angka kapasitas yang ditetapkan dalam draf ini. Pilihan tersebut memerlukan profiling, provider verification, dan audit desain fisik.

## DFS-13 — Migrasi, Kompatibilitas, dan Evolusi Skema

Migrasi belum boleh ditulis. Evolusi schema snapshot JSONB wajib menjaga pembacaan Reader dan rollback historis; kebijakan **DISETUJUI PEMILIK — 06E-4** melalui DEC-06E4-003 adalah reader dan validator multi-versi berdasarkan `schema_version`. Snapshot asli tetap immutable, dan aktivitas tetap dipin pada versi asal. Matriks versi didukung, masa dukungan, serta prosedur penghentian kompatibilitas tetap **BELUM FINAL**. Rencana migrasi fisik harus mempertahankan INV-001 sampai INV-013, versi historis, proyeksi publik tervalidasi, dan pemisahan secret. Tidak ada perubahan schema tanpa change request, analisis dampak, audit, dan persetujuan sesuai baseline terkunci.

### Kontrak Kompatibilitas Historis

**Kewajiban baseline:** snapshot historis dan rollback tetap dapat dibaca tanpa mengubah dasar penilaian lama. Kebijakan **DISETUJUI PEMILIK — 06E-4** melalui DEC-06E4-003 memilih reader/validator multi-versi berdasarkan `schema_version`. Matriks versi didukung, masa dukungan, dan prosedur penghentian kompatibilitas tetap **BELUM FINAL**. Bukti teknis kelak mencakup matriks versi, uji Reader/rollback historis, dan audit tidak adanya perubahan snapshot.

## DFS-14 — Keputusan Terbuka, GAP, dan Risiko Residual

### Status Keputusan Kebijakan dan Antarmuka

Prioritas berikut adalah **usulan analitis**, bukan penutupan atau keputusan baru. IA-Q-005 tetap DISETUJUI/DITUTUP dan tidak termasuk register terbuka.

| ID | Pertanyaan; dampak | Prioritas usulan dan alasan | Tahap/ketergantungan; risiko jika ditunda |
|---|---|---|---|
| LDB-Q-005 | Bentuk audit generik atau per-domain menentukan keterbacaan/akses bukti. | P1; audit generik berklasifikasi domain **DISETUJUI PEMILIK — 06E-4B**. | Bentuk fisik, retensi, metadata, indeks BELUM FINAL. |
| LDB-Q-006 | Retensi key idempotensi dan outcome operasi. | P0; kebijakan lifecycle **DISETUJUI PEMILIK — 06E-4**. | Durasi, kedaluwarsa, dan pembersihan BELUM FINAL. |
| LDB-Q-007 | Sumber observasi kapasitas. | P1; kombinasi telemetri provider/perhitungan aplikasi **DISETUJUI PEMILIK — 06E-4B**. | Provider/cakupan/sumber rinci BELUM FINAL. |
| LDB-Q-008 | Persistensi antrean jawaban lokal. | P1; persistensi lokal terbatas **DISETUJUI PEMILIK — 06E-4B**. | Browser store, enkripsi, masa simpan, batas ukuran BELUM FINAL. |
| DB-Q-007 | Instrumentasi publish dan bukti metrik. | P1; instrumen tahapan kritis **DISETUJUI PEMILIK — 06E-4B**. | Format/telemetry/retensi/transaksi BELUM FINAL. |
| DB-Q-008 | Kebijakan antrean jawaban lokal. | P1; rekonsiliasi server dan resend terkendali **DISETUJUI PEMILIK — 06E-4B**. | Retry/interval/sinkronisasi fisik BELUM FINAL. |
| DB-Q-009 | Provider/cadence backup dan bukti restore. | P0; ekspor operasional terverifikasi **DISETUJUI PEMILIK — 06E-4**. | Cadence, retensi, lokasi, metode, prosedur BELUM FINAL. |
| DB-Q-010 | Sumber/cadence metrik kuota. | P1; monitoring hibrida berbasis risiko **DISETUJUI PEMILIK — 06E-4B**. | Interval/ambang/API/capability BELUM FINAL. |
| IA-Q-001 | Path/navigasi admin. | **DECIDED/CLOSED melalui CR-IA-001**; sidebar hierarkis, Dashboard sebagai awal, Daftar Buku sebagai pusat, konteks buku untuk editor/detail/aktivitas/publikasi, serta URL stabil untuk akses langsung/refresh. | Selaras dengan 15 route yang ada; baseline terkait telah dikunci kembali tanpa menambah route. |
| IA-Q-002 | Bentuk breadcrumb. | **DECIDED/CLOSED melalui CR-IA-001**; breadcrumb hierarkis yang dapat diklik, halaman aktif terakhir, dan bentuk ringkas di mobile. | Kontrak UI; tidak menduplikasi navigasi utama; baseline terkait telah dikunci kembali. |
| IA-Q-003 | Batas metrik publish pada antarmuka. | **DECIDED/CLOSED melalui CR-IA-001**; ringkasan status/versi aktif/waktu terakhir/hasil terakhir serta detail operasional aman bila data terverifikasi tersedia. | Tidak ada angka perkiraan atau data sensitif; format telemetry, retensi, dan bukti teknis tetap belum final. |
| IA-Q-004 | Lokasi antrean pada antarmuka. | **DECIDED/CLOSED melalui CR-IA-001**; indikator di halaman aktivitas dekat simpan/kirim, detail melalui panel/dialog, dan tampilan ringkas mobile. | Status lokal bukan bukti penerimaan server; privasi perangkat bersama, expiry, retry, dan recovery tetap OPEN pada SCN-06D3-034. |
| LDM-Q-001 | Kompatibilitas schema JSONB historis. | P0; multi-versi `schema_version` **DISETUJUI PEMILIK — 06E-4**. | Matriks/masa dukungan dan penghentian BELUM FINAL. |
| LDM-Q-002 | Metode rekonsiliasi orphan Storage. | P0; periodik dan pasca-kegagalan **DISETUJUI PEMILIK — 06E-4**. | Jadwal, metode, beban, bukti BELUM FINAL. |

### GAP dan OPEN dari 06D-3

| Status | Skenario | Kandidat; REL/INV | Kebutuhan desain/bukti penutupan | Prioritas usulan |
|---|---|---|---|---|
| GAP | SCN-06D3-005 serialisasi dua publish | Buku/snapshot/audit; REL-006/016; INV-003/004/007 | Kontrak serialisasi dan bukti dua request tidak menghasilkan dua aktif. | P0 |
| GAP | SCN-06D3-008 rollback versus delete media | Media/snapshot; REL-005/007; INV-005/010 | Koordinasi dependensi/race dan audit kompensasi. | P0 |
| GAP | SCN-06D3-016 cache stale setelah revoke | Proyeksi/snapshot; REL-006; INV-012 | Bukti semua jalur cache/Storage memeriksa lifecycle. | P0 |
| GAP | SCN-06D3-017 Storage URL melewati lifecycle | Media/snapshot; REL-005/007; INV-010/012 | Bukti URL/object tidak bypass lifecycle/secret. | P0 |
| GAP | SCN-06D3-027 submit paralel key berbeda | Attempt/jawaban; REL-010/011; INV-008/009 | Kontrak hasil paralel dan bukti satu state sah. | P0 |
| GAP | SCN-06D3-029 auto-finalize versus submit | Attempt/jawaban/hasil; REL-011/012; INV-008/009/013 | Kontrak interleaving dan uji empat urutan kejadian. | P0 |
| GAP | SCN-06D3-043 backup/provider free tier | Bukti recovery; REL-017 | Verifikasi provider, backup, restore media/mapping. | P0 |
| OPEN | SCN-06D3-011 rekonsiliasi orphan Storage | Media/audit; REL-005/016; INV-010 | Jadwal/metode/bukti tanpa penghapusan spekulatif. | P0 |
| OPEN | SCN-06D3-034 persistensi antrean jawaban lokal | Attempt/jawaban; REL-010/011; INV-009 | Kebijakan client-local dan batas record sah server. | P1 |
| OPEN | SCN-06D3-044 sumber/cadence metrik kuota | Kapasitas; REL-018 | Sumber, periode, bukti metrik tanpa upgrade otomatis. | P1 |

### Register Analisis Tujuh GAP Kritis

| SCN; status asli | Kondisi/aktor/trust boundary dan interleaving | INV | Alternatif mitigasi; trade-off | Rekomendasi konseptual; bukti; risiko residual |
|---|---|---|---|---|
| SCN-06D3-005; GAP | Dua admin meminta publish untuk buku/revisi yang bersaing; server tepercaya mengeksekusi. | INV-003/004/007 | A serialisasi per buku; B CAS pointer/revisi dan retry; C antrean operasi. A mudah dibuktikan tetapi membatasi paralelisme; B ringan tetapi retry kompleks; C audit baik tetapi operasional tinggi. | **REKOMENDASI — BELUM DISETUJUI:** arbitrasi satu operasi publish efektif per buku. Bukti: dua request, satu aktif, audit keduanya. Risiko: isolation fisik belum diputuskan; LDB-Q-006 tidak relevan. |
| SCN-06D3-008; GAP | Rollback dan delete media bersaing; admin meminta, server/Storage menjalankan. | INV-005/010 | A blok delete saat dependensi ada; B status pending delete + revalidasi; C antrean lifecycle media. A aman tetapi retensi bertambah; B recovery eksplisit; C kompleks. | Kebijakan rekonsiliasi DEC-06E4-004 sudah disetujui; mekanisme koordinasi tetap **REKOMENDASI — BELUM DISETUJUI**. Bukti: race test/mapping/audit. Risiko: detail Storage BELUM FINAL. |
| SCN-06D3-016; GAP | Cache lama masih melayani setelah emergency revoke; Reader anonim melewati jalur cache. | INV-012 | A jalur aplikasi selalu; B token akses singkat/revalidasi; C purge cache provider. A kuat tapi mahal; B bergantung waktu; C **PERLU VERIFIKASI PROVIDER**. | **REKOMENDASI — BELUM DISETUJUI:** lifecycle diperiksa pada semua jalur baru. Bukti: revoke lalu uji API/cache. Risiko: konten yang pernah diunduh tidak dapat ditarik kembali. |
| SCN-06D3-017; GAP | URL Storage dapat melewati lifecycle; Reader memperoleh object tanpa pemeriksaan. | INV-010/012 | A object privat via server; B URL terbatas waktu; C bucket publik + purge. A membatasi bypass; B perlu revalidasi; C berisiko dan **PERLU VERIFIKASI PROVIDER**. | **REKOMENDASI — BELUM DISETUJUI:** jangan jadikan URL langsung sebagai otorisasi lifecycle. Bukti: uji URL sebelum/sesudah revoke. Risiko: model akses fisik belum dipilih. |
| SCN-06D3-027; GAP | Dua submit dengan key berbeda tiba untuk attempt sama. | INV-008/009 | A arbitrasi state attempt; B antrean per attempt; C terima satu outcome berdasarkan aturan waktu server. A fokus data; B tertib tetapi operasional; C memerlukan aturan detail. | **REKOMENDASI — BELUM DISETUJUI:** satu state sah dan audit outcome. Bukti: submit paralel, tidak ada hasil ganda. Risiko: aturan penerimaan bersamaan perlu desain fisik. |
| SCN-06D3-029; GAP | Submit/finalize empat interleaving: submit sah dahulu; finalize dahulu lalu submit terlambat; keduanya sebelum deadline; request tiba sebelum deadline tetapi penerimaan sah belum pasti. | INV-008/009/013 | A arbitrasi atomik attempt; B finalizer dapat mengulang aman; C antrean per attempt. A jelas tetapi perlu isolation; B recovery baik; C kompleks. | **REKOMENDASI — BELUM DISETUJUI:** hasil deterministik hanya setelah mekanisme dipilih. Bukti: empat uji interleaving, deadline UTC, satu hasil. Risiko: tidak menjanjikan serializability tanpa bukti. |
| SCN-06D3-043; GAP | Backup free tier tidak ada/gagal; provider/operasional adalah trust boundary. | — | A provider backup; B ekspor operasional; C kombinasi. A/B sama-sama **PERLU VERIFIKASI PROVIDER**; C biaya/kompleksitas lebih tinggi. | Kebijakan DEC-06E4-002 memilih B; jangan klaim siap sampai restore data/media/mapping dibuktikan. Bukti: capability, jadwal, restore test. Risiko: detail DB-Q-009 BELUM FINAL. |

### Analisis Tiga OPEN

| SCN; status | Pertanyaan/alternatif | Konsekuensi dan rekomendasi sementara | Keputusan/bukti penutupan |
|---|---|---|---|
| SCN-06D3-011; OPEN | Bagaimana menerapkan kebijakan periodik dan pasca-kegagalan? | Salah hapus merusak media; inventaris berlebihan menambah biaya. Kebijakan DEC-06E4-004 melarang hapus spekulatif. | Jadwal/metode/beban/bukti masih perlu audit; object, mapping, tindak lanjut. |
| SCN-06D3-034; OPEN | Bagaimana detail persistensi/retry lokal yang aman? | Kebijakan persistensi lokal terbatas dan rekonsiliasi server telah disetujui; server tetap sumber jawaban sah. | Detail browser, privasi perangkat, expiry, dan uji sinkronisasi; status OPEN. |
| SCN-06D3-044; OPEN | Bagaimana capability, interval, dan ambang monitoring? | Kebijakan sumber hibrida dan monitoring berbasis risiko telah disetujui; provider tidak diasumsikan. | Bukti provider, sumber, periode, akurasi; status OPEN. |

### Register Keputusan Pemilik 06E-4 dan 06E-4B

| ID keputusan | Asal; pilihan pemilik | Kebijakan | Konsekuensi | Rincian teknis belum final |
|---|---|---|---|---|
| DEC-06E4-001 | LDB-Q-006; B | Retensi idempotency key/outcome berbasis lifecycle operasi. | Replay aman pada masa perlindungan; outcome konsisten; tanpa hasil ganda; bersih setelah dependensi/audit. | Durasi, kedaluwarsa, mekanisme pembersihan. |
| DEC-06E4-002 | DB-Q-009; B | Ekspor operasional terverifikasi menjadi strategi utama backup/restore; provider tambahan opsional. | Mencakup PostgreSQL, Storage, mapping/dependensi media, bukti konsistensi, uji restore. | Cadence, retensi, lokasi, metode ekspor, prosedur; provider **PERLU VERIFIKASI PROVIDER**. |
| DEC-06E4-003 | LDM-Q-001; A | Reader dan validator multi-versi berdasarkan `schema_version`. | Snapshot immutable; rollback/Reader kontrak versi tepat; attempt pin versi asal; versi tak didukung aman. | Matriks versi, masa dukungan, penghentian kompatibilitas. |
| DEC-06E4-004 | LDM-Q-002; C | Rekonsiliasi Storage berkala dan setelah kegagalan operasi. | Deteksi mismatch, audit/tindak lanjut, cek dependensi, tanpa delete spekulatif. | Jadwal, metode, batas beban, format bukti operasional. |
| DEC-06E4B-001 | LDB-Q-005; C | Audit generik terpusat dengan klasifikasi domain. | Domain/jenis, aktor/komponen, subjek, waktu server, outcome, correlation ID, metadata tervalidasi; append-only konseptual. | Tabel, kolom, indeks, JSON, retensi, RLS fisik. |
| DEC-06E4B-002 | DB-Q-007; B | Instrumentasi tahapan kritis publish. | Correlation ID, status aman, pointer aktif baru mengesahkan sukses; aktif lama utuh jika gagal sebelum aktivasi. | Format event, logging, telemetry, retensi, transaksi. |
| DEC-06E4B-003 | LDB-Q-008; C | Persistensi lokal terbatas antrean jawaban. | Scope sesi/attempt, pemulihan/resend, server sumber kebenaran, minimisasi data, tanpa token mentah persisten otomatis. | IndexedDB/localStorage/sessionStorage, enkripsi, masa simpan, ukuran, isolasi fisik. |
| DEC-06E4B-004 | DB-Q-008; C | Rekonsiliasi server dan pengiriman ulang terkendali. | Verifikasi sesi/attempt/lifecycle/deadline/outcome; key sama; tidak membuat attempt/hasil baru. | Algoritma retry, jumlah/interval, sinkronisasi browser, format fisik. |
| DEC-06E4B-005 | LDB-Q-007; C | Telemetri provider terverifikasi + perhitungan aplikasi. | Bedakan metrik resmi, estimasi, tidak tersedia; sumber/waktu; akses berwenang; tanpa upgrade otomatis. | API, capability, cakupan provider, penyimpanan metrik. |
| DEC-06E4B-006 | DB-Q-010; C | Monitoring hibrida berbasis risiko. | Cek ringan, manual, pasca operasi; batasi/gabungkan beban; data usang bukan angka pasti; tanpa tindakan destruktif. | Interval, ambang, jadwal, frekuensi, API, capability. |
| DEC-06E5-001 | Publish; disetujui konseptual | Serialisasi publish per buku. | Satu operasi efektif per buku; pointer aktif/audit terlindungi. | Lock/queue/isolation fisik. |
| DEC-06E5-002 | Media lifecycle; disetujui konseptual | Pending Delete dengan revalidasi dependensi. | Delete menunggu referensi snapshot/attempt dan revalidasi. | State machine/periode/job fisik. |
| DEC-06E5-003 | Emergency Revoke; disetujui konseptual | Jalur aplikasi terkontrol. | Akses baru tunduk lifecycle/revoke. | API/cache/provider mekanisme. |
| DEC-06E5-004 | Media access; disetujui konseptual | Media privat melalui trusted server. | Otorisasi/scope/lifecycle diperiksa sebelum layanan. | Bucket, URL, RLS/policy fisik. |
| DEC-06E5-005 | Jawaban; disetujui konseptual | Revisi jawaban memakai optimistic version. | Tulis stale ditolak tanpa silent overwrite. | Atribut/versioning fisik. |
| DEC-06E5-006 | Finalisasi; disetujui konseptual | Atomik, first valid commit wins. | Maksimum satu hasil dari jawaban konsisten. | Isolation/locking transaksi. |
| DEC-06E5-007 | Backup; disetujui konseptual | Backup independen wajib; provider opsional. | Cakupan DB, Storage, mapping, bukti restore. | Cadence/tooling/provider. |
| DEC-06E5-008 | Orphan Storage; disetujui konseptual | Karantina logis dan pembersihan terkendali. | Tidak ada penghapusan spekulatif; audit tindak lanjut. | Periode karantina/job/bukti fisik. |
| DEC-06E5-009 | Antrean lokal; disetujui konseptual | Pemulihan terverifikasi. | Reconcile terhadap outcome server sebelum resend. | Browser store/retry/expiry. |
| DEC-06E5-010 | Kapasitas; disetujui konseptual | Monitoring hybrid dengan sumber, kepastian, risiko. | Tidak pasti bukan nol; tanpa aksi destruktif. | Ambang/interval/provider. |
| DEC-06E6-001 | Revoke; disetujui konseptual | Emergency Revoke prioritas atas publish/rollback. | Akses pulih hanya melalui tindakan eksplisit/sah. | Prioritas/sinkronisasi fisik. |
| DEC-06E6-002 | Media; disetujui konseptual | Dependensi mengalahkan penghapusan. | Publish/rollback tidak aktif dengan media tak terverifikasi. | Constraint/koordinasi fisik. |
| DEC-06E6-003 | Jawaban/finalisasi; disetujui konseptual | Commit server sah dan state jawaban atomik. | Tidak ada hasil dari jawaban belum sah. | Transaction isolation. |
| DEC-06E6-004 | Restore/revoke; disetujui konseptual | Restore tidak membuka akses revoked otomatis. | Lifecycle/revoke dipertahankan pasca restore. | Prosedur restore fisik. |
| DEC-06E6-005 | Restore; disetujui konseptual | Verifikasi DB, Storage, snapshot, attempt, hasil, dependensi. | Tidak ada klaim restore sehat tanpa bukti lengkap. | Tooling/runbook provider. |
| DEC-06E6-006 | Telemetri; disetujui konseptual | Tidak tersedia/kedaluwarsa = tidak pasti, bukan nol. | Peringatan tidak destruktif. | Sumber/TTL/ambang fisik. |

Status empat keputusan P0 adalah **DISETUJUI PEMILIK — 06E-4**, enam keputusan P1 adalah **DISETUJUI PEMILIK — 06E-4B**, enam belas keputusan 06E-5/06E-6 adalah **DISETUJUI SECARA KONSEPTUAL**, dan empat keputusan IA-Q adalah **DISETUJUI PEMILIK — 06E-7**. Seluruh rincian teknis tetap **BELUM FINAL**. Persetujuan kebijakan tidak mengubah status tujuh GAP atau tiga OPEN terkait.

`DEC-06E7-005` — **DISETUJUI PEMILIK**: konsumsi retry grant Fase 2 membuat sesi siswa baru dan attempt baru, dengan token baru; attempt serta hasil terdahulu tetap immutable. Keputusan ini mempertahankan kardinalitas satu attempt per sesi dan tidak menutup GAP/OPEN konkurensi atau persistence lokal.

### Register Status Keputusan

| ID | Status | Prioritas | Alternatif | Rekomendasi | Ketergantungan | Persetujuan yang dibutuhkan |
|---|---|---|---|---|---|---|
| LDB-Q-005 | DISETUJUI PEMILIK — 06E-4B | P1 | Pilihan C: audit generik berklasifikasi domain. | DEC-06E4B-001; detail BELUM FINAL. | ENT-018; DB-Q-007. | Tidak ada; detail teknis masih audit. |
| LDB-Q-006 | DISETUJUI PEMILIK — 06E-4 | P0 | Pilihan B: lifecycle operasi. | DEC-06E4-001; detail BELUM FINAL. | INV-008; SCN-06D3-027/029. | Tidak ada; detail teknis masih audit. |
| LDB-Q-007 | DISETUJUI PEMILIK — 06E-4B | P1 | Pilihan C: telemetry provider + perhitungan aplikasi. | DEC-06E4B-005; detail BELUM FINAL. | DB-Q-010; SCN-06D3-044. | Tidak ada; detail teknis masih audit. |
| LDB-Q-008 | DISETUJUI PEMILIK — 06E-4B | P1 | Pilihan C: persistensi lokal terbatas. | DEC-06E4B-003; detail BELUM FINAL. | DB-Q-008; SCN-06D3-034. | Tidak ada; detail teknis masih audit. |
| DB-Q-007 | DISETUJUI PEMILIK — 06E-4B | P1 | Pilihan B: instrumentasi publish kritis. | DEC-06E4B-002; detail BELUM FINAL. | LDB-Q-005; SCN-06D3-005. | Tidak ada; detail teknis masih audit. |
| DB-Q-008 | DISETUJUI PEMILIK — 06E-4B | P1 | Pilihan C: rekonsiliasi/resend terkendali. | DEC-06E4B-004; detail BELUM FINAL. | LDB-Q-008; SCN-06D3-034. | Tidak ada; detail teknis masih audit. |
| DB-Q-009 | DISETUJUI PEMILIK — 06E-4 | P0 | Pilihan B: ekspor operasional terverifikasi. | DEC-06E4-002; detail BELUM FINAL. | ENT-020; SCN-06D3-043. | Tidak ada; detail teknis masih audit. |
| DB-Q-010 | DISETUJUI PEMILIK — 06E-4B | P1 | Pilihan C: monitoring hibrida risiko. | DEC-06E4B-006; detail BELUM FINAL. | LDB-Q-007; SCN-06D3-044. | Tidak ada; detail teknis masih audit. |
| IA-Q-001 | DECIDED/CLOSED — CR-IA-001 | P2 | Sidebar hierarkis dan URL stabil. | Konteks buku; 15 route tetap. | Baseline terkait telah dikunci kembali. | Tidak ada keputusan baru; detail teknis tetap terpisah. |
| IA-Q-002 | DECIDED/CLOSED — CR-IA-001 | P2 | Breadcrumb hierarkis dan ringkas mobile. | Tautan ke tingkat sebelumnya; aktif terakhir. | Baseline terkait telah dikunci kembali. | Tidak ada keputusan baru; detail teknis tetap terpisah. |
| IA-Q-003 | DECIDED/CLOSED — CR-IA-001 | P2 | Ringkasan dan detail publish aman. | Tampilkan hanya metrik tersedia dan terverifikasi. | DB-Q-007; baseline terkait telah dikunci kembali. | Telemetry/retensi teknis belum final. |
| IA-Q-004 | DECIDED/CLOSED — CR-IA-001 | P2 | Indikator antrean dekat simpan/kirim. | Status lokal dibedakan dari penerimaan server. | DB-Q-008; SCN-06D3-034; baseline terkait telah dikunci kembali. | Browser store/retry/privacy/recovery masih OPEN. |
| LDM-Q-001 | DISETUJUI PEMILIK — 06E-4 | P0 | Pilihan A: multi-versi `schema_version`. | DEC-06E4-003; detail BELUM FINAL. | INV-002/013. | Tidak ada; detail teknis masih audit. |
| LDM-Q-002 | DISETUJUI PEMILIK — 06E-4 | P0 | Pilihan C: periodik + pasca-kegagalan. | DEC-06E4-004; detail BELUM FINAL. | INV-010; SCN-06D3-008/011. | Tidak ada; detail teknis masih audit. |

### Matriks Kriteria Penutupan GAP dan OPEN

| SCN | Status saat ini | Mitigasi yang diusulkan | Bukti yang diperlukan | Penghalang | Tahap verifikasi |
|---|---|---|---|---|---|
| SCN-06D3-005 | GAP | Arbitrasi publish per buku. | Konseptual, desain fisik, uji konkurensi, audit. | Model isolation. | Desain fisik lalu pengujian. |
| SCN-06D3-008 | GAP | Tahan delete/revalidasi dependensi. | Konseptual, desain fisik, uji Storage. | Detail DEC-06E4-004. | Desain media/operasional. |
| SCN-06D3-016 | GAP | Lifecycle pada API/cache/Storage. | Desain akses, uji revoke, provider cache. | Provider/cache. | Keamanan dan pengujian. |
| SCN-06D3-017 | GAP | Hindari URL bypass lifecycle. | Desain akses, uji URL/Storage. | Provider Storage. | Keamanan dan pengujian. |
| SCN-06D3-027 | GAP | Arbitrasi state attempt. | Desain fisik, uji submit paralel. | Kontrak konkurensi. | Aktivitas/pengujian. |
| SCN-06D3-029 | GAP | Kontrak interleaving attempt. | Desain fisik, empat uji interleaving. | Isolation belum dipilih. | Aktivitas/pengujian. |
| SCN-06D3-043 | GAP | Backup/restore tervalidasi. | Provider, prosedur, restore database/media/mapping. | Detail DEC-06E4-002/provider. | Operasional. |
| SCN-06D3-011 | OPEN | Rekonsiliasi tanpa hapus spekulatif. | Bukti object/mapping/tindak lanjut. | Detail DEC-06E4-004. | Operasional. |
| SCN-06D3-034 | OPEN | Kebijakan antrean lokal. | Keputusan owner dan uji recovery perangkat. | Kebijakan DISETUJUI melalui DEC-06E4B-003/004; detail penyimpanan browser, privasi/isolasi perangkat bersama, expiry, retry, serta uji recovery/sinkronisasi masih terbuka. | UX/implementasi. |
| SCN-06D3-044 | OPEN | Sumber/cadence metrik kuota. | Capability provider/akurasi periode. | Kebijakan DISETUJUI melalui DEC-06E4B-005/006; capability provider, sumber metrik aktual, interval, ambang peringatan, serta bukti akurasi/keterkinian masih terbuka. | Operasional. |

## DFS-15 — Keterlacakan ke FS-DOC-01 sampai FS-DOC-06

### Kandidat Data Individual

| Kandidat | ENT/REL/DB-REQ | Kebutuhan produk/kontrak | Status |
|---|---|---|---|
| 1 Principal admin | ENT-001; DB-REQ-001/022 | FR-ADM-002; NFR-SEC-001; INV-012. | TERVERIFIKASI |
| 2 Konfigurasi | ENT-002; DB-REQ-002 | FR-ADM-004; audit/otorisasi. | TERVERIFIKASI |
| 3 Buku | ENT-003; REL-001/002/006; DB-REQ-003/010 | FR-BOK-001; FR-PUB-003; INV-001/003. | TERVERIFIKASI |
| 4 Alias slug | ENT-004; REL-001; DB-REQ-004 | FR-LNK-002/003; AF-03-010. | TERVERIFIKASI |
| 5 Node | ENT-005; REL-002/003; DB-REQ-005 | FR-BOK-002; AF-03-024; INV-001/007. | TERVERIFIKASI |
| 6 Komponen | ENT-006; REL-003/004/005; DB-REQ-006 | FR-CMP-001; AF-03-024. | TERVERIFIKASI |
| 7 Tema | ENT-007; REL-004; DB-REQ-006 | FR-THM-001; representasi scope. | BELUM TERVERIFIKASI fisik |
| 8 Media | ENT-008; REL-005/007; DB-REQ-007/025 | FR-MED-001—003; INV-010. | TERVERIFIKASI konseptual |
| 9 Snapshot | ENT-009; REL-006—008; DB-REQ-009/010 | FR-PUB-003/004; INV-002—004. | TERVERIFIKASI |
| 10 Proyeksi publik | Turunan ENT-009; DB-REQ-012 | FR-PUB-005/007; INV-012; LDB-Q-003. | TERVERIFIKASI konseptual |
| 11 Aktivitas rahasia | ENT-010; REL-008/009; DB-REQ-017 | FR-ACT-001—006; INV-013. | TERVERIFIKASI |
| 12 Sesi siswa | ENT-011; REL-009/010; DB-REQ-016 | FR-ACT-002; NFR-SEC-004; INV-012. | TERVERIFIKASI |
| 13 Attempt | ENT-012; REL-010—013; DB-REQ-018 | FR-ACT-003/005/006; INV-009/013. | TERVERIFIKASI |
| 14 Jawaban | ENT-013; REL-011; DB-REQ-018 | FR-ACT-005/006; INV-008/009. | TERVERIFIKASI |
| 15 Hasil | ENT-014; REL-012; DB-REQ-019 | FR-ACT-007; NFR-SEC-004; INV-008. | TERVERIFIKASI |
| 16 Retry grant | ENT-015; REL-013; DB-REQ-020 | FR-ACT-008; Fase 2. | TERVERIFIKASI |
| 17 QR target | ENT-016; REL-014/015; DB-REQ-014 | FR-LNK-005/006; INV-011; Fase 2. | TERVERIFIKASI konseptual |
| 18 QR agregat | ENT-017; REL-014; DB-REQ-015 | FR-LNK-008; non-PII; Fase 2. | BELUM TERVERIFIKASI detail |
| 19 Audit | ENT-018; REL-015/016; DB-REQ-021 | NFR-SEC-001; LDB-Q-005. | TERVERIFIKASI konseptual |
| 20 Kapasitas | ENT-019; REL-018; DB-REQ-023 | NFR-CST-001/002; LDB-Q-007. | BELUM TERVERIFIKASI fisik |
| 21 Bukti recovery | ENT-020; REL-017; DB-REQ-024/025 | NFR-REL-003; AC-REL-001. | TERVERIFIKASI konseptual |
| 22 Hasil idempoten | DB-Q-004; INV-008 | FR-ACT-006; retensi LDB-Q-006. | BELUM TERVERIFIKASI retensi |
| 23 Dependensi media | REL-007; DB-REQ-025 | FR-MED-003; FR-PUB-008; INV-005/010. | TERVERIFIKASI |

### REL dan INV Individual

REL-001 sampai REL-018 dipetakan satu-per-satu dalam register DFS-05 dengan sumber primer `DATABASE_CONCEPTUAL_MODEL.md` CDM-04 dan status verifikasinya. Matriks berikut adalah register eksplisit invariant; **TERVERIFIKASI** hanya berarti kontrak konseptual dan penempatannya di dokumen dapat dibuktikan, bukan bahwa mekanisme fisik telah diimplementasikan.

| Invariant | Ringkasan kontrak baseline | Kandidat data | Relasi | Bagian DFS | Skenario 06D-3 | Status verifikasi |
|---|---|---|---|---|---|---|
| INV-001 | UUID stabil tidak berubah oleh reorder, pindah induk, atau nomor urut. | Buku, node, komponen. | REL-001—003. | DFS-04, DFS-05. | SCN-06D3-002, SCN-06D3-019. | TERVERIFIKASI konseptual. |
| INV-002 | Snapshot aktif/historis tidak berubah setelah publish. | Snapshot, proyeksi publik, aktivitas rahasia. | REL-006, REL-008. | DFS-04, DFS-06. | SCN-06D3-001, SCN-06D3-006. | TERVERIFIKASI konseptual. |
| INV-003 | Pointer aktif, audit wajib, dan pemulihan kegagalan atomik secara konseptual. | Buku, snapshot, audit. | REL-006, REL-016. | DFS-05, DFS-07. | SCN-06D3-001, SCN-06D3-005. | TERVERIFIKASI konseptual. |
| INV-004 | Publish gagal tidak menampilkan snapshot parsial atau mengganti aktif lama. | Snapshot, proyeksi publik, audit. | REL-006—008. | DFS-05, DFS-06, DFS-07. | SCN-06D3-001—005. | TERVERIFIKASI konseptual. |
| INV-005 | Rollback hanya mengaktifkan snapshot dengan media terverifikasi. | Snapshot, media, dependensi media. | REL-007. | DFS-04, DFS-05, DFS-09. | SCN-06D3-004, SCN-06D3-006—008. | TERVERIFIKASI konseptual. |
| INV-006 | Unpublish/revoke tidak menghapus histori wajib atau memberi nilai nol otomatis. | Buku, snapshot, attempt, hasil, retry grant, audit. | REL-006, REL-012, REL-013, REL-016. | DFS-05, DFS-10. | SCN-06D3-012—017, SCN-06D3-032/033/037. | TERVERIFIKASI konseptual. |
| INV-007 | Mutasi draf stale tidak menimpa mutasi lebih baru. | Buku, node, komponen. | REL-002, REL-003. | DFS-04, DFS-05, DFS-07. | SCN-06D3-002, SCN-06D3-005. | TERVERIFIKASI konseptual. |
| INV-008 | Retry/finalisasi dengan key sama tidak membuat hasil ganda. | Jawaban, hasil, retry grant, hasil idempoten. | REL-011—013. | DFS-04, DFS-05, DFS-07. | SCN-06D3-024/026—029/032. | TERVERIFIKASI konseptual; kebijakan lifecycle disetujui, detail retensi BELUM FINAL. |
| INV-009 | Waktu server UTC menentukan validitas deadline. | Aktivitas rahasia, attempt, jawaban. | REL-010, REL-011. | DFS-04, DFS-05, DFS-07. | SCN-06D3-024/025/027/029/034. | TERVERIFIKASI konseptual. |
| INV-010 | Media yang dirujuk snapshot/attempt tidak dihapus tidak aman. | Media, snapshot, dependensi media, audit. | REL-005, REL-007, REL-016/017. | DFS-04, DFS-05, DFS-09. | SCN-06D3-008—011/017/042. | TERVERIFIKASI konseptual; rekonsiliasi terbuka. |
| INV-011 | QR dinamis tidak menuju target eksternal, siklus, tidak aktif, unpublish, atau revoke. | Target QR, agregat QR, audit. | REL-014, REL-015. | DFS-04, DFS-05, DFS-10. | SCN-06D3-038—040. | TERVERIFIKASI konseptual. |
| INV-012 | Anonim tidak membaca/memutasi privat; privileged melewati server tepercaya. | Principal, proyeksi publik, sesi, audit. | REL-001, REL-009, REL-016. | DFS-04, DFS-06, DFS-08. | SCN-06D3-018—023/035—037/045. | TERVERIFIKASI konseptual. |
| INV-013 | Attempt tetap terikat aktivitas dan versi asal; publish/rollback/draf tidak mengubah histori penilaian. | Snapshot, aktivitas rahasia, attempt, jawaban, hasil. | REL-008, REL-010—012. | DFS-04, DFS-05, DFS-06, DFS-10. | SCN-06D3-029—031. | TERVERIFIKASI konseptual. |

### Catatan Penyelesaian Audit 06E-2A

| Temuan | Bukti perbaikan | Status |
|---|---|---|
| AUD-06E2-001 | Baris `INV-006` eksplisit pada matriks invariant ini, dengan kandidat, REL, DFS, dan skenario terkait. | SELESAI |
| AUD-06E2-002 | Register Atribut Konseptual Individual pada DFS-04 berisi dua baris atribut untuk setiap 23 kandidat, beserta klasifikasi, kewajiban, privasi, mutabilitas, dan sumber. | SELESAI |

### Keterlacakan Keputusan 06E-4B, 06E-5, dan 06E-6

| Keputusan | Kandidat/REL/INV | DB-REQ dan skenario | Bagian DFS | Status |
|---|---|---|---|---|
| DEC-06E4B-001 | Audit; REL-015/016; INV-012 | DB-REQ-021/022; SCN-06D3-005. | DFS-04, DFS-08, DFS-11, DFS-14. | TERVERIFIKASI konseptual. |
| DEC-06E4B-002 | Snapshot/audit; REL-006/016; INV-003/004 | DB-REQ-009/010/021; SCN-06D3-005. | DFS-07, DFS-11, DFS-14. | TERVERIFIKASI konseptual. |
| DEC-06E4B-003 | Sesi/attempt/jawaban; REL-010/011; INV-009/012 | DB-REQ-016/018/026; SCN-06D3-034. | DFS-03, DFS-07, DFS-08, DFS-10, DFS-14. | TERVERIFIKASI konseptual. |
| DEC-06E4B-004 | Attempt/jawaban/hasil; REL-010—012; INV-008/009/013 | DB-REQ-018/019/026; SCN-06D3-027/029/034. | DFS-07, DFS-10, DFS-14. | TERVERIFIKASI konseptual. |
| DEC-06E4B-005 | Kapasitas; REL-018 | DB-REQ-023; SCN-06D3-044. | DFS-03, DFS-04, DFS-11, DFS-14. | TERVERIFIKASI konseptual; provider belum diverifikasi. |
| DEC-06E4B-006 | Kapasitas; REL-018 | DB-REQ-023; SCN-06D3-044. | DFS-04, DFS-11, DFS-12, DFS-14. | TERVERIFIKASI konseptual; detail operasional belum final. |
| DEC-06E5-001 | Buku/snapshot/audit; REL-006/016; INV-003/004 | DB-REQ-009/010/021; SCN-06D3-005. | DFS-07, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E5-002 | Media/dependensi; REL-005/007; INV-005/010 | DB-REQ-007/025; SCN-06D3-008/011. | DFS-09, DFS-14. | TERVERIFIKASI konseptual; GAP/OPEN tetap. |
| DEC-06E5-003 | Proyeksi/snapshot; REL-006; INV-012 | DB-REQ-012/022; SCN-06D3-016. | DFS-06, DFS-08, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E5-004 | Media/snapshot; REL-005/007; INV-010/012 | DB-REQ-007/012/025; SCN-06D3-017. | DFS-08, DFS-09, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E5-005 | Attempt/jawaban; REL-010/011; INV-008/009 | DB-REQ-018; SCN-06D3-027. | DFS-07, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E5-006 | Attempt/jawaban/hasil; REL-011/012; INV-008/013 | DB-REQ-018/019; SCN-06D3-029. | DFS-07, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E5-007 | Bukti recovery; REL-017 | DB-REQ-024/025; SCN-06D3-043. | DFS-11, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E5-008 | Media/audit; REL-005/016; INV-010 | DB-REQ-007/021/025; SCN-06D3-011. | DFS-09, DFS-14. | TERVERIFIKASI konseptual; OPEN tetap. |
| DEC-06E5-009 | Sesi/attempt/jawaban; REL-010/011; INV-009 | DB-REQ-016/018/026; SCN-06D3-034. | DFS-10, DFS-14. | TERVERIFIKASI konseptual; OPEN tetap. |
| DEC-06E5-010 | Kapasitas; REL-018 | DB-REQ-023; SCN-06D3-044. | DFS-11, DFS-14. | TERVERIFIKASI konseptual; OPEN tetap. |
| DEC-06E6-001 | Snapshot/proyeksi/audit; REL-006/016; INV-006/012 | DB-REQ-011/012/021; SCN-06D3-016. | DFS-06, DFS-08, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E6-002 | Media/snapshot; REL-005/007; INV-005/010 | DB-REQ-007/009/025; SCN-06D3-008. | DFS-07, DFS-09, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E6-003 | Attempt/jawaban/hasil; REL-011/012; INV-008/009/013 | DB-REQ-018/019; SCN-06D3-027/029. | DFS-07, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E6-004 | Snapshot/attempt/hasil; REL-006/012; INV-006/013 | DB-REQ-011/019/024; restore/revoke. | DFS-06, DFS-11, DFS-14. | TERVERIFIKASI konseptual. |
| DEC-06E6-005 | Snapshot/media/attempt/hasil; REL-007/017; INV-005/010/013 | DB-REQ-024/025; SCN-06D3-043. | DFS-11, DFS-14. | TERVERIFIKASI konseptual; GAP tetap. |
| DEC-06E6-006 | Kapasitas; REL-018 | DB-REQ-023; SCN-06D3-044. | DFS-11, DFS-14. | TERVERIFIKASI konseptual; OPEN tetap. |

### GAP dan OPEN

SCN-06D3-005, SCN-06D3-008, SCN-06D3-016, SCN-06D3-017, SCN-06D3-027, SCN-06D3-029, SCN-06D3-043, SCN-06D3-011, SCN-06D3-034, dan SCN-06D3-044 ditautkan individual pada DFS-14. Referensi yang memerlukan desain fisik tetap berstatus GAP atau OPEN, bukan dianggap terverifikasi.

## DFS-16 — Kriteria Kesiapan Desain Fisik dan Implementasi

Desain fisik belum dapat dimulai sebagai keputusan final sampai:

1. Keputusan yang menghalangi struktur/policy fisik ditinjau pemilik dan arsitek.
2. GAP 06D-3 mendapat rancangan mitigasi yang diaudit.
3. Kontrak RLS, Storage URL, cache lifecycle, secret custody, dan proses operasional dirumuskan tanpa melanggar baseline.
4. Strategi backup/restore, provider capability, rekonsiliasi Storage, dan observasi kapasitas diverifikasi.
5. Rancangan tipe data, constraint, indeks, transaksi, migrasi, dan policy melalui review terpisah.

### Kesiapan Setelah Konsolidasi 30 Keputusan

Dokumen siap untuk audit independen atas kecukupan kontrak konseptual, bukan untuk implementasi. Audit berikutnya wajib memastikan tujuh GAP dan tiga OPEN tetap memakai status asli, menilai bukti pada DFS-14, serta memeriksa bahwa 30 keputusan yang disetujui tidak disalahartikan sebagai rincian teknis final. Rekomendasi yang bergantung cache, Storage, backup, atau kapasitas provider harus mempertahankan label **PERLU VERIFIKASI PROVIDER** sampai dibuktikan.

### Rencana Bertahap Desain Fisik dan Pembuktian Teknis

1. **Verifikasi tata kelola baseline:** patch administratif CR-IA-001 telah diterapkan pada dokumen yang berwenang; audit independen diperlukan sebelum penguncian ulang. Tidak ada perubahan terhadap 15 route, inventaris IA, fitur, atau fase.
2. **Spesifikasi fisik yang dapat diaudit:** turunkan kandidat data, atribut, relasi, akses, dan kontrak transaksi yang sudah ada menjadi opsi nama relasi, tipe, constraint, indeks, serta batas RLS—masing-masing tetap berstatus usulan sampai review teknis dan persetujuan yang diperlukan.
3. **Proof plan sebelum implementasi:** susun bukti untuk serialisasi publish, dependensi media, revoke/cache/Storage, submit paralel, auto-finalize, dan restore; tujuh GAP tidak boleh ditutup hanya karena desain fisik tertulis.
4. **Verifikasi operasi dan provider:** buktikan kemampuan cache/Storage, backup-restore, serta telemetri kapasitas sebelum memilih mekanisme, cadence, ambang, atau tindakan otomatis; tiga OPEN tetap terbuka sampai bukti tersedia.

Dokumen ini tetap draf; tidak menyetujui implementasi, SQL, migrasi, Supabase configuration, atau penguncian FS-DOC-06.
