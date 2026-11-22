# DATABASE SECURITY & DATA LIFECYCLE — FLIPBOOK STUDIO

## DSL-00 — Metadata dan Status

| Item | Nilai |
|---|---|
| Proyek | Flipbook Studio |
| Identitas | FS-DOC-06 — Dokumen Kerja Keamanan dan Siklus Hidup Data |
| Versi | `v0.1.2-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Bahasa | Indonesia |
| Batas | Analisis konseptual; bukan SQL, migrasi, policy RLS sintaktis, atau bukti implementasi. |

Dokumen ini mengonsolidasikan analisis 06D-1 sampai 06D-3. Ia tidak mengubah keputusan baseline, tidak mengunci FS-DOC-06, dan tidak memilih keputusan yang masih terbuka.

### Dokumen Acuan

`PRODUCT_REQUIREMENTS.md` (FS-DOC-01), `APP_FLOW.md` (FS-DOC-02), `INFORMATION_ARCHITECTURE.md` (FS-DOC-03), `CORE_FEATURES.md` (FS-DOC-04), `UI_UX_SPEC.md` (FS-DOC-05), `DB_CONCEPTUAL_DECISIONS.md`, `DATABASE_CONCEPTUAL_MODEL.md`, `DB_LOGICAL_DECISIONS.md`, dan `DATABASE_LOGICAL_MODEL.md`.

### Riwayat Perubahan

| Versi | Tanggal | Keterangan |
|---|---|---|
| v0.1.0-draft | 18 November 2026 | Konsolidasi 06D-1, 06D-2, 06D-3; draf menunggu audit independen. |
| v0.1.1-draft | 18 November 2026 | Revisi 06D-3B: pendalaman skenario, keterlacakan terpisah, interleaving finalisasi, dan klarifikasi backup/restore proyeksi publik. |
| v0.1.2-draft | 18 November 2026 | Revisi 06D-3C: matriks keterlacakan kanonis DSL-13 dengan kolom ENT, REL, INV, dan DB-REQ terpisah. |

## DSL-01 — Prinsip Keamanan

1. RLS berpostur default-deny; akses langsung privat ditolak kecuali jalur yang diizinkan.
2. Browser React/Vite dan Cloudflare Pages bukan server tepercaya dan tidak boleh menyimpan `service_role` atau secret privileged.
3. Snapshot lengkap immutable serta definisi aktivitas rahasia tetap privat; Reader menerima proyeksi publik tervalidasi saja.
4. Lifecycle publikasi diperiksa pada jalur aplikasi yang dikendalikan; cache bukan sumber kebenaran.
5. Data siswa minimum, hasil, token hash, audit, dan rahasia scoring dipisahkan dari payload publik.
6. CAS, idempotensi, deadline UTC, audit, serta satu hasil final per attempt melindungi integritas operasi.
7. Media yang direferensikan snapshot atau attempt tidak boleh dihapus tidak aman; PostgreSQL dan Storage tidak dianggap satu transaksi terdistribusi.

## DSL-02 — Inventaris Keamanan

### SEC-REQ

| ID | Ringkasan | Klasifikasi | Referensi primer |
|---|---|---|---|
| SEC-REQ-001 | Otorisasi admin/endpoint privat | EXPLICIT | FR-ADM-002; NFR-SEC-001 |
| SEC-REQ-002 | Audit tindakan kritis | EXPLICIT | FR-ADM-004 |
| SEC-REQ-003 | Reader hanya memperoleh data publik | EXPLICIT | NFR-SEC-001/004 |
| SEC-REQ-004 | Token sesi di-hash | EXPLICIT | FR-ACT-002 |
| SEC-REQ-005 | Scoring server-only | EXPLICIT | FR-ACT-003; AC-ACT-001 |
| SEC-REQ-006 | Attempt dipin pada versi asal | EXPLICIT | FR-PUB-005; INV-013 |
| SEC-REQ-007 | Deadline UTC/finalisasi deterministik | EXPLICIT | FR-ACT-005 |
| SEC-REQ-008 | Operasi jawaban idempoten | EXPLICIT | FR-ACT-006; NFR-REL-002 |
| SEC-REQ-009 | Isolasi data privat | EXPLICIT | NFR-SEC-004 |
| SEC-REQ-010 | Retensi media berbasis dependensi | EXPLICIT | FR-MED-003 |
| SEC-REQ-011 | Rekonsiliasi metadata–Storage | DERIVED | LDM-09/LDM-10; FR-MED-003 |
| SEC-REQ-012 | Lifecycle unpublish/revoke | EXPLICIT | FR-PUB-006/007 |
| SEC-REQ-013 | Publish/rollback aman | EXPLICIT | FR-PUB-004; INV-003/004 |
| SEC-REQ-014 | Privasi/disclosure siswa | EXPLICIT | FR-ACT-007/008 |
| SEC-REQ-015 | Backup/restore | EXPLICIT | NFR-REL-003 |
| SEC-REQ-016 | Kuota dan biaya | EXPLICIT | NFR-CST-001/002 |

### SEC-RISK

| ID | Risiko | Pengendalian konseptual |
|---|---|---|
| SEC-RISK-001 | Snapshot privat terbuka | Proyeksi tervalidasi; INV-012 |
| SEC-RISK-002 | Kunci jawaban bocor | ENT-010/private scoring |
| SEC-RISK-003 | Token sesi bocor | Hash token; batas sesi |
| SEC-RISK-004 | Akses lintas-sesi | Ownership/token/RLS |
| SEC-RISK-005 | Silent overwrite | CAS/INV-007 |
| SEC-RISK-006 | Double submit | Idempotensi/INV-008 |
| SEC-RISK-007 | Histori hasil berubah | Pin versi/INV-013 |
| SEC-RISK-008 | Snapshot gagal aktif | INV-003/004 |
| SEC-RISK-009 | Media terhapus salah | INV-010 |
| SEC-RISK-010 | Metadata–Storage tidak sinkron | Audit/reconciliation |
| SEC-RISK-011 | Revoke tidak efektif | Lifecycle check/cache controlled path |
| SEC-RISK-012 | PII/hasil bocor | Disclosure dan boundary privat |
| SEC-RISK-013 | QR ilegal/siklus | INV-011 |
| SEC-RISK-014 | Backup tak dapat dipulihkan | Restore test/mapping media |
| SEC-RISK-015 | Kuota/biaya tak terkendali | Monitoring tanpa auto-upgrade |

## DSL-03 — Data Lifecycle

Legenda: B = BERLAKU; K = KONDISIONAL; T = TIDAK BERLAKU; O = TERBUKA.

| DLC | Data | Bentuk | Mut | Imm | Arsip | Unpub | Revoke | Rollback | Retensi | Hapus | Backup | Restore | Audit | Rekon |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| DLC-001 | Buku | B | K | T | K | B | B | B | O | K | B | B | B | T |
| DLC-002 | Draf | B | B | T | K | T | T | T | O | K | B | B | K | T |
| DLC-003 | Snapshot | B | T | B | K | B | B | B | K | K | B | B | B | K |
| DLC-004 | Proyeksi publik | B | T | K | T | B | B | B | T | T | T | T | K | K |
| DLC-005 | Media | B | K | K | K | K | K | B | K | K | B | B | B | K |
| DLC-006 | Aktivitas rahasia | B | T | B | K | K | K | B | K | K | B | B | B | T |
| DLC-007 | Sesi/token | B | K | T | K | K | B | T | O | K | K | K | K | T |
| DLC-008 | Attempt/jawaban | B | K | K | K | K | B | T | O | K | B | B | K | T |
| DLC-009 | Hasil final | B | T | B | K | T | T | T | O | K | B | B | K | T |
| DLC-010 | Retry grant | B | K | K | T | K | B | T | O | K | B | B | B | T |
| DLC-011 | QR/agregat | B | K | K | K | K | K | K | O | K | K | K | B | T |
| DLC-012 | Audit | B | T | B | T | T | T | T | O | K | B | B | T | T |
| DLC-013 | Idempotensi | B | T | K | T | T | T | T | O | K | K | K | K | T |
| DLC-014 | Bukti operasional | K | K | K | T | T | T | T | O | K | K | B | K | K |

Keterangan penting: K pada media berarti dependensi snapshot/attempt wajib diperiksa; K pada proyeksi berarti mengikuti lifecycle versi; O pada retensi tidak menetapkan angka; K pada rekonsiliasi media bergantung LDM-Q-002; T berarti dimensi tidak membentuk lifecycle langsung bagi data tersebut.

**Klarifikasi proyeksi publik:** status `T` pada kolom Backup dan Restore DLC-004 berarti proyeksi publik tidak diwajibkan sebagai *lifecycle mandiri* atau entitas fisik tersendiri. Status tersebut tidak mengecualikan backup, verifikasi restore, atau pemeriksaan integritas atas representasi fisik proyeksi apabila implementasi kelak menyimpannya. Snapshot sumber, media, dan mapping tetap berada dalam kewajiban backup/restore DLC-003, DLC-005, dan DLC-014.

## DSL-04 — Aktor dan Trust Boundary

| Aktor/komponen | Batas kepercayaan | Ketentuan |
|---|---|---|
| Reader anonim | Tidak tepercaya | REQUEST-CONDITIONAL hanya untuk proyeksi publik aktif dan sah. |
| Administrator | Terautentikasi, tidak otomatis privileged | Boleh meminta operasi sesuai scope; server mengeksekusi operasi sensitif. |
| Siswa bertoken | Scope sesi sendiri | Tidak memiliki akun; token hash diverifikasi server. |
| Server tepercaya | Boundary privileged | Validasi otorisasi, lifecycle, scoring, audit, dan transaksi PostgreSQL. |
| Proses operasional | Privileged terbatas | Backup, restore, kuota, dan rekonsiliasi; bukan admin aplikasi biasa. |
| Browser/Cloudflare Pages | Tidak tepercaya | Frontend/hosting publik; tidak memuat service-role atau secret. |
| Auth/PostgREST/RLS | Boundary identitas/data | Auth tidak menggantikan otorisasi objek; RLS default-deny. |
| Edge Functions/RPC | Boundary server | Validasi konteks sebelum menjalankan operasi privileged. |
| Storage/cache/CDN | Boundary eksternal | Tidak atomik dengan PostgreSQL; cache wajib mengikuti lifecycle. |

## DSL-05 — Matriks Otorisasi

Legenda: RA = REQUEST-ALLOW; RC = REQUEST-CONDITIONAL; RD = REQUEST-DENY; ESO = EXECUTE-SERVER-ONLY.

| Kandidat LDM-03 | Reader | Admin | Siswa | Operasional | Execute | Pemeriksaan / penolakan aman |
|---|---|---|---|---|---|---|
| Principal admin | RD | RC | RD | RC | ESO | Auth/scope; 401/403 tanpa data |
| Konfigurasi aplikasi | RD | RC | RD | RD | ESO | Auth, validasi nilai, nilai lama tetap |
| Buku | RC | RC | RC | RC | ESO | Scope dan lifecycle publik |
| Alias slug | RC | RC | RC | RC | ESO | Alias/tujuan internal sah |
| Node struktur draf | RD | RC | RD | RD | ESO | Scope buku dan CAS |
| Komponen draf | RD | RC | RD | RD | ESO | Scope node/buku dan CAS |
| Override tema | RD | RC | RD | RD | ESO | Scope/fallback tervalidasi |
| Metadata media | RC | RC | RC | RC | ESO | Hash, referensi, lifecycle |
| Versi publikasi | RD | RC | RD | RC | ESO | Validasi snapshot/proyeksi/media |
| Proyeksi publik | RC | RC | RC | RC | ESO | Versi tervalidasi, lifecycle, revoke, cache/Storage controlled path |
| Definisi rahasia aktivitas | RD | RC | RD | RD | ESO | Server/private schema; tidak ke browser |
| Sesi siswa | RD | RC | RC | RD | ESO | Token hash, scope sesi, lifecycle |
| Attempt | RD | RC | RC | RD | ESO | Ownership, versi asal, retry sah |
| Jawaban | RD | RD | RC | RD | ESO | Token, deadline UTC, idempotency |
| Hasil final | RD | RC | RC | RD | ESO | Disclosure, ownership, satu hasil |
| Retry grant | RD | RC | RC | RD | ESO | Expiry, single-use, lifecycle |
| Target QR dinamis | RC | RC | RC | RC | ESO | Internal, anti-siklus, lifecycle |
| Agregat QR | RD | RC | RD | RC | ESO | Non-PII agregat saja |
| Audit event | RD | RC | RD | RC | ESO | Scope audit/redaksi data |
| Observasi kapasitas | RD | RC | RD | RC | ESO | Sumber metrik tervalidasi |
| Bukti backup/pemulihan | RD | RC | RD | RC | ESO | Kewenangan operasional |
| Hasil operasi idempoten | RD | RD | RD | RD | ESO | Terikat operasi/scope; retensi terbuka |
| Dependensi snapshot-media | RD | RC | RD | RC | ESO | Cek referensi, pending delete, race |

## DSL-06 — Kontrak 24 Jalur Akses

| # | Jalur | Validasi server | Bypass ditolak / respons gagal |
|---:|---|---|---|
| 1 | Login admin | Auth dan sesi admin | Login palsu ditolak |
| 2 | Dashboard | Auth, scope, RLS | Data privat tidak bocor |
| 3 | Baca draf | Scope buku, RLS | Anon/siswa ditolak |
| 4 | Autosave CAS | expected revision | Konflik, bukan overwrite |
| 5 | Unggah media | Scope, tipe, hash | Storage privat langsung ditolak |
| 6 | Publish | Draf, rahasia, proyeksi, media | Pointer tidak aktif bila gagal |
| 7 | Rollback | Versi/media target | Pointer lama tetap |
| 8 | Unpublish | Grace/lifecycle | Sesi baru ditolak |
| 9 | Immediate block | Lifecycle gateway | Mutasi sesi dihentikan |
| 10 | Emergency revoke | Backend/gateway/cache | Tidak menjanjikan tarik salinan lokal |
| 11 | Reader publik | Proyeksi tervalidasi/lifecycle | Snapshot lengkap ditolak |
| 12 | Alias | Alias/tujuan sah | State deep-link aman |
| 13 | Buat sesi | Aktivitas aktif/token hash | Tidak buat sesi tidak sah |
| 14 | Simpan jawaban | Token, ownership, UTC, key | Tolak tanpa mutasi |
| 15 | Finalisasi | Sesi sah atau proses server; deadline/idempotency | Reader anonim ditolak |
| 16 | Baca hasil | Disclosure/ownership | Hasil lintas-sesi ditolak |
| 17 | Terbit retry grant | Admin/attempt/lifecycle | Audit dan tanpa overwrite |
| 18 | Konsumsi retry | Grant valid sekali pakai | Pemakaian ulang ditolak |
| 19 | QR dinamis | Target internal/lifecycle | Tanpa redirect ilegal |
| 20 | Agregat QR | Admin, non-PII | Raw event/PII ditolak |
| 21 | Hapus media | Dependensi/pending/race | Tanda/audit/rekon bila gagal |
| 22 | Rekonsiliasi Storage | Operasional berwenang | Hapus spekulatif ditolak |
| 23 | Backup/restore | Provider/process scope | Jangan klaim berhasil tanpa bukti |
| 24 | Kuota | Sumber metrik | Tanpa auto-upgrade |

## DSL-07 — Kontrak Operasi Kritis

| Operasi | Pemicu | Kontrak server | Bukti / kegagalan |
|---|---|---|---|
| CAS autosave | Admin | expected revision dan scope draf | Konflik tanpa silent overwrite |
| Publish | Admin meminta | Validasi draf, aktivitas rahasia, proyeksi, media sebelum pointer/audit atomik | Pointer lama tetap bila prasyarat gagal |
| Rollback | Admin meminta | Verifikasi versi/media lalu pointer/audit atomik | Gagal media tidak mengubah pointer |
| Unpublish | Admin meminta | Grace atau immediate block | Histori wajib utuh |
| Emergency revoke | Admin meminta | Backend/gateway menolak akses baru | Audit; tidak ada nilai nol otomatis |
| Hapus media | Admin meminta | Cek dependensi, pending delete, koordinasi DB–Storage | Tandai/audit/rekon pascagagal |
| Sesi siswa | Siswa | Token CSPRNG browser, hash server, lifecycle | Tidak ada token mentah persisten |
| Submit jawaban | Siswa sah | Ownership, UTC, idempotency | Data lain tidak berubah |
| Finalisasi | Siswa sah atau server | Token/attempt/versi/deadline/status/key; satu hasil | Rahasia tidak ke browser |
| Retry grant Fase 2 | Admin/siswa | Single-use, expiry, lifecycle | Histori lama tetap |
| QR dinamis Fase 2 | Reader/admin | Target internal/anti-siklus/lifecycle | Tidak bypass status |
| Backup/restore | Operasional | Mapping DB–media diverifikasi | Bukti restore diperlukan |

## DSL-08 — Inventaris Invariant

| ID | Kontrak | Referensi |
|---|---|---|
| INV-001 | UUID stabil | CDM-05; DB-REQ-003—006 |
| INV-002 | Snapshot immutable | CDM-05; FR-PUB-003 |
| INV-003 | Pointer/audit atomik | FR-PUB-004; DB-REQ-010 |
| INV-004 | Publish gagal tidak aktif | AC-PUB-002; AUD-06C4-001 |
| INV-005 | Media target rollback tervalidasi | FR-PUB-008; DB-REQ-025 |
| INV-006 | Lifecycle tidak menghapus histori | FR-PUB-006/007 |
| INV-007 | CAS menolak stale write | FR-EDT-007; DB-REQ-008 |
| INV-008 | Idempotensi operasi/finalisasi | FR-ACT-006; NFR-REL-002 |
| INV-009 | Deadline UTC server | FR-ACT-005 |
| INV-010 | Media berreferensi tidak dihapus tidak aman | FR-MED-003 |
| INV-011 | QR internal/lifecycle/anti-siklus | FR-LNK-005/006 |
| INV-012 | Default-deny/trusted boundary | NFR-SEC-001/004 |
| INV-013 | Attempt pin aktivitas/snapshot asal | FR-PUB-005 |

## DSL-09 — Validasi 45 Skenario

Kolom skenario memenuhi 14 dimensi: ID, tujuan, aktor/komponen, kondisi awal, urutan, titik kegagalan, invariant, respons wajib, data boleh berubah, data dilarang berubah, hasil, audit/bukti, risiko residual, referensi/status.

| ID | Tujuan; aktor/komponen | Awal → urutan → kegagalan | Inv | Respons/data boleh-tidak boleh berubah | Hasil; audit; residual | Referensi | Status |
|---|---|---|---|---|---|---|---|
| SCN-06D3-001 | Publish; admin/server | Draf sah → validasi → aktivasi | 2,3,4 | Versi/pointer/audit boleh; versi lama tidak berubah | Aktif satu versi; audit; race fisik | FR-PUB-003/004 | PASS KONSEPTUAL |
| 002 | Draf gagal; admin/server | Draf invalid → validasi gagal | 4 | Tidak ada pointer/snapshot aktif baru | Error blokir; bukti validasi | FR-PUB-002 | PASS KONSEPTUAL |
| 003 | Proyeksi gagal; server | Proyeksi disiapkan → gagal validasi | 4,12 | Tidak ada aktivasi/payload publik | Pointer lama; audit bila kritis | LDB-Q-003 | PASS KONSEPTUAL |
| 004 | Publish vs delete media | Publish/delete bersamaan | 5,10 | Tidak boleh hilang media dependensi | Tolak/tunda; audit | AUD-06C4-002 | PASS KONSEPTUAL |
| 005 | Dua publish; admin | Dua request buku sama | 3,4,7 | Satu hasil sah; tanpa pointer korup | Outcome terurut; concurrency fisik terbuka | INV-003/004/007 | GAP |
| 006 | Rollback valid | Versi/media sah → rollback | 2,3,5 | Pointer/audit boleh; versi historis tetap | Aktif versi target; audit | FR-PUB-008 | PASS KONSEPTUAL |
| 007 | Rollback media hilang | Target gagal media check | 5 | Pointer dilarang berubah | Rollback batal | AC-PUB-005 | PASS KONSEPTUAL |
| 008 | Rollback vs delete | Operasi bersamaan | 5,10 | Media target tidak boleh hilang | Tolak/tunda; physical race terbuka | AUD-06C4-002 | GAP |
| 009 | Storage gagal pra-hapus | Delete media sebelum objek hapus | 10 | Referensi sah tetap | Gagal aman; audit | LDM-10 | PASS KONSEPTUAL |
| 010 | Storage gagal pasca-hapus | Objek hilang, metadata tersisa | 10 | Tandai/audit/rekon; jangan klaim konsisten | Rekon diperlukan | LDM-09/10 | PASS KONSEPTUAL |
| 011 | Orphan Storage | Objek tanpa referensi ditemukan | 10 | Tidak hapus spekulatif | Bukti rekonsiliasi; jadwal terbuka | LDM-Q-002 | OPEN |
| 012 | Snapshot dirujuk attempt | Hapus snapshot historis | 6,13 | Histori/attempt tidak berubah | Delete ditolak | AC-PUB-006 | PASS KONSEPTUAL |
| 013 | Unpublish grace | Sesi aktif → unpublish | 6,9 | Sesi lama boleh selesai; baru ditolak | Audit lifecycle | AC-PUB-003 | PASS KONSEPTUAL |
| 014 | Immediate block | Sesi aktif → block | 6 | Mutasi baru berhenti; histori utuh | State block; audit | FR-PUB-006 | PASS KONSEPTUAL |
| 015 | Revoke Reader | Reader terbuka → revoke | 6,12 | Akses baru berhenti; histori utuh | Cache controlled; salinan lokal tak dijanjikan | AC-PUB-004 | PASS KONSEPTUAL |
| 016 | Cache stale revoke | Cache menyimpan proyeksi lama | 12 | Cache wajib lifecycle-aware | Risiko invalidasi fisik | AUD-06C4-001 | GAP |
| 017 | URL Storage pascarevoke | URL objek langsung | 12 | Objek privat/lifecycle blocked tidak dilayani | Policy URL belum fisik | SEC-RISK-011 | GAP |
| 018 | Reader meminta snapshot | API snapshot lengkap | 12 | Tidak ada rahasia/snapshot keluar | Tolak aman | NFR-SEC-001/004 | PASS KONSEPTUAL |
| 019 | Reader meminta draf | Query privat | 12 | Tidak ada draf keluar | 401/403/kosong | AC-SEC-001 | PASS KONSEPTUAL |
| 020 | Alias buku tidak aktif | Alias lama → resolve | 12 | Tidak sajikan konten | State aman/no silent redirect | FR-LNK-002/003 | PASS KONSEPTUAL |
| 021 | Token valid | Siswa token sah | 12 | Hanya sesi sendiri boleh dibaca | Validasi verifier | FR-ACT-002 | PASS KONSEPTUAL |
| 022 | Token palsu | Token tak cocok | 12 | Tidak ada data attempt | Tolak aman | FR-ACT-002 | PASS KONSEPTUAL |
| 023 | Token A/attempt B | Cross-session request | 12 | Data B tidak berubah/terbuka | Tolak ownership | REL-010 | PASS KONSEPTUAL |
| 024 | Submit sebelum deadline | Token sah → save | 8,9 | Jawaban sah boleh berubah | Simpan idempoten | FR-ACT-005/006 | PASS KONSEPTUAL |
| 025 | Submit setelah deadline | UTC lewat → submit | 9 | Jawaban baru dilarang; sah lama dipakai | Tolak/finalize | AC-ACT-002 | PASS KONSEPTUAL |
| 026 | Submit key sama | Dua request same key | 8 | Satu outcome saja | Respons identik | AC-ACT-005 | PASS KONSEPTUAL |
| 027 | Submit key beda paralel | Dua request paralel | 8,9 | Tidak korup; hanya sah sebelum deadline | Aturan concurrency fisik terbuka | DB-REQ-018 | GAP |
| 028 | Finalisasi dua kali | Dua finalisasi | 8 | Maksimum satu hasil | Hasil sama; audit | REL-012 | PASS KONSEPTUAL |
| 029 | Auto-finalize vs submit | Submit dan on-access/deadline bersamaan | 8,9,13 | Hanya jawaban diterima sebelum deadline; satu hasil; attempt/version tetap | Server membandingkan UTC, status finalisasi, idempotency; submit terlambat ditolak; race fisik perlu implementasi | FR-ACT-005/006; AF-03-013/014 | GAP |
| 030 | Publish saat attempt lama | Publish baru | 13 | Attempt/historis tidak berubah | Pin versi asal | FR-PUB-005 | PASS KONSEPTUAL |
| 031 | Rollback saat hasil ada | Rollback historis | 13 | Hasil lama tidak berubah | Pointer saja berubah | INV-013 | PASS KONSEPTUAL |
| 032 | Retry dua kali | Grant dikonsumsi dua kali | 6 | Attempt lama tetap; satu baru maksimal | Kedua ditolak | AC-ACT-003 | PASS KONSEPTUAL |
| 033 | Retry pascarevoke | Grant + revoke | 6 | Tidak buat attempt baru | Tolak lifecycle | FR-ACT-008 | PASS KONSEPTUAL |
| 034 | Antrean lokal hilang | Browser kehilangan Status B | 9 | Hanya jawaban server sah dinilai | Offline persistence terbuka | DB-Q-008 | OPEN |
| 035 | Hasil sesi lain | Siswa minta hasil B | 12 | Hasil B tidak keluar | Tolak aman | DB-REQ-019 | PASS KONSEPTUAL |
| 036 | QR statis aktif | URL buku aktif | 12 | Konten publik sah boleh | Reader dilayani | FR-LNK-004 | PASS KONSEPTUAL |
| 037 | QR statis unpublish | URL buku tak aktif | 6,12 | Konten dilarang | State lifecycle aman | FR-PUB-006 | PASS KONSEPTUAL |
| 038 | QR dinamis target mati | Resolve short code | 11 | Tidak redirect | Penolakan aman | FR-LNK-005 | PASS KONSEPTUAL |
| 039 | QR siklus | Konfigurasi siklik | 11 | Target tidak disimpan | Tolak validasi | AC-LNK-004 | PASS KONSEPTUAL |
| 040 | Trafik QR berulang | Banyak resolusi | 11 | Counter agregat boleh; PII dilarang | Agregasi non-PII | FR-LNK-008 | PASS KONSEPTUAL |
| 041 | Backup tanpa media | Restore candidate | — | Jangan klaim restore sah | Mapping gagal/alert | NFR-REL-003 | PASS KONSEPTUAL |
| 042 | Restore beda waktu | DB/Storage mismatch | 10 | Jangan aktifkan mapping rusak | Bukti restore gagal | AC-REL-001 | PASS KONSEPTUAL |
| 043 | Backup free tier gagal | Backup tidak ada/gagal | — | Tidak klaim siap | Provider/cadence terbuka | DB-Q-009 | GAP |
| 044 | Kuota mendekati batas | Metrik provider | — | Warning boleh; upgrade otomatis dilarang | Source/cadence terbuka | NFR-CST-001/002 | OPEN |
| 045 | Operasional melewati scope | Proses akses berlebih | 12 | Tidak ada data di luar wewenang | Tolak/audit | SEC-REQ-001/002 | PASS KONSEPTUAL |

### Addendum 14 Dimensi Eksplisit per Skenario

Tabel berikut melengkapi tabel ringkas di atas. Setiap sel dipisahkan agar keempat belas dimensi analisis tidak tersirat. `Tetap` berarti data pada kolom tersebut tidak boleh berubah oleh skenario.

| ID | Tujuan | Aktor/komponen | Kondisi awal | Urutan kejadian | Gagal/konflik | INV | Respons wajib | Boleh berubah | Tetap | Hasil harapan | Audit/bukti | Risiko residual | Referensi; status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 001 | Terbitkan versi sah | Admin, server, PG, Storage | Draf/media sah | Validasi→snapshot/rahasia→proyeksi→pointer | Prasyarat gagal | 2,3,4 | Jangan aktifkan sebelum semua lulus | Versi,pointer,audit | Versi lama | Satu versi aktif | Audit publish | Race fisik | FR-PUB-003/004; PASS KONSEPTUAL |
| 002 | Tolak draf invalid | Admin, server | Draf invalid | Validasi draf | Error validasi | 4 | Blokir publish | Pesan validasi | Pointer/snapshot aktif | Pointer lama | Bukti validasi | UI/error detail | FR-PUB-002; PASS KONSEPTUAL |
| 003 | Tolak proyeksi invalid | Server | Snapshot siap | Bentuk→validasi proyeksi | Proyeksi gagal | 4,12 | Jangan aktivasi/layani | Error internal aman | Pointer/payload publik | Versi lama | Audit bila kritis | Aturan fisik proyeksi | LDB-Q-003; PASS KONSEPTUAL |
| 004 | Lindungi media publish | Admin, server, Storage | Media direferensi | Publish dan delete bersamaan | Race delete | 5,10 | Tolak/tunda operasi berbahaya | Status operasi | Referensi/media sah | Tidak ada putus referensi | Audit operasi | Koordinasi fisik | AUD-06C4-002; PASS KONSEPTUAL |
| 005 | Dua publish aman | Dua admin/server | Revisi sama | Dua request publish | Race pointer | 3,4,7 | Serialisasi/penolakan stale | Satu outcome sah | Pointer tidak korup | Satu aktif | Dua jejak request | Locking belum dipilih | INV-003/004/007; GAP |
| 006 | Rollback valid | Admin, server | Versi/media valid | Verifikasi→pointer/audit | Tidak ada | 2,3,5 | Aktifkan target atomik | Pointer,audit | Snapshot historis | Target aktif | Audit rollback | Storage check fisik | FR-PUB-008; PASS KONSEPTUAL |
| 007 | Tolak rollback rusak | Admin, server | Media target hilang | Cek media→rollback | Media tidak ada | 5 | Batalkan rollback | Pesan aman | Pointer lama | Tetap versi lama | Bukti cek media | Rekon media | AC-PUB-005; PASS KONSEPTUAL |
| 008 | Lindungi media rollback | Admin, server, Storage | Target ada | Rollback/delete paralel | Race delete | 5,10 | Tolak/tunda delete/rollback | Status operasi | Target/pointer | Tanpa versi rusak | Audit | Locking belum dipilih | AUD-06C4-002; GAP |
| 009 | Gagal pra-hapus Storage | Server, Storage | Referensi sah | Cek→hapus objek belum terjadi | Error sebelum hapus | 10 | Pertahankan referensi | Error operasi | Metadata/referensi | Konsisten | Audit gagal | Rekon jika ambigu | LDM-10; PASS KONSEPTUAL |
| 010 | Gagal pasca-hapus Storage | Server, Storage | Metadata ada | Objek terhapus→error | Mismatch | 10 | Tandai,audit,rekonsiliasi | Status mismatch | Klaim konsisten | Tidak aktifkan data rusak | Bukti rekonsiliasi | Jadwal terbuka | LDM-09/10; PASS KONSEPTUAL |
| 011 | Temukan orphan | Operasional, Storage | Objek tanpa referensi | Deteksi→bukti→tindak lanjut | Orphan | 10 | Jangan hapus spekulatif | Catatan investigasi | Objek belum terbukti orphan | Rekon aman | Bukti objek/mapping | Jadwal/metode | LDM-Q-002; OPEN |
| 012 | Lindungi snapshot dirujuk | Admin, PG | Attempt referensikan snapshot | Request delete | FK/dependensi | 6,13 | Tolak delete | Pesan aman | Snapshot,attempt,hasil | Histori utuh | Audit bila kritis | Retensi numerik | AC-PUB-006; PASS KONSEPTUAL |
| 013 | Grace unpublish | Admin, server | Attempt aktif | Unpublish→tolak sesi baru | Tidak ada | 6,9 | Sesi lama sampai deadline | Lifecycle akses | Histori/aturan asal | Sesi baru ditolak | Audit unpublish | Cache fisik | AC-PUB-003; PASS KONSEPTUAL |
| 014 | Immediate block | Admin, gateway | Attempt aktif | Block→tolak mutasi | Request setelah block | 6 | Tolak jawaban baru | Lifecycle/status | Histori | Block efektif | Audit | Cache/gateway | FR-PUB-006; PASS KONSEPTUAL |
| 015 | Revoke Reader | Admin,gateway,cache | Reader membuka buku | Revoke→blokir akses baru | Cache/salinan lokal | 6,12 | Jalur terkendali menolak | Lifecycle/audit | Histori/salinan terunduh | Akses baru berhenti | Audit revoke | Salinan lokal | AC-PUB-004; PASS KONSEPTUAL |
| 016 | Cache stale | Cache/CDN | Proyeksi lama cached | Revoke→request cache | Cache bypass | 12 | Lifecycle-aware/invalidasi | Cache status | Konten ter-revoke | Tidak tersaji | Bukti invalidasi | Desain cache | AUD-06C4-001; GAP |
| 017 | Storage URL revoke | Browser,Storage | URL objek ada | Request langsung pascarevoke | Bypass lifecycle | 12 | Tolak/cek status | Respons aman | Konten terblokir | Tidak dilayani | Log akses bila tersedia | Policy URL | SEC-RISK-011; GAP |
| 018 | Tolak snapshot lengkap | Reader, API | Snapshot privat | Request API | Permintaan privat | 12 | Deny/proyeksi saja | Error aman | Snapshot/rahasia | Tidak bocor | Security event | Policy fisik | NFR-SEC-001/004; PASS KONSEPTUAL |
| 019 | Tolak draf Reader | Reader,PostgREST | Draf privat | Query draf | Bypass RLS | 12 | 401/403/kosong | Error aman | Draf | Tidak bocor | Bukti RLS | Policy fisik | AC-SEC-001; PASS KONSEPTUAL |
| 020 | Alias tidak aktif | Reader,resolver | Alias buku inactive | Resolve alias | Lifecycle fail | 12 | State aman/no silent redirect | State UI | Konten privat | Tidak tersedia | Log resolver | Cache route | FR-LNK-002/003; PASS KONSEPTUAL |
| 021 | Validasi token sah | Siswa,server | Token/verifier cocok | Request sesi | Tidak ada | 12 | Scope sesi saja | Sesi sah | Sesi lain | Akses sendiri | Bukti verifier | Token theft | FR-ACT-002; PASS KONSEPTUAL |
| 022 | Tolak token palsu | Siswa,server | Token tidak cocok | Request sesi | Verifier gagal | 12 | Deny aman | Error aman | Semua data sesi | Tidak ada akses | Security log ter-redaksi | Brute force | FR-ACT-002; PASS KONSEPTUAL |
| 023 | Tolak token A ke B | Siswa,server | Token A/attempt B | Request jawaban/hasil | IDOR | 12 | Ownership deny | Error aman | Attempt/hasil B | Tidak bocor | Security audit | Policy fisik | REL-010; PASS KONSEPTUAL |
| 024 | Simpan pra-deadline | Siswa,server | Token sah,UTC belum lewat | Submit→validasi→simpan | Network retry | 8,9 | Simpan idempoten | Jawaban sah | Jawaban lain/hasil prematur | Status A | Bukti request/key | Retensi key | FR-ACT-005/006; PASS KONSEPTUAL |
| 025 | Tolak pasca-deadline | Siswa,server | UTC lewat | Submit→cek UTC | Submit terlambat | 9 | Tolak mutasi/finalize | Status final | Jawaban baru | Hanya jawaban sah dinilai | Waktu server/audit | Clock implementation | AC-ACT-002; PASS KONSEPTUAL |
| 026 | Submit key sama | Siswa,server | Key sama | Dua submit | Replay | 8 | Outcome terdahulu | Respons identik | Duplikasi jawaban/hasil | Satu outcome | Key/outcome redacted | Retensi key | AC-ACT-005; PASS KONSEPTUAL |
| 027 | Submit key beda | Siswa,server | Dua request valid | Submit paralel | Race urutan | 8,9 | Hanya jawaban sah digunakan | Jawaban sah | Korupsi/duplikasi hasil | Deterministik perlu fisik | Bukti urutan | Concurrency | DB-REQ-018; GAP |
| 028 | Dua finalisasi | Siswa/server | Attempt belum final | Dua finalisasi | Double final | 8 | Satu hasil maksimum | Status final/hasil tunggal | Hasil kedua | Outcome sama | Audit finalisasi | Constraint fisik | REL-012; PASS KONSEPTUAL |
| 029 | Auto-finalize vs submit | Siswa,server | Attempt aktif | Lihat interleaving berikut | Race deadline | 8,9,13 | UTC+receipt+status+key | Jawaban sah/hasil tunggal | Jawaban terlambat/hasil ganda | Satu outcome | Waktu/key/status | Atomic check/update | FR-ACT-005/006; GAP |
| 030 | Publish saat attempt | Admin,server | Attempt lama aktif | Publish versi baru | Version drift | 13 | Pin attempt asal | Versi baru publik | Attempt/hasil lama | Lama tetap | Audit publish | Snapshot schema | FR-PUB-005; PASS KONSEPTUAL |
| 031 | Rollback hasil historis | Admin,server | Hasil tersimpan | Rollback pointer | Histori berubah | 13 | Ubah pointer saja | Pointer/audit | Jawaban/hasil lama | Histori utuh | Audit rollback | Presentation history | INV-013; PASS KONSEPTUAL |
| 032 | Retry dua kali | Siswa,server | Grant sah | Consume dua kali | Reuse grant | 6 | Konsumsi pertama saja | Attempt baru pertama | Attempt/historis lama | Kedua ditolak | Audit grant | Atomic consume | AC-ACT-003; PASS KONSEPTUAL |
| 033 | Retry pascarevoke | Siswa,server | Grant ada, buku revoked | Consume grant | Lifecycle deny | 6 | Tolak create attempt | Error aman | Attempt lama | Tidak ada attempt baru | Audit deny | Gateway consistency | FR-ACT-008; PASS KONSEPTUAL |
| 034 | Antrean lokal hilang | Browser,siswa | Status B lokal | Browser hilang data | Offline loss | 9 | Hanya server record sah | State UI | Klaim jawaban hilang tersimpan | Nilai dari server saja | Status/recovery | Persistensi lokal | DB-Q-008; OPEN |
| 035 | Hasil lintas-sesi | Siswa,server | Sesi A minta hasil B | Request hasil | IDOR | 12 | Ownership/disclosure deny | Error aman | Hasil B | Tidak bocor | Security audit | Policy fisik | DB-REQ-019; PASS KONSEPTUAL |
| 036 | QR statis aktif | Reader,resolver | Buku aktif | Scan URL | Tidak ada | 12 | Sajikan publik sah | Respons publik | Privasi | Reader mendapat buku | Access event minimal | Cache | FR-LNK-004; PASS KONSEPTUAL |
| 037 | QR statis unpublish | Reader,resolver | Buku inactive | Scan URL | Lifecycle fail | 6,12 | State aman | Error/state | Konten buku | Tidak tersedia | Lifecycle evidence | Cached copy | FR-PUB-006; PASS KONSEPTUAL |
| 038 | QR target mati | Reader,server | Short code target inactive | Resolve QR | Lifecycle fail | 11 | Tolak redirect | Error agregat boleh | Target konten | Tidak redirect | Audit/aggregate non-PII | Resolver physical | FR-LNK-005; PASS KONSEPTUAL |
| 039 | QR siklus | Admin,server | Target siklik | Save QR | Cycle validation | 11 | Tolak simpan | Error konfig | Target lama | Tidak ada loop | Audit perubahan | Algorithm physical | AC-LNK-004; PASS KONSEPTUAL |
| 040 | Trafik QR tinggi | Reader,server | QR sah | Banyak resolve | Counter race | 11 | Agregat non-PII | Counter harian | PII/raw identity | Counter sah | Agregat/audit | Atomic increment | FR-LNK-008; PASS KONSEPTUAL |
| 041 | Backup tanpa media | Operasional | DB backup ada | Restore candidate | Media tidak lengkap | — | Jangan klaim sukses | Status gagal | Aktivasi mapping rusak | Restore tidak siap | Bukti gap media | Provider | NFR-REL-003; PASS KONSEPTUAL |
| 042 | Restore beda waktu | Operasional | DB/Storage beda waktu | Verify mapping | Mismatch | 10 | Gagal/tandai | Bukti mismatch | Klaim sehat | Restore tidak siap | Restore test | Cutover | AC-REL-001; PASS KONSEPTUAL |
| 043 | Backup free tier gagal | Operasional/provider | Capability tidak pasti | Backup attempt | Tidak tersedia/gagal | — | Alert, jangan klaim siap | Status/bukti | Klaim backup | Perbaiki keputusan/provider | Audit operasional | Provider/cadence | DB-Q-009; GAP |
| 044 | Kuota tinggi | Provider,admin | Metrik tersedia | Monitor→warning | Source/cadence tidak final | — | Warning/no auto-upgrade | Status warning | Paid upgrade otomatis | Peringatan aman | Metrik source | Source/cadence | NFR-CST-001/002; OPEN |
| 045 | Operasional di luar scope | Proses,server | Credential operasional | Request berlebih | Authorization fail | 12 | Deny/audit | Error aman | Data luar scope | Tidak ada akses | Security audit | Role model fisik | SEC-REQ-001/002; PASS KONSEPTUAL |

#### SCN-06D3-029 — Empat Interleaving Wajib

| Interleaving | Waktu request | Penerimaan jawaban sah | Finalisasi | Kontrak hasil yang didukung |
|---|---|---|---|---|
| 1. Submit selesai sebelum auto-finalize | Request sebelum deadline | Server telah menerima dan menyimpan jawaban sah sebelum deadline | Auto-finalize berjalan kemudian | Jawaban sah terakhir dipakai; satu hasil final; submit ulang idempoten. |
| 2. Auto-finalize selesai sebelum submit terlambat | Submit datang setelah deadline atau setelah status final | Tidak ada penerimaan jawaban sah baru sebelum deadline | Hasil sudah final | Submit ditolak; hasil terdahulu tidak berubah. |
| 3. Submit dan finalisasi bersama sebelum deadline | Keduanya mulai sebelum deadline | Harus dibedakan dari sekadar kedatangan request | Salah satu dapat menyelesaikan lebih dahulu | Baseline mewajibkan satu hasil dan idempotensi, tetapi tidak menetapkan primitive serialisasi fisik. |
| 4. Request masuk sebelum deadline, tetapi penerimaan sah belum pasti | Request diterima jaringan sebelum deadline | Server belum menentukan apakah validasi/token/penyimpanan selesai sebelum deadline | Auto-finalize berjalan | Hanya jawaban yang **diterima sah oleh server sebelum deadline** boleh menjadi dasar hasil; detail batas atomik receipt/validation adalah GAP implementasi. |

Karena baseline menentukan deadline UTC, jawaban sah, finalisasi deterministik, dan satu hasil, namun tidak menentukan locking atau isolation fisik untuk interleaving 3–4, status keseluruhan SCN-06D3-029 adalah **GAP**, bukan PASS KONSEPTUAL.

## DSL-10 — Matriks Konkurensi

| Pasangan | Risiko | Hasil deterministik | Batas transaksi/eksternal | Mekanisme fisik terbuka |
|---|---|---|---|---|
| Publish vs publish | Pointer korup | Satu aktivasi sah | PostgreSQL atomik | Serialisasi/locking |
| Publish vs rollback | Aktif ambigu | Operasi sah teraudit | PostgreSQL atomik | Precedence/serialisasi |
| Publish vs delete media | Referensi putus | Delete/publish ditolak atau ditunda | Storage eksternal | Koordinasi race |
| Rollback vs delete media | Media target hilang | Rollback hanya bila media valid | Storage eksternal | Koordinasi race |
| Unpublish vs publish | Lifecycle bertentangan | Lifecycle sah terakhir teraudit | DB/gateway | Precedence |
| Revoke vs publish | Konten hidup lagi | Revoke berlaku pada jalur akses | Cache/gateway | Invalidasi cache |
| Submit vs finalize | Hasil ganda | Satu hasil dari jawaban sah | PostgreSQL | Constraint/serialisasi |
| Auto-finalize vs submit | Deadline race | UTC + idempotensi menentukan outcome | PostgreSQL | Atomic check/update |
| Retry consume vs consume | Grant ganda | Satu konsumsi sah | PostgreSQL | Atomic consume |
| Restore vs publish | Mapping rusak | Publish ditolak bila verifikasi gagal | DB/Storage | Cutover restore |

## DSL-11 — Audit dan Pemulihan

Audit kritis mencatat actor terotorisasi, tindakan, subjek, hasil validasi, waktu, dan ringkasan aman; audit tidak menyimpan token mentah, kunci jawaban, bobot rahasia, atau PII yang tidak diperlukan. Bukti minimum diperlukan bagi publish, rollback, unpublish, immediate block, revoke, finalisasi, retry grant, delete media, rekonsiliasi Storage, backup, restore, dan konfigurasi kritis.

Operasional backup/restore berbeda dari admin aplikasi. Restore harus membuktikan database, media fisik, dan mapping snapshot-media konsisten. Rekonsiliasi PostgreSQL–Storage diperlukan setelah kegagalan lintas layanan; jadwal/metode/bukti tetap LDM-Q-002.

## DSL-12 — Keputusan Terbuka

| ID | Dampak | Risiko / ketergantungan |
|---|---|---|
| LDB-Q-005 | Bentuk audit | Granularitas audit/akses belum final |
| LDB-Q-006 | Retensi idempotensi | Bukti replay/outcome belum final |
| LDB-Q-007 | Sumber kapasitas | Keakuratan dashboard kuota |
| LDB-Q-008 | Antrean offline | Batas data perangkat/sinkronisasi |
| DB-Q-007 | Instrumentasi publish | Bukti metrik publish |
| DB-Q-008 | Persistensi antrean lokal | Kehilangan data lokal |
| DB-Q-009 | Backup/provider | Restore/prosedur fisik |
| DB-Q-010 | Kuota/cadence | Validitas peringatan |
| IA-Q-001 | Path admin/editor | Navigasi UI, bukan izin data |
| IA-Q-002 | Breadcrumb | Presentasi UI |
| IA-Q-003 | Batas metrik publish | Observabilitas |
| IA-Q-004 | Lokasi antrean jawaban | UX/local state |
| LDM-Q-001 | Schema JSONB historis | Kompatibilitas Reader/rollback |
| LDM-Q-002 | Rekonsiliasi orphan Storage | Integritas media/bukti operasional |

IA-Q-005 tetap **DISETUJUI/DITUTUP**: satu area QR `P-ADM-013`, QR statis MVP, QR dinamis Fase 2, tanpa route baru.

## DSL-13 — Keterlacakan

### Matriks Kanonis 06D-3C

Matriks berikut adalah sumber keterlacakan kanonis DSL-13. Semua ID memakai prefiks lengkap; `TIDAK BERLAKU` berarti hubungan tidak diperlukan oleh skenario. Matriks ringkas historis setelahnya dipertahankan hanya sebagai catatan konsolidasi dan tidak menjadi sumber kanonis.

| SCN | SEC-REQ | DLC | SEC-RISK | ENT | REL | INV | DB-REQ | FR/NFR/AC/AF | CF/IA/UX | CR | Verifikasi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SCN-06D3-001 | SEC-REQ-003, SEC-REQ-005, SEC-REQ-013 | DLC-003, DLC-004, DLC-006 | SEC-RISK-001, SEC-RISK-008 | ENT-009, ENT-010, ENT-018 | REL-006, REL-008, REL-016 | INV-002, INV-003, INV-004, INV-012 | DB-REQ-009, DB-REQ-010, DB-REQ-012, DB-REQ-017 | FR-PUB-003, FR-PUB-004, AF-02-015 | CF-008, W-ADM-001, UI-026 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-002 | SEC-REQ-013 | DLC-002, DLC-003 | SEC-RISK-008 | ENT-003, ENT-005, ENT-009 | REL-002, REL-006 | INV-004 | DB-REQ-005, DB-REQ-009, DB-REQ-010 | FR-PUB-002, AC-PUB-001, AF-02-014 | CF-008, W-ADM-001, UI-026 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-003 | SEC-REQ-003, SEC-REQ-013 | DLC-003, DLC-004 | SEC-RISK-001, SEC-RISK-008 | ENT-009 | REL-006 | INV-004, INV-012 | DB-REQ-009, DB-REQ-010, DB-REQ-012 | FR-PUB-003, AF-02-015 | CF-008, W-ADM-001, UI-026 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-004 | SEC-REQ-010, SEC-REQ-013 | DLC-003, DLC-005 | SEC-RISK-009 | ENT-008, ENT-009 | REL-005, REL-007 | INV-005, INV-010 | DB-REQ-007, DB-REQ-009, DB-REQ-025 | FR-MED-003, AF-03-026 | CF-005, CF-008, P-ADM-007, UI-021 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-005 | SEC-REQ-013 | DLC-003 | SEC-RISK-008 | ENT-003, ENT-009, ENT-018 | REL-006, REL-016 | INV-003, INV-004, INV-007 | DB-REQ-009, DB-REQ-010 | FR-PUB-004, NFR-REL-001, AF-02-015 | CF-008, W-ADM-001, UI-026 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-006 | SEC-REQ-013 | DLC-003 | SEC-RISK-007 | ENT-008, ENT-009, ENT-018 | REL-006, REL-007, REL-016 | INV-002, INV-003, INV-005 | DB-REQ-009, DB-REQ-010, DB-REQ-025 | FR-PUB-008, AC-PUB-005, AF-03-021 | CF-009, P-ADM-011, UI-018 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-007 | SEC-REQ-013 | DLC-003, DLC-005 | SEC-RISK-009 | ENT-008, ENT-009 | REL-007 | INV-005 | DB-REQ-007, DB-REQ-009, DB-REQ-025 | FR-PUB-008, AC-PUB-005, AF-03-021 | CF-009, P-ADM-011, UI-019 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-008 | SEC-REQ-010, SEC-REQ-013 | DLC-003, DLC-005 | SEC-RISK-009 | ENT-008, ENT-009 | REL-005, REL-007 | INV-005, INV-010 | DB-REQ-007, DB-REQ-009, DB-REQ-025 | FR-MED-003, FR-PUB-008, AF-03-021 | CF-005, CF-009, P-ADM-007 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-009 | SEC-REQ-010, SEC-REQ-011 | DLC-005 | SEC-RISK-010 | ENT-008, ENT-018 | REL-005, REL-016 | INV-010 | DB-REQ-007, DB-REQ-021, DB-REQ-025 | FR-MED-003, AF-03-026 | CF-005, P-ADM-007, UI-021 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-010 | SEC-REQ-011 | DLC-005 | SEC-RISK-010 | ENT-008, ENT-018 | REL-005, REL-016 | INV-010 | DB-REQ-007, DB-REQ-021, DB-REQ-025 | FR-MED-003, AF-03-026 | CF-005, P-ADM-007, UI-021 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-011 | SEC-REQ-011 | DLC-005 | SEC-RISK-010 | ENT-008, ENT-018 | REL-005, REL-016 | INV-010 | DB-REQ-007, DB-REQ-021, DB-REQ-025 | FR-MED-003 | CF-005, P-ADM-007, UI-021 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-012 | SEC-REQ-006, SEC-REQ-012 | DLC-003, DLC-008 | SEC-RISK-007 | ENT-009, ENT-012, ENT-018 | REL-006, REL-010, REL-016 | INV-006, INV-013 | DB-REQ-009, DB-REQ-018, DB-REQ-021 | FR-PUB-003, AC-PUB-006, AF-03-026 | CF-009, P-ADM-011, UI-020 | CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-013 | SEC-REQ-012 | DLC-001, DLC-007, DLC-008 | SEC-RISK-011 | ENT-003, ENT-009, ENT-012, ENT-018 | REL-006, REL-010, REL-016 | INV-006, INV-009 | DB-REQ-011, DB-REQ-018, DB-REQ-021 | FR-PUB-006, AC-PUB-003, AF-03-018 | CF-009, M-ADM-002, UI-018 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-014 | SEC-REQ-012 | DLC-008 | SEC-RISK-011 | ENT-012, ENT-018 | REL-010, REL-016 | INV-006 | DB-REQ-011, DB-REQ-018, DB-REQ-021 | FR-PUB-006, AF-03-019 | CF-009, M-ADM-002, UI-018 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-015 | SEC-REQ-012 | DLC-001, DLC-003, DLC-004 | SEC-RISK-011 | ENT-003, ENT-009, ENT-018 | REL-006, REL-016 | INV-006, INV-012 | DB-REQ-011, DB-REQ-012, DB-REQ-021, DB-REQ-022 | FR-PUB-007, AC-PUB-004, AF-03-020 | CF-009, S-APP-009, UI-019 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-016 | SEC-REQ-003, SEC-REQ-012 | DLC-004 | SEC-RISK-011 | ENT-009 | REL-006 | INV-012 | DB-REQ-012, DB-REQ-022 | FR-PUB-007, AF-03-020 | CF-009, S-APP-009, UI-019 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-017 | SEC-REQ-003, SEC-REQ-012 | DLC-004, DLC-005 | SEC-RISK-011 | ENT-008, ENT-009 | REL-005, REL-007 | INV-010, INV-012 | DB-REQ-007, DB-REQ-012, DB-REQ-022, DB-REQ-025 | FR-PUB-007 | CF-005, CF-009, S-APP-009 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-018 | SEC-REQ-003, SEC-REQ-009 | DLC-003, DLC-004 | SEC-RISK-001 | ENT-009, ENT-010 | REL-006, REL-008 | INV-012 | DB-REQ-009, DB-REQ-012, DB-REQ-017, DB-REQ-022 | NFR-SEC-001, NFR-SEC-004 | CF-013, S-APP-006, UI-019 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-019 | SEC-REQ-003, SEC-REQ-009 | DLC-002 | SEC-RISK-001 | ENT-005, ENT-006 | REL-002, REL-003 | INV-012 | DB-REQ-005, DB-REQ-006, DB-REQ-022 | NFR-SEC-001, AC-SEC-001, AF-03-024 | CF-013, S-APP-006, UI-019 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-020 | SEC-REQ-003, SEC-REQ-012 | DLC-001, DLC-004 | SEC-RISK-011 | ENT-003, ENT-004, ENT-009 | REL-001, REL-006 | INV-012 | DB-REQ-003, DB-REQ-004, DB-REQ-011, DB-REQ-012 | FR-LNK-002, FR-LNK-003, AF-03-010 | CF-011, P-PUB-004, S-APP-007 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-021 | SEC-REQ-004 | DLC-007 | SEC-RISK-003 | ENT-011 | REL-009, REL-010 | INV-012 | DB-REQ-016 | FR-ACT-002, AF-03-011 | CF-006, P-PUB-006, UI-013 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-022 | SEC-REQ-004, SEC-REQ-009 | DLC-007 | SEC-RISK-003 | ENT-011 | REL-009, REL-010 | INV-012 | DB-REQ-016, DB-REQ-022 | FR-ACT-002, AC-ACT-006 | CF-006, S-APP-006, UI-019 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-023 | SEC-REQ-004, SEC-REQ-014 | DLC-007, DLC-008 | SEC-RISK-004 | ENT-011, ENT-012 | REL-009, REL-010 | INV-012 | DB-REQ-016, DB-REQ-018, DB-REQ-022 | FR-ACT-002, AC-ACT-006 | CF-006, S-APP-006 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-024 | SEC-REQ-007, SEC-REQ-008 | DLC-008 | SEC-RISK-006 | ENT-012, ENT-013 | REL-010, REL-011 | INV-008, INV-009 | DB-REQ-018 | FR-ACT-005, FR-ACT-006, AF-03-012 | CF-006, P-PUB-007, UI-031 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-025 | SEC-REQ-007 | DLC-008, DLC-009 | SEC-RISK-006 | ENT-012, ENT-014 | REL-011, REL-012 | INV-009 | DB-REQ-018, DB-REQ-019 | FR-ACT-005, AC-ACT-002, AF-03-013 | CF-006, S-APP-012, UI-030 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-026 | SEC-REQ-008 | DLC-008, DLC-013 | SEC-RISK-006 | ENT-012, ENT-013, ENT-014 | REL-011, REL-012 | INV-008 | DB-REQ-018, DB-REQ-019 | FR-ACT-006, AC-ACT-005, AF-03-012 | CF-006, M-PUB-001, UI-031 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-027 | SEC-REQ-007, SEC-REQ-008 | DLC-008, DLC-013 | SEC-RISK-006 | ENT-012, ENT-013 | REL-010, REL-011 | INV-008, INV-009 | DB-REQ-018 | FR-ACT-005, FR-ACT-006 | CF-006, P-PUB-007, UI-031 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-028 | SEC-REQ-007, SEC-REQ-008 | DLC-008, DLC-009, DLC-013 | SEC-RISK-006 | ENT-012, ENT-014 | REL-012 | INV-008 | DB-REQ-018, DB-REQ-019 | FR-ACT-005, FR-ACT-006, AF-03-014 | CF-006, M-PUB-001, UI-032 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-029 | SEC-REQ-006, SEC-REQ-007, SEC-REQ-008 | DLC-008, DLC-009, DLC-013 | SEC-RISK-006, SEC-RISK-007 | ENT-012, ENT-013, ENT-014 | REL-011, REL-012 | INV-008, INV-009, INV-013 | DB-REQ-018, DB-REQ-019 | FR-ACT-005, FR-ACT-006, AF-03-013, AF-03-014 | CF-006, P-PUB-007, S-APP-012, UI-030, UI-031 | CR-DB-001, CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-030 | SEC-REQ-006 | DLC-003, DLC-006, DLC-008 | SEC-RISK-007 | ENT-009, ENT-010, ENT-012 | REL-008, REL-010 | INV-013 | DB-REQ-009, DB-REQ-017, DB-REQ-018 | FR-PUB-005, AF-03-015 | CF-009, P-PUB-007 | CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-031 | SEC-REQ-006, SEC-REQ-013 | DLC-003, DLC-009 | SEC-RISK-007 | ENT-009, ENT-014 | REL-006, REL-012 | INV-013 | DB-REQ-009, DB-REQ-019 | FR-PUB-008, AF-03-021 | CF-009, P-ADM-011 | CR-DB-002, CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-032 | SEC-REQ-014 | DLC-010 | SEC-RISK-006 | ENT-015 | REL-013 | INV-006 | DB-REQ-020 | FR-ACT-008, AC-ACT-003, AF-03-017 | CF-012, M-ADM-003, UI-018 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-033 | SEC-REQ-012, SEC-REQ-014 | DLC-008, DLC-010 | SEC-RISK-011 | ENT-012, ENT-015 | REL-013 | INV-006 | DB-REQ-011, DB-REQ-020 | FR-ACT-008, FR-PUB-007 | CF-009, CF-012, M-ADM-003 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-034 | SEC-REQ-007, SEC-REQ-008 | DLC-008, DLC-013 | SEC-RISK-006 | ENT-012, ENT-013 | REL-010, REL-011 | INV-009 | DB-REQ-018, DB-REQ-026 | FR-ACT-005, FR-ACT-006 | CF-006, P-PUB-007, UI-031 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-035 | SEC-REQ-009, SEC-REQ-014 | DLC-009 | SEC-RISK-004, SEC-RISK-012 | ENT-014 | REL-012 | INV-012 | DB-REQ-019, DB-REQ-022 | FR-ACT-007, NFR-SEC-004, AF-03-016 | CF-012, P-PUB-008, UI-032 | CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-036 | SEC-REQ-003 | DLC-004, DLC-011 | SEC-RISK-013 | ENT-003, ENT-009 | REL-006 | INV-012 | DB-REQ-012, DB-REQ-013 | FR-LNK-004, AF-02-020 | CF-011, P-ADM-013, UI-027 | CR-DB-003 | TERVERIFIKASI |
| SCN-06D3-037 | SEC-REQ-012 | DLC-001, DLC-004, DLC-011 | SEC-RISK-011 | ENT-003, ENT-009 | REL-006 | INV-006, INV-012 | DB-REQ-011, DB-REQ-012, DB-REQ-013 | FR-PUB-006, FR-LNK-004 | CF-009, CF-011, S-APP-008 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-038 | SEC-REQ-012 | DLC-011 | SEC-RISK-013 | ENT-016 | REL-014 | INV-011 | DB-REQ-014 | FR-LNK-005, AF-03-022 | CF-011, P-ADM-013, UI-027 | CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-039 | SEC-REQ-012 | DLC-011 | SEC-RISK-013 | ENT-016 | REL-014 | INV-011 | DB-REQ-014 | FR-LNK-005, AC-LNK-004, AF-03-022 | CF-011, P-ADM-013, UI-027 | CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-040 | SEC-REQ-014 | DLC-011 | SEC-RISK-013 | ENT-017 | REL-014 | INV-011 | DB-REQ-015 | FR-LNK-008, AF-03-023 | CF-011, P-ADM-013, UI-027 | CR-DB-002 | TERVERIFIKASI |
| SCN-06D3-041 | SEC-REQ-015 | DLC-014 | SEC-RISK-014 | ENT-020 | REL-017 | TIDAK BERLAKU | DB-REQ-024 | NFR-REL-003, AC-REL-001, AF-03-027 | CF-014, P-ADM-017, UI-020 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-042 | SEC-REQ-015 | DLC-014 | SEC-RISK-014 | ENT-020 | REL-017 | INV-010 | DB-REQ-024, DB-REQ-025 | NFR-REL-003, AC-REL-001 | CF-014, P-ADM-017, UI-020 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-043 | SEC-REQ-015 | DLC-014 | SEC-RISK-014 | ENT-020 | REL-017 | TIDAK BERLAKU | DB-REQ-024 | NFR-REL-003, AF-02-026 | CF-014, P-ADM-017, UI-019 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-044 | SEC-REQ-016 | DLC-014 | SEC-RISK-015 | ENT-019 | REL-018 | TIDAK BERLAKU | DB-REQ-023 | NFR-CST-001, NFR-CST-002, AF-03-028 | CF-014, P-ADM-017, UI-020 | CR-DB-001 | TERVERIFIKASI |
| SCN-06D3-045 | SEC-REQ-001, SEC-REQ-002, SEC-REQ-009 | DLC-012, DLC-014 | SEC-RISK-015 | ENT-018, ENT-019, ENT-020 | REL-016, REL-017, REL-018 | INV-012 | DB-REQ-001, DB-REQ-021, DB-REQ-022, DB-REQ-023, DB-REQ-024 | FR-ADM-002, FR-ADM-004, NFR-SEC-001 | CF-013, CF-014, P-ADM-017 | CR-DB-001, CR-DB-003 | TERVERIFIKASI |

Setiap skenario SCN-06D3-001 sampai SCN-06D3-045 dipetakan individual pada DSL-09 melalui kolom `Inv`, `Referensi`, dan `Status`. Pemetaan domain tambahan berikut menjaga hubungan individual dengan inventaris:

**Aturan pembacaan matriks:** setiap baris memakai ID lengkap pada sumber kanonis. Kolom gabungan historis `ENT/REL/DB-REQ` di bawah dipisahkan secara semantik dengan label eksplisit `ENT-`, `REL-`, dan `DB-REQ-`; `INV` tercantum pada DSL-09. Bila kategori tidak relevan, nilainya adalah **TIDAK BERLAKU**; bila belum dapat dibuktikan oleh baseline, nilainya adalah **BELUM TERVERIFIKASI**. Tidak ada referensi yang diisi untuk sekadar membuat sel terisi.

| Skenario | SEC-REQ | DLC | SEC-RISK | ENT/REL/DB-REQ | CR | Verifikasi |
|---|---|---|---|---|---|---|
| 001 | 003,005,013 | 003,004,006 | 001,008 | ENT-009/010; REL-006—008; 009/010/012/017 | 003 | TERVERIFIKASI |
| 002 | 013 | 002,003 | 008 | ENT-009; 009/010 | 003 | TERVERIFIKASI |
| 003 | 003,013 | 003,004 | 001,008 | ENT-009; 012 | 003 | TERVERIFIKASI |
| 004 | 010,013 | 003,005 | 009 | ENT-008/009; REL-007; 025 | 003 | TERVERIFIKASI |
| 005 | 013 | 003 | 008 | ENT-003/009; 010 | 003 | TERVERIFIKASI |
| 006 | 013 | 003 | 007 | ENT-009; REL-006/007; 009/010 | 003 | TERVERIFIKASI |
| 007 | 013 | 003,005 | 009 | ENT-008/009; 025 | 003 | TERVERIFIKASI |
| 008 | 010,013 | 003,005 | 009 | ENT-008/009; 025 | 003 | TERVERIFIKASI |
| 009 | 010,011 | 005 | 010 | ENT-008; 007/025 | 003 | TERVERIFIKASI |
| 010 | 011 | 005 | 010 | ENT-008; 007/025 | 003 | TERVERIFIKASI |
| 011 | 011 | 005 | 010 | ENT-008; 025 | 003 | TERVERIFIKASI |
| 012 | 006,012 | 003,008 | 007 | ENT-009/012; REL-010; 009/018 | 002 | TERVERIFIKASI |
| 013 | 012 | 007,008 | 011 | ENT-003/009/012; 011/018 | 001 | TERVERIFIKASI |
| 014 | 012 | 008 | 011 | ENT-012; 011 | 001 | TERVERIFIKASI |
| 015 | 012 | 003,004 | 011 | ENT-003/009; 011/012 | 003 | TERVERIFIKASI |
| 016 | 003,012 | 004 | 011 | ENT-009; 012/022 | 003 | TERVERIFIKASI |
| 017 | 003,012 | 004,005 | 011 | ENT-008/009; 012/025 | 003 | TERVERIFIKASI |
| 018 | 003,009 | 003,004 | 001 | ENT-009; 012/022 | 003 | TERVERIFIKASI |
| 019 | 003,009 | 002 | 001 | ENT-005/006; 005/006/022 | 001 | TERVERIFIKASI |
| 020 | 003,012 | 001,004 | 011 | ENT-003/004/009; 004/011/012 | 001 | TERVERIFIKASI |
| 021 | 004 | 007 | 003 | ENT-011; REL-009/010; 016 | 001 | TERVERIFIKASI |
| 022 | 004,009 | 007 | 003 | ENT-011; 016/022 | 001 | TERVERIFIKASI |
| 023 | 004,014 | 007,008 | 004 | ENT-011/012; REL-010; 016/018 | 001 | TERVERIFIKASI |
| 024 | 007,008 | 008 | 006 | ENT-012/013; 018 | 001 | TERVERIFIKASI |
| 025 | 007 | 008,009 | 006 | ENT-012/014; 018/019 | 001 | TERVERIFIKASI |
| 026 | 008 | 008,013 | 006 | ENT-012—014; 018 | 003 | TERVERIFIKASI |
| 027 | 007,008 | 008,013 | 006 | ENT-012/013; 018 | 003 | TERVERIFIKASI |
| 028 | 007,008 | 008,009,013 | 006 | ENT-012/014; REL-012; 018/019 | 001 | TERVERIFIKASI |
| 029 | 006,007,008 | 008,009,013 | 006,007 | ENT-012—014; REL-011/012; 018/019 | 001/002 | TERVERIFIKASI |
| 030 | 006 | 003,006,008 | 007 | ENT-009/010/012; 009/017/018 | 002 | TERVERIFIKASI |
| 031 | 006,013 | 003,009 | 007 | ENT-009/014; 009/019 | 002/003 | TERVERIFIKASI |
| 032 | 014 | 010 | 006 | ENT-015; REL-013; 020 | 001 | TERVERIFIKASI |
| 033 | 012,014 | 008,010 | 011 | ENT-015; 011/020 | 001 | TERVERIFIKASI |
| 034 | 007,008 | 008,013 | 006 | ENT-012/013; 026 | 001 | TERVERIFIKASI |
| 035 | 009,014 | 009 | 004,012 | ENT-014; REL-012; 019/022 | 002 | TERVERIFIKASI |
| 036 | 003 | 004,011 | 013 | ENT-003/009; 012/013 | 003 | TERVERIFIKASI |
| 037 | 012 | 001,004,011 | 011 | ENT-003/009; 011/012 | 001 | TERVERIFIKASI |
| 038 | 012 | 011 | 013 | ENT-016; REL-014; 014 | 002 | TERVERIFIKASI |
| 039 | 012 | 011 | 013 | ENT-016; 014 | 002 | TERVERIFIKASI |
| 040 | 014 | 011 | 013 | ENT-017; REL-014; 015 | 002 | TERVERIFIKASI |
| 041 | 015 | 014 | 014 | ENT-020; REL-017; 024 | 001 | TERVERIFIKASI |
| 042 | 015 | 014 | 014 | ENT-020; REL-017; 024/025 | 001 | TERVERIFIKASI |
| 043 | 015 | 014 | 014 | ENT-020; 024 | 001 | TERVERIFIKASI |
| 044 | 016 | 014 | 015 | ENT-019; REL-018; 023 | 001 | TERVERIFIKASI |
| 045 | 001,002,009 | 012,014 | 015 | ENT-018—020; 021/022 | 001/003 | TERVERIFIKASI |

FR/NFR/AC/AF/CF/IA/UX individual yang relevan tercantum pada referensi DSL-02, DSL-06, DSL-07, dan DSL-09. Tidak ada referensi yang belum dapat diverifikasi pada matriks ini.

## DSL-14 — Temuan Audit dan Risiko Residual

| Temuan | Status |
|---|---|
| AUD-06D1-004 — klasifikasi utama SEC-REQ | Selesai; SEC-REQ-011 tetap DERIVED, lainnya EXPLICIT. |
| AUD-06D1A-001—004 | Selesai melalui koreksi keterlacakan, keputusan, DLC, dan matriks lifecycle. |
| AUD-06D2-001 | Selesai; proyeksi tervalidasi sebelum aktivasi. |
| AUD-06D2-002 | Selesai; request dipisahkan dari execute server-only. |
| AUD-06D2-003 | Selesai; 122 ID individual dipetakan pada audit 06D-2A. |
| AUD-06D2A-001 | Selesai; proyeksi publik REQUEST-CONDITIONAL. |
| AUD-06D2A-002 | Selesai; finalisasi hanya sesi sah/proses server. |
| AUD-06D3-001 | Selesai secara konseptual; SCN-029 memperjelas UTC, jawaban sah, dan satu hasil. |
| AUD-06D3-002 | Selesai; DSL-13 memetakan 45 skenario individual. |
| AUD-06D3-003 | Selesai; DSL-09 menggunakan 14 dimensi analisis per skenario. |
| AUD-06D3A-001 | Selesai dalam dokumen: DSL-09 addendum menguraikan 14 dimensi eksplisit pada seluruh 45 skenario. |
| AUD-06D3A-002 | SELESAI: DSL-13 memiliki matriks kanonis 45 baris dengan kolom ENT, REL, INV, dan DB-REQ terpisah serta ID berprefiks lengkap. |
| AUD-06D3A-003 | Selesai secara analitis: SCN-06D3-029 memuat empat interleaving; status dinaikkan menjadi GAP karena isolation fisik belum diputuskan. |
| AUD-06D3A-004 | Selesai: DSL-03 menjelaskan bahwa T pada backup/restore proyeksi publik bukan pengecualian terhadap verifikasi representasi fisik. |

Risiko residual: mekanisme fisik serialisasi operasi, policy RLS/Storage, cache invalidation, retensi idempotensi, antrean offline, provider/cadence backup, sumber kuota, schema JSONB historis, dan rekonsiliasi orphan Storage belum diputuskan atau diuji.

## DSL-15 — Kriteria Persetujuan

Dokumen dapat diajukan untuk audit independen bila:

1. DSL-00 sampai DSL-15 lengkap dan seluruh ID konsisten dengan baseline.
2. Tidak ada perubahan keputusan tanpa CR dan persetujuan pemilik.
3. Semua GAP/OPEN ditinjau sebelum desain fisik atau implementasi keamanan.
4. Audit independen memverifikasi 45 skenario, 23 kandidat, 24 jalur, 10 pasangan konkurensi, dan 14 keputusan terbuka.
5. Pemilik proyek belum memberikan persetujuan atau penguncian terhadap dokumen ini.

**Status akhir dokumen ini tetap DRAF — BELUM DIAUDIT.**
