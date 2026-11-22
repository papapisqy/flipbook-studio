# KAMUS DATA — FLIPBOOK STUDIO

## DD-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — Data Dictionary |
| Versi | `v0.1.0-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Menguraikan atribut kandidat, keluarga tipe, kewajiban, identitas, relasi, privasi, dan kebutuhan indeks sebagai dasar audit desain fisik. |
| Bukan cakupan | SQL, nama tabel/kolom final, enum fisik, default database final, constraint sintaktis, indeks final, RLS policy, migrasi, atau implementasi. |

## DD-01 — Cara Membaca Kamus

Nama kandidat dan atribut adalah istilah konseptual/logis. `Keluarga tipe usulan` menjelaskan kategori data yang perlu dipertimbangkan, bukan tipe PostgreSQL yang ditetapkan. `Default/usulan` tidak boleh diterapkan sebelum `DATABASE_CONSTRAINTS.md`, `RLS_SECURITY.md`, dan audit desain fisik selesai.

| Label | Arti |
|---|---|
| Wajib | Nilai diperlukan oleh kontrak baseline bila objek/kondisi tersebut ada. |
| Kondisional | Nilai hanya ada bila fitur, fase, atau kondisi lifecycle relevan. |
| Server-generated | Nilai harus dibuat/ditentukan server tepercaya, bukan dipercaya dari browser. |
| Server-only | Tidak boleh diekspos ke Reader atau Data API publik. |
| Belum final | Memerlukan keputusan fisik, audit, atau verifikasi provider. |

## DD-02 — Konvensi Tipe, Waktu, dan Identitas

| Kebutuhan | Konvensi usulan | Status |
|---|---|---|
| Identitas stabil | UUID atau identitas ekuivalen yang tidak berubah karena reorder/slug. | Diwarisi baseline; bentuk fisik belum ditetapkan. |
| Waktu server | Timestamp berzona waktu/UTC untuk lifecycle, deadline, audit, dan penerimaan jawaban. | Diwarisi baseline; presisi fisik belum final. |
| Data terstruktur | Dokumen terstruktur tervalidasi untuk snapshot/proyeksi/konfigurasi yang sesuai. | Snapshot immutable disetujui; format fisik belum final. |
| Rahasia | Nilai hanya di batas server/private, tidak diproyeksikan ke Reader. | Diwarisi baseline. |
| Token | Token mentah hanya browser; server menyimpan hash/verifier yang sesuai. | Diwarisi baseline. |
| Teks status | Daftar status terkontrol secara konseptual; enum/check fisik belum diputuskan. | Belum final. |

## DD-03 — Register Atribut Kandidat 01—08

| Kandidat | Atribut konseptual | Keluarga tipe usulan | Wajib | Kunci/relasi | Default/usulan | Privasi/mutabilitas | Referensi/status |
|---|---|---|---|---|---|---|---|
| 01 Principal admin | Identitas principal | UUID/identitas Auth | Wajib | Unik; subjek audit | Dari Auth, bukan input bebas | Privat; stabil | ENT-001; DB-REQ-001; terverifikasi konseptual |
| 01 Principal admin | Scope/status akses | Teks status terkontrol/claims tervalidasi | Wajib saat akses | Terikat principal | Tidak memberi akses tanpa verifikasi server | Privat; mutable terotorisasi | FR-ADM-002; NFR-SEC-001; belum final fisik |
| 02 Konfigurasi | Identitas konfigurasi | Teks terkontrol | Kondisional | Unik dalam scope aplikasi | Tidak ada default final | Privat | ENT-002; DB-REQ-002; belum ditentukan fisik |
| 02 Konfigurasi | Nilai dan jejak perubahan | Dokumen terstruktur + referensi audit | Kondisional | Terikat identitas konfigurasi | Perubahan wajib terotorisasi bila kritis | Privat/server-only bila rahasia; mutable terkontrol | DB-REQ-021; terverifikasi konseptual |
| 03 Buku | UUID stabil | UUID | Wajib | Unik; induk draf/versi | Server-generated | Privat sampai diproyeksikan; immutable identitas | ENT-003; INV-001 |
| 03 Buku | Metadata, slug aktif, revision | Teks tervalidasi + bilangan revisi | Wajib/kondisional | Slug sah; dasar CAS | Revision server-managed | Privat draf; mutable melalui CAS | DB-REQ-003/004/008; INV-007 |
| 04 Alias slug | Nilai alias | Teks URL-safe tervalidasi | Kondisional | Unik dalam scope resolusi | Tanpa redirect diam-diam | Publik kondisional; mutable lifecycle | ENT-004; REL-001 |
| 04 Alias slug | Buku tujuan/status | UUID referensi + status | Wajib bila alias ada | Ke buku | Status lifecycle belum final fisik | Publik kondisional | FR-LNK-002/003; INV-012 |
| 05 Node draf | UUID dan parent | UUID + referensi opsional | Wajib | Parent ke node/buku | Parent kosong untuk akar | Privat draf; parent mutable CAS | ENT-005; REL-002; INV-001 |
| 05 Node draf | Jenis, posisi, arsip | Teks terkontrol + urutan + status | Wajib saat aktif | Unik urutan belum final | Urutan/arsip server-validated | Privat draf; mutable CAS | DB-REQ-005; INV-007 |
| 06 Komponen draf | UUID, node pemilik, jenis | UUID + referensi + teks terkontrol | Wajib | Ke node | Server-generated identitas | Privat draf; identitas stabil | ENT-006; REL-003 |
| 06 Komponen draf | Konfigurasi dan posisi | Dokumen tervalidasi + urutan | Wajib sesuai jenis | Referensi media bila ada | Tidak menerima JavaScript bebas | Privat draf; mutable CAS | FR-CMP-001; REL-005 |
| 07 Override tema | Scope override | Referensi scope/polymorphic konseptual | Kondisional | Ke buku/node/komponen | Representasi scope belum final | Privat draf; mutable | ENT-007; REL-004; belum final |
| 07 Override tema | Nilai override | Dokumen token tervalidasi | Kondisional | Terikat scope | Mewarisi bila nilai tidak ada | Privat draf; mutable | FR-THM-001; terverifikasi konseptual |
| 08 Metadata media | Identitas, hash, lokasi | UUID + hash + locator Storage | Wajib | Unik; strategi dedupe belum final | Objek/verifikasi server-managed | Privat/Storage; metadata status mutable | ENT-008; DB-REQ-007 |
| 08 Metadata media | Status kesiapan/dependensi | Status terkontrol + referensi | Wajib saat dirujuk | Ke komponen/snapshot | Tidak layak publish sebelum valid | Privat operasional | REL-005/007; INV-005/010 |

## DD-04 — Register Atribut Kandidat 09—16

| Kandidat | Atribut konseptual | Keluarga tipe usulan | Wajib | Kunci/relasi | Default/usulan | Privasi/mutabilitas | Referensi/status |
|---|---|---|---|---|---|---|---|
| 09 Versi/snapshot | Identitas versi dan schema version | UUID + penanda versi | Wajib | Unik; ke buku | Server-generated saat publish | Privat operasional; immutable | ENT-009; INV-002 |
| 09 Versi/snapshot | Isi snapshot/lifecycle | Dokumen immutable + status | Wajib | Ke buku; pointer aktif terpisah | Tidak dapat dimutasi setelah publish | Privat; tidak otomatis Reader payload | DB-REQ-009/010; INV-003/004 |
| 10 Proyeksi publik | Identitas sumber versi | UUID/referensi versi | Wajib saat dilayani | Satu sumber versi konseptual | Dibuat server setelah validasi | Publik kondisional; immutable | DB-REQ-012; LDB-Q-003 |
| 10 Proyeksi publik | Konten diizinkan/bukti lifecycle | Dokumen tervalidasi + status | Wajib saat dilayani | Terikat versi | Tidak berisi secret/token/PII | Publik kondisional; invalid oleh lifecycle | INV-012; FR-PUB-005/007 |
| 11 Aktivitas rahasia | Identitas dalam versi | UUID/identitas stabil | Wajib bila aktivitas ada | Ke versi asal | Dibuat saat snapshot | Server-only; immutable publish | ENT-010; REL-008; INV-013 |
| 11 Aktivitas rahasia | Aturan, deadline, kunci/bobot | Dokumen privat + waktu UTC | Wajib sesuai aktivitas | Terikat aktivitas/versi | Deadline server-authoritative | Server-only; immutable publish | DB-REQ-017; NFR-SEC-004 |
| 12 Sesi siswa | Identitas sesi dan hash/verifier | UUID + hash/verifier | Wajib | Scope aktivitas | Token mentah tidak disimpan | Privat siswa/server; lifecycle mutable | ENT-011; FR-ACT-002 |
| 12 Sesi siswa | Scope aktivitas/status | Referensi aktivitas + status | Wajib | Ke definisi aktivitas | Server validates lifecycle | Privat siswa/server | REL-009/010; INV-012 |
| 13 Attempt | Identitas, sesi, versi/aktivitas asal | UUID + referensi | Wajib | Ke sesi dan asal immutable | Satu attempt MVP per sesi | Privat siswa/server; mutable sampai final | ENT-012; INV-013 |
| 13 Attempt | Deadline UTC/status finalisasi | Waktu UTC + status | Wajib | Terikat attempt | Server-generated/validated | Privat siswa/server; mutable terkontrol | DB-REQ-018; INV-009 |
| 14 Jawaban diterima | Identitas attempt/waktu diterima | UUID + waktu server | Wajib | Ke attempt | Waktu server, bukan waktu klien | Privat/server-only; append-safe | REL-011; INV-009 |
| 14 Jawaban diterima | Payload sah/key idempotensi | Dokumen tervalidasi + key | Wajib saat submit | Scope key belum final | Retensi lifecycle, angka belum final | Privat/server-only; immutable saat sah | INV-008; LDB-Q-006 |
| 15 Hasil final | Identitas attempt/outcome | UUID referensi + outcome terbatas | Wajib saat final | Maksimum satu per attempt | Server-only scoring | Privat; immutable setelah final | ENT-014; REL-012; INV-008 |
| 15 Hasil final | Dasar disclosure/waktu final | Kebijakan + waktu server | Kondisional | Ke hasil | Tidak mengungkap secret | Privat sebelum proyeksi server | DB-REQ-019; INV-013 |
| 16 Retry grant | Identitas/verifier/kedaluwarsa | UUID + verifier + waktu UTC | Wajib Fase 2 | Ke attempt asal | Token mentah tidak dipersistenkan | Server-only; satu kali konsumsi | ENT-015; DB-REQ-020 |
| 16 Retry grant | Attempt asal/status konsumsi | Referensi + status | Wajib Fase 2 | Ke attempt historis | Status final setelah konsumsi | Server-only; mutable terbatas | REL-013; INV-006/008 |

## DD-05 — Register Atribut Kandidat 17—23

| Kandidat | Atribut konseptual | Keluarga tipe usulan | Wajib | Kunci/relasi | Default/usulan | Privasi/mutabilitas | Referensi/status |
|---|---|---|---|---|---|---|---|
| 17 Target QR | Short code dan target internal | Teks pendek + referensi internal | Wajib Fase 2 | Short code unik konseptual | Menolak target eksternal/siklus | Resolusi publik kondisional; mutable terotorisasi | ENT-016; FR-LNK-005/006 |
| 17 Target QR | Status/lifecycle target | Status terkontrol | Wajib Fase 2 | Ke target | Server verifies publish status | Privat operasional | INV-011; DB-REQ-014 |
| 18 Agregat QR | Target dan periode | Referensi + tanggal/periode | Wajib bila disimpan | Unik target/periode belum final fisik | Asia/Jakarta sesuai baseline agregasi | Privat admin; mutable agregat | ENT-017; REL-014 |
| 18 Agregat QR | Hitungan non-PII | Bilangan agregat | Wajib bila disajikan | Ke target/periode | Tidak menyimpan IP/GPS/fingerprint/nama/kelas | Privat admin; mutable agregat | FR-LNK-008; DB-REQ-015 |
| 19 Audit | Identitas, waktu, aktor, subjek | UUID + waktu server + referensi | Wajib untuk aksi diaudit | Identitas event unik | Server timestamp | Operasional privat; append-only konseptual | ENT-018; DB-REQ-021 |
| 19 Audit | Aksi, outcome, bukti aman | Teks terkontrol + metadata tervalidasi | Wajib bila dicatat | Ke event | Tidak memuat token/secret/PII berlebih | Operasional privat; bentuk fisik belum final | LDB-Q-005; DEC-06E4B-001 |
| 20 Kapasitas | Sumber dan waktu observasi | Teks sumber + waktu | Kondisional operasional | Tidak ada key fisik final | Bedakan resmi/estimasi/tidak tersedia | Operasional privat; mutable | ENT-019; LDB-Q-007 |
| 20 Kapasitas | Ringkasan kuota/risiko | Nilai metrik + status kepastian | Kondisional | Ke observasi | Tidak ada aksi destruktif otomatis | Operasional privat; mutable | DB-Q-010; DEC-06E4B-006 |
| 21 Bukti recovery | Sumber/cakupan/waktu | Metadata bukti + waktu | Kondisional saat operasi | Tidak ada key fisik final | Cakupan DB/Storage/mapping | Operasional privat; append-only konseptual | ENT-020; DB-REQ-024 |
| 21 Bukti recovery | Hasil verifikasi restore | Status/bukti tervalidasi | Kondisional | Ke bukti recovery | Tidak mengklaim sukses bila cakupan kurang | Operasional privat; immutable bukti | NFR-REL-003; AC-REL-001 |
| 22 Hasil idempoten | Key dan scope operasi | Key opaque + scope terkontrol | Wajib untuk operasi idempoten | Unik dalam scope belum final | Server validates reuse | Privat/server-only; immutable per key | DB-Q-004; INV-008 |
| 22 Hasil idempoten | Outcome/bukti/retensi | Outcome tervalidasi + lifecycle | Wajib saat disimpan | Terikat key | Durasi/expiry/pembersihan belum final | Privat/server-only | LDB-Q-006; DEC-06E4-001 |
| 23 Dependensi media | Referensi snapshot/attempt dan media | Dua referensi UUID | Wajib bila media dipakai | Gabungan unik belum final fisik | Dibuat/diperiksa sebelum aktivasi | Operasional privat; immutable untuk snapshot | REL-007; DB-REQ-025 |
| 23 Dependensi media | Status verifikasi | Status + bukti aman | Wajib sebelum aktivasi/rollback | Ke dependensi | Tidak aktif bila belum tervalidasi | Operasional privat; historis setelah aktivasi | INV-005/010; LDB-Q-004 |

## DD-06 — Key, Referensi, dan Indeks Kandidat

| Area | Kebutuhan | Status |
|---|---|---|
| Primary identity | Identitas stabil untuk kandidat persisten dan objek yang diaudit. | Wajib konseptual; bentuk PK fisik belum final. |
| Referential integrity | Buku–struktur–komponen, versi–media, versi–aktivitas, sesi–attempt, attempt–jawaban/hasil/grant, QR–agregat. | Wajib konseptual; FK/composite FK fisik diturunkan pada tahap constraints. |
| Keunikan | UUID, slug/alias dalam scope, short code, satu hasil per attempt, dan key idempotensi dalam scope. | Scope/implementasi fisik perlu audit. |
| Read path | Resolusi slug, pointer versi aktif, Reader proyeksi, attempt milik sesi, audit per subjek, QR per short code. | Indeks kandidat; belum final. |
| Write/concurrency | CAS draf, pointer aktif, jawaban/finalisasi, retry consume, dependensi media. | Constraint/isolation belum final; GAP tetap. |

## DD-07 — Privasi dan Proyeksi

| Kelas | Data | Larangan |
|---|---|---|
| Public published | Proyeksi Reader yang tervalidasi. | Tidak memuat draf, rahasia scoring, token, atau data siswa. |
| Admin private | Draf, konfigurasi, media metadata, audit aman. | Tidak dapat dibaca Reader anonim. |
| Student/session private | Sesi, attempt, jawaban, hasil terbatas. | Tidak lintas sesi/perangkat bersama tanpa validasi. |
| Server-only | Hash/verifier yang relevan, kunci jawaban, bobot, scoring, grant verifier. | Tidak ke browser/Data API publik. |
| Operational | Audit, kapasitas, backup/recovery evidence. | Tidak memuat PII/secret berlebih. |
| Client-local | Posisi baca, preferensi, status B/antrean terbatas. | Bukan bukti penerimaan server; tidak menyimpan token mentah otomatis. |

## DD-08 — GAP dan OPEN yang Tidak Ditutup

Kamus ini tidak menutup tujuh GAP (`SCN-06D3-005`, `008`, `016`, `017`, `027`, `029`, `043`) maupun tiga OPEN (`SCN-06D3-011`, `034`, `044`). Khusus atribut idempotensi, antrean lokal, Storage, telemetry, dan backup, rincian fisik tetap menunggu kontrak concurrency, provider verification, serta proof plan.

## DD-09 — Keterlacakan dan Kesiapan

Kamus mencakup 23 kandidat dan 46 baris atribut konseptual. Referensi utamanya adalah ENT-001—020, REL-001—018, INV-001—013, dan DB-REQ-001—026. Ia siap diaudit sebagai draf dan menjadi masukan untuk `DATABASE_CONSTRAINTS.md`; dokumen tersebut harus menentukan kontrak integritas tanpa langsung menghasilkan SQL atau migrasi.

## DD-10 — Status Akhir

Status tetap **DRAF — BELUM DIAUDIT**. Tidak ada keputusan fisik baru yang dikunci melalui dokumen ini.
