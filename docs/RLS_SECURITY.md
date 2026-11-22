# RLS, KEAMANAN, DAN THREAT MODEL — FLIPBOOK STUDIO

## RS-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — RLS Security |
| Versi | `v0.1.0-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Menetapkan matriks otorisasi konseptual, kewajiban RLS, jalur server tepercaya, batas Storage, dan threat model. |
| Bukan cakupan | Sintaks policy RLS, SQL, GRANT, endpoint aktual, secret, konfigurasi Supabase, atau implementasi. |

## RS-01 — Prinsip Keamanan Wajib

1. Data API dan Storage menerapkan prinsip **default deny**; akses hanya dibuka untuk kasus yang dibuktikan perlu.
2. Auth administrator tidak dengan sendirinya memberi akses lintas objek; scope dan lifecycle selalu diperiksa.
3. Reader menerima proyeksi publik tervalidasi, bukan snapshot lengkap.
4. Token sesi siswa mentah berada di browser; database hanya menerima hash/verifier yang relevan melalui jalur server.
5. Kunci jawaban, bobot, scoring, audit sensitif, dan konfigurasi privat tidak boleh mencapai browser.
6. Operasi privileged tetap `EXECUTE-SERVER-ONLY`, tetapi server tidak boleh melewati validasi konteks.
7. Penyembunyian elemen React, URL rahasia, atau query parameter bukan kontrol keamanan.

## RS-02 — Aktor dan Trust Boundary

| Aktor/batas | Kredensial/konteks | Batas |
|---|---|---|
| Reader anonim | Tidak ada login; URL publik sah | Hanya proyeksi publik dengan lifecycle mengizinkan. |
| Siswa bersesi | Token acak yang dibuktikan terhadap hash/verifier | Hanya sesi, attempt, jawaban, dan hasil miliknya sesuai disclosure. |
| Administrator | Supabase Auth + scope admin tervalidasi | Mengajukan operasi dalam scope, bukan bypass eksekusi server. |
| Server tepercaya | Jalur backend/RPC/Edge Function dengan konteks tervalidasi | Menjalankan operasi sensitif dan akses private schema. |
| Storage/cache/CDN | Batas eksternal | Tidak menjadi otoritas lifecycle; capability wajib diverifikasi. |
| Provider operasional | Backup/telemetry | Data/bukti tidak dianggap tersedia tanpa verifikasi capability. |

## RS-03 — Klasifikasi Data dan Schema Konseptual

| Kelas | Contoh | Akses yang diizinkan |
|---|---|---|
| `auth` terkelola | Identitas admin | Dikelola provider Auth; tidak menjadi profil aplikasi bebas. |
| `public` terproteksi RLS | Buku/draf/relasi, metadata terpilih | Sesuai policy default deny dan scope. |
| `private` server-only | Kunci/bobot/scoring, verifier sensitif | Hanya server tepercaya. |
| Public projection | Konten Reader tervalidasi | Reader kondisional setelah lifecycle check. |
| Storage privat | Media draf/objek sensitif | Jalur terotorisasi; bukan URL sebagai otorisasi. |
| Operasional/audit | Audit, backup evidence, kapasitas | Admin/operasional terbatas dan redaksi aman. |
| Client-local | Preferensi, posisi baca, antrean terbatas | Perangkat saat ini; bukan sumber kebenaran server. |

## RS-04 — Matriks Akses Kandidat Data

Legenda: `RA` = REQUEST-ALLOW; `RC` = REQUEST-CONDITIONAL; `RD` = REQUEST-DENY; `ESO` = EXECUTE-SERVER-ONLY.

| Kandidat | Reader | Siswa | Admin | Operasional | Execute | Pemeriksaan utama |
|---|---|---|---|---|---|---|
| Principal admin | RD | RD | RC | RC | ESO | Auth, scope, 401/403 aman. |
| Konfigurasi | RD | RD | RC | RD | ESO | Scope dan validasi nilai. |
| Buku/alias | RC | RC | RC | RC | ESO | Lifecycle dan resolusi target sah. |
| Node/komponen/tema draf | RD | RD | RC | RD | ESO | Scope buku, CAS, struktur. |
| Metadata media | RC | RC | RC | RC | ESO | Scope, referensi, lifecycle. |
| Snapshot versi | RD | RD | RC | RC | ESO | Validasi snapshot/proyeksi/media. |
| Proyeksi publik | RC | RC | RC | RC | ESO | Valid, lifecycle, revoke, cache/Storage controlled path. |
| Definisi aktivitas rahasia | RD | RD | RC | RD | ESO | Batas private/server-only. |
| Sesi/attempt | RD | RC | RC | RD | ESO | Token hash, ownership, versi asal. |
| Jawaban | RD | RC | RD | RD | ESO | Token, deadline UTC, idempotensi. |
| Hasil final | RD | RC | RC | RD | ESO | Ownership, disclosure, satu hasil. |
| Retry grant | RD | RC | RC | RD | ESO | Scope, expiry, single-use. |
| QR target/agregat | RC/RD | RC/RD | RC | RC | ESO | Target internal, lifecycle, non-PII. |
| Audit/kapasitas/recovery | RD | RD | RC | RC | ESO | Scope audit, redaksi, capability. |
| Hasil idempoten/dependensi media | RD | RD | RC | RC | ESO | Scope operasi, pending delete, race. |

## RS-05 — Kontrak 24 Jalur Akses

| # | Jalur | Request | Eksekusi/validasi wajib | Penolakan aman |
|---:|---|---|---|---|
| 01 | Login admin | RA sesuai Auth | Auth dan sesi admin | Tidak bocor detail akun. |
| 02 | Dashboard | RC admin | Scope/RLS | Data privat lain tidak bocor. |
| 03 | Baca draf | RC admin | Scope buku dan RLS | Anon/siswa ditolak. |
| 04 | Autosave CAS | RC admin | Expected revision, scope, struktur | Konflik tanpa overwrite. |
| 05 | Unggah media | RC admin | Scope, tipe, hash, Storage privat | Bypass langsung ditolak. |
| 06 | Publish | RC admin | Draf, CAS, aktivitas, proyeksi, media, lifecycle | Pointer tidak aktif bila gagal. |
| 07 | Rollback | RC admin | Versi/media target, audit | Pointer lama tetap bila gagal. |
| 08 | Unpublish | RC admin | Lifecycle/grace | Histori tidak dihapus. |
| 09 | Immediate block | RC admin | Lifecycle gateway | Akses baru ditolak. |
| 10 | Emergency revoke | RC admin | Backend/gateway/cache path | Tidak menjanjikan tarik salinan lokal. |
| 11 | Reader publik | RC Reader | Proyeksi valid, lifecycle, scope tujuan | Snapshot lengkap ditolak. |
| 12 | Resolusi alias | RC Reader | Alias/tujuan internal sah | State deep-link aman. |
| 13 | Buat sesi | RC siswa | Aktivitas aktif; hash token server | Sesi tak sah tidak dibuat. |
| 14 | Simpan jawaban | RC siswa | Ownership, UTC, idempotency, revision | Tolak tanpa mutasi lain. |
| 15 | Finalisasi | RC siswa atau server | Token/attempt/versi/deadline/status/key | Anon biasa ditolak. |
| 16 | Baca hasil | RC siswa/admin | Disclosure/ownership/scope | Hasil lintas sesi ditolak. |
| 17 | Terbit retry grant | RC admin | Attempt/lifecycle/audit | Tanpa overwrite histori. |
| 18 | Konsumsi retry | RC siswa | Grant sah sekali pakai/expiry | Replay ditolak. |
| 19 | QR dinamis | RC Reader/admin | Internal, anti-siklus, lifecycle | Redirect ilegal ditolak. |
| 20 | Agregat QR | RC admin | Non-PII dan scope | Raw event/PII ditolak. |
| 21 | Hapus media | RC admin | Dependensi/pending/race | Tandai/audit/rekonsiliasi bila gagal. |
| 22 | Rekonsiliasi Storage | RC operasional | Mapping/bukti; tanpa delete spekulatif | Operasi tak sah ditolak. |
| 23 | Backup/restore | RC operasional | Scope provider/DB/media/mapping | Tidak klaim sukses tanpa bukti. |
| 24 | Kuota/kapasitas | RC admin/operasional | Sumber/waktu/kepastian metrik | Tidak auto-upgrade/destruktif. |

## RS-06 — Kontrak RLS Konseptual

| Domain | Kebijakan konseptual |
|---|---|
| Draf admin | Reader/siswa ditolak. Admin hanya scope buku yang sah. Server memvalidasi CAS dan struktur. |
| Snapshot/proyeksi | Snapshot penuh tidak tersedia anonim; proyeksi dibaca kondisional setelah lifecycle/revoke. |
| Sesi/attempt/jawaban | Akses siswa berbasis token terverifikasi dan ownership. Tidak ada enumerasi attempt. |
| Hasil/disclosure | Hasil hanya sesuai policy disclosure dan ownership; scoring secret server-only. |
| Audit | Tidak Reader/siswa; admin/operasional menerima data yang direduksi sesuai scope. |
| QR/agregat | Resolusi QR dapat publik kondisional; agregat hanya admin dan non-PII. |
| Storage | Metadata/referensi dan object access tunduk scope/lifecycle; URL tidak menggantikan policy. |

## RS-07 — Storage, Cache, dan Revoke

1. Media privat dilayani melalui jalur tepercaya yang memeriksa scope/lifecycle; object Storage tidak otomatis public.
2. Proyeksi publik dan media tidak boleh melompati status publish, unpublish, immediate block, atau emergency revoke.
3. Cache/CDN/provider tidak boleh diasumsikan mengikuti lifecycle tanpa bukti.
4. Konten yang telah tersimpan pada perangkat pengguna tidak dapat ditarik kembali absolut; kontrak hanya mengatur akses baru.
5. `SCN-06D3-016` dan `SCN-06D3-017` tetap GAP sampai jalur API/cache/Storage diuji.

## RS-08 — Threat Model

| Ancaman | Dampak | Mitigasi kontraktual | Status |
|---|---|---|---|
| IDOR admin/siswa | Data lintas objek bocor | Scope/ownership/RLS dan respons aman. | Wajib desain fisik/test. |
| Draf terbaca publik | Kebocoran materi belum terbit | Default deny; proyeksi publik terpisah. | Wajib. |
| Kunci/bobot ke browser | Kecurangan/secret leak | Private schema dan scoring server-only. | Wajib. |
| Token sesi dicuri/replay | Akses attempt ilegal | Token acak, hash/verifier, scope, lifecycle. | Wajib; detail teknis audit. |
| Silent overwrite | Draf/answer hilang | CAS/revision dan konflik eksplisit. | Wajib. |
| Double submit/finalisasi | Hasil ganda | Idempotensi, satu hasil, server UTC. | `SCN-06D3-027`; `SCN-06D3-029`. |
| Revoke bypass cache/URL | Konten revoked tetap tersedia | Jalur controlled, lifecycle check. | `SCN-06D3-016`; `SCN-06D3-017`. |
| Delete media berreferensi | Snapshot/attempt rusak | Pending delete, dependensi, rekonsiliasi. | SCN-06D3-008 (GAP); SCN-06D3-011 (OPEN). |
| Redirect QR eksternal/siklus | Phishing/lifecycle bypass | Target internal aktif, anti-siklus. | Wajib Fase 2. |
| PII QR/analitik | Privasi anak terganggu | Agregat non-PII; tanpa event scan mentah. | Wajib Fase 2. |
| Audit memuat secret | Kebocoran operasional | Redaksi/minimisasi data. | Wajib. |
| Backup tidak lengkap | Restore palsu | Bukti DB+Storage+mapping. | SCN-06D3-043 (GAP). |
| Telemetry usang | Keputusan biaya salah | Label sumber/waktu/kepastian. | SCN-06D3-044 (OPEN). |
| Penyimpanan lokal bersama | Jawaban siswa lain terbaca | Scope sesi/attempt, minimisasi, recovery tervalidasi. | `SCN-06D3-034` OPEN. |
| Input/embedded content berbahaya | XSS/abuse | Sanitasi/allowlist/jalur server. | Wajib implementasi. |

## RS-09 — Logging, Respons Penolakan, dan Privasi

- Respons penolakan tidak boleh membedakan secara berlebihan antara objek tidak ada dan objek tidak berwenang bila itu membuka enumerasi.
- Audit memuat aktor/komponen, subjek, waktu server, outcome, correlation ID bila relevan, serta metadata tervalidasi; tidak memuat token mentah, kunci, bobot, atau PII berlebih.
- Status antrean lokal: tertunda, diperiksa, diterima, ditolak, atau perlu tindakan. Hanya status `diterima` setelah server mengonfirmasi.
- Metrik publish yang ditampilkan UI harus tersedia dan terverifikasi; tidak ada angka perkiraan sebagai fakta.

## RS-10 — Keterlacakan dan Status Residual

| Cakupan | Referensi |
|---|---|
| Keamanan | SEC-REQ-001—016; SEC-RISK-001—015; NFR-SEC-001/004. |
| Lifecycle | DLC-001—014; INV-001—013; REL-001—018. |
| Jalur akses | 24 jalur DSL-06 dan kontrak operasi kritis baseline. |
| GAP | `SCN-06D3-005`, `008`, `016`, `017`, `027`, `029`, `043`. |
| OPEN | `SCN-06D3-011`, `034`, `044`. |

## RS-11 — Status Akhir dan Tahap Berikutnya

Dokumen tetap **DRAF — BELUM DIAUDIT**. Tidak ada policy RLS sintaktis atau endpoint yang dibuat. Tahap berikutnya adalah `DATABASE_MIGRATION_PLAN.md`, yang hanya boleh menetapkan urutan dan dependensi migrasi konseptual—bukan migrasi executable.
