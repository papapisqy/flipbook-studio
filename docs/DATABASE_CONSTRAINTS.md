# KONTRAK INTEGRITAS DAN KONKURENSI DATABASE — FLIPBOOK STUDIO

## DC-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — Database Constraints |
| Versi | `v0.1.0-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Merumuskan kontrak integritas, validasi, lifecycle, CAS, idempotensi, dan konkurensi yang wajib dipenuhi rancangan fisik. |
| Bukan cakupan | SQL, constraint sintaktis, trigger, isolation level, locking primitive, job scheduler, migrasi, atau implementasi. |

## DC-01 — Prinsip Penerapan

1. Constraint fisik kelak hanya sah jika memenuhi kontrak baseline tanpa mengubah produk/fase.
2. Validasi browser tidak pernah cukup untuk operasi sensitif; jalur server tepercaya memvalidasi identitas, scope, lifecycle, dependensi, deadline, dan konkurensi.
3. Storage tidak dianggap atomik bersama PostgreSQL; kegagalan lintas batas wajib ditandai, diaudit, dan direkonsiliasi.
4. Keberadaan data lokal tidak membuktikan penerimaan server.
5. Kontrak konseptual tidak menetapkan bentuk `CHECK`, `FK`, unique index, trigger, atau policy RLS fisik.

## DC-02 — Register INV-001 sampai INV-013

| INV | Kontrak yang dilarang dilanggar | Kandidat/REL | Validasi konseptual | Bukti/verifikasi | Status |
|---|---|---|---|---|---|
| INV-001 | UUID buku/node/komponen stabil; reorder/slug tidak mengubah identitas; struktur tidak bersiklus. | 03,05,06; REL-001—003 | Server memeriksa ownership, parent, urutan, dan scope buku. | Uji pindah/reorder/duplikasi; duplikasi menghasilkan ID baru. | TERVERIFIKASI konseptual |
| INV-002 | Snapshot publikasi immutable. | 09; REL-006 | Isi versi tidak dimutasi setelah publish. | Uji edit draf tidak mengubah versi lama. | TERVERIFIKASI konseptual |
| INV-003 | Pointer versi aktif dan audit berubah atomik secara konseptual. | 03,09,19; REL-006/016 | Aktivasi hanya setelah semua prasyarat lulus. | Uji dua publish dan audit outcome. | GAP SCN-06D3-005 |
| INV-004 | Publish gagal tidak mengaktifkan versi gagal atau mengubah pointer lama. | 09,10,19 | Validasi/persiapan gagal menghentikan aktivasi. | Uji media/proyeksi gagal; pointer lama utuh. | TERVERIFIKASI konseptual; bukti fisik terkait GAP-005 |
| INV-005 | Media target publish/rollback tervalidasi dan tersedia. | 08,09,23; REL-005/007 | Dependensi diperiksa sebelum aktivasi/rollback. | Uji media hilang/rollback. | GAP SCN-06D3-008 |
| INV-006 | Lifecycle tidak menghapus histori snapshot, attempt, atau hasil; retry tidak menimpa histori. | 09,12—16 | Archive/unpublish/revoke/rollback menjaga histori. | Uji retry/rollback/unpublish. | TERVERIFIKASI konseptual |
| INV-007 | CAS menolak stale write tanpa silent overwrite. | 03,05,06 | Expected revision dan scope wajib cocok. | Uji dua autosave revision sama. | TERVERIFIKASI konseptual |
| INV-008 | Operasi idempoten; satu hasil final maksimal per attempt. | 13—15,22; REL-011/012 | Key/scope/outcome dan finalisasi divalidasi server. | Uji replay/double submit. | GAP SCN-06D3-027/029 |
| INV-009 | Deadline memakai waktu server UTC; hanya jawaban sah sebelum deadline menjadi dasar final. | 12—14; REL-010/011 | Server memeriksa token, ownership, deadline, status final. | Uji deadline, koneksi putus, resend. | GAP SCN-06D3-027/029; OPEN-034 |
| INV-010 | Media yang dirujuk snapshot/attempt tidak dihapus tidak aman. | 08,09,23; REL-005/007 | Pending delete dan revalidasi dependensi sebelum delete. | Uji delete versus rollback; rekonsiliasi. | GAP-008; OPEN-011; GAP-017 |
| INV-011 | QR dinamis hanya target internal aktif, tanpa siklus/target eksternal; agregat non-PII. | 17,18; REL-014 | Validasi target/lifecycle sebelum simpan/resolusi. | Uji siklus, target nonaktif, agregat. | TERVERIFIKASI konseptual Fase 2 |
| INV-012 | Default deny dan trust boundary: proyeksi publik hanya bila lifecycle mengizinkan. | 01,09—12,19 | Jalur aplikasi/RLS konseptual memeriksa scope/lifecycle. | Uji anon/admin/sesi, revoke/cache/Storage. | GAP SCN-06D3-016/017 |
| INV-013 | Attempt tetap pin ke aktivitas dan versi asal. | 09,11—15; REL-008/010—012 | Publish/rollback/draf tidak mengubah jawaban/hasil historis. | Uji publish v2 atas attempt v1. | TERVERIFIKASI konseptual; GAP-029 terkait konkurensi |

## DC-03 — Integritas Referensial dan Lifecycle

| Domain | Kontrak | Larangan |
|---|---|---|
| Buku/draf | Alias, node, dan komponen berada pada scope buku yang sah. | Cross-book reference tanpa validasi; siklus struktur. |
| Versi | Versi dimiliki satu buku; pointer aktif hanya menunjuk versi buku yang sama. | Aktivasi versi parsial atau pointer ke buku lain. |
| Snapshot/media | Dependensi eksplisit tersedia sebelum publish/rollback. | Delete media yang masih dirujuk atau aktivasi versi dengan media tak tervalidasi. |
| Aktivitas/attempt | Attempt merujuk aktivitas dan versi asal yang immutable. | Mengganti dasar scoring/history karena publish, rollback, atau edit draf. |
| Jawaban/hasil | Jawaban sah terkait attempt; satu hasil final per attempt. | Hasil ganda, hasil dari jawaban belum diterima sah, atau disclosure secret. |
| QR | Short code mengarah ke target internal aktif dan non-siklik. | Redirect eksternal bebas atau penyimpanan scan PII. |
| Audit | Event kritis punya subjek/outcome aman yang dapat ditelusuri. | Token mentah, kunci/bobot, atau PII berlebih dalam bukti audit. |

## DC-04 — Kontrak CAS Draf

| Tahap | Kewajiban |
|---|---|
| Permintaan | Admin berotorisasi mengirim scope draf dan expected revision yang relevan. |
| Validasi | Server memastikan ownership/scope, struktur/komponen sah, dan revision belum stale. |
| Berhasil | Mutasi draf serta revision baru dicatat konsisten; respons memuat keadaan yang sah. |
| Konflik | Tidak ada overwrite diam-diam; klien menerima konflik untuk resolusi. |
| Tidak boleh berubah | Snapshot publikasi, attempt, hasil, dan identitas stabil. |
| Bukti | Dua autosave dengan expected revision sama menghasilkan paling banyak satu mutasi sah. |

## DC-05 — Kontrak Publish, Rollback, Unpublish, dan Revoke

1. Admin hanya **meminta** operasi melalui jalur berotorisasi; server yang mengeksekusi setelah memeriksa konteks.
2. Publish: validasi draf/CAS → struktur/komponen/media/aktivitas → snapshot rahasia immutable → proyeksi publik tervalidasi → dependensi media → aktivasi pointer dan audit konseptual atomik.
3. Jika prasyarat gagal, versi tidak aktif dan pointer lama tidak berubah.
4. Rollback hanya ke versi historis tervalidasi; dependensi media diperiksa kembali.
5. Unpublish/revoke menolak akses baru yang dikendalikan lifecycle tanpa otomatis menghapus histori.
6. Emergency revoke berprioritas atas publish/rollback; restore tidak membuka akses revoked secara otomatis.
7. Storage dilakukan di luar asumsi transaksi terdistribusi; mismatch harus direkonsiliasi dan diaudit.

Status fisik serialisasi publish, koordinasi rollback–delete, cache revoke, dan URL Storage tetap GAP (`SCN-06D3-005`, `008`, `016`, `017`).

## DC-06 — Kontrak Jawaban, Idempotensi, dan Finalisasi

| Operasi | Validasi server wajib | Hasil yang diizinkan |
|---|---|---|
| Mulai/pulihkan sesi | Token valid melalui hash/verifier, scope aktivitas, lifecycle. | Memakai sesi/attempt sah; tidak membuat attempt baru karena gangguan koneksi. |
| Simpan jawaban | Ownership attempt, deadline UTC, revision jawaban, idempotency key. | Catatan jawaban sah atau konflik/penolakan aman. |
| Submit | Semua validasi simpan + status finalisasi. | Outcome idempoten; tidak memengaruhi attempt lain. |
| Auto-finalize | Proses server berwenang, deadline, status attempt, jawaban sah. | Satu hasil maksimal dari keadaan jawaban konsisten. |
| Retry grant Fase 2 | Grant sah, belum dikonsumsi, scope/expiry. | Membuat sesi baru dan attempt baru; hasil lama tidak berubah. |

Empat interleaving wajib untuk submit versus auto-finalize tetap harus dibuktikan: submit sah dahulu; finalisasi dahulu lalu submit terlambat; keduanya berjalan sebelum deadline; dan request tiba sebelum deadline tetapi belum diterima sah ketika finalisasi berjalan. Baseline tidak memilih locking/isolation fisik; `SCN-06D3-029` tetap GAP.

## DC-07 — Kontrak Media, Storage, dan Rekonsiliasi

- Objek draf privat; objek terbit hanya dilayani melalui jalur yang memeriksa scope/lifecycle.
- Penghapusan media melalui pending delete, revalidasi dependensi, audit, dan tindak lanjut terkontrol.
- Kegagalan sebelum object delete mempertahankan referensi sah; kegagalan setelah delete dapat meninggalkan mismatch metadata–Storage yang wajib ditandai dan direkonsiliasi.
- Rekonsiliasi periodik dan pasca-kegagalan disetujui secara kebijakan, tetapi jadwal, mekanisme, beban, dan bukti fisik belum final.
- Tidak ada penghapusan orphan spekulatif.

## DC-08 — Kontrak Akses dan Proyeksi

| Jalur | Ketentuan |
|---|---|
| Reader anonim | REQUEST-CONDITIONAL: proyeksi tervalidasi, lifecycle mengizinkan, tidak revoked, scope/tujuan sah. |
| Siswa bersesi | REQUEST-CONDITIONAL: token, ownership, aktivitas, deadline, dan attempt sah. |
| Admin | REQUEST-CONDITIONAL: otorisasi dan scope objek tervalidasi. |
| Server | EXECUTE-SERVER-ONLY, tetapi tetap memvalidasi konteks operasi. |
| Cache/Storage | Tidak boleh melewati lifecycle atau menjadikan URL langsung sebagai otorisasi. |

## DC-09 — Matriks Konkurensi dan Bukti

| Skenario | Kontrak hasil | Status |
|---|---|---|
| Dua publish buku sama | Paling banyak satu operasi efektif/pointer aktif sah; audit keduanya. | GAP SCN-06D3-005 |
| Rollback versus delete media | Tidak aktif ke versi dengan media tidak tersedia; tidak ada delete tak aman. | GAP SCN-06D3-008 |
| Revoke versus cache/Storage | Akses baru tunduk lifecycle; provider/cache perlu bukti. | GAP SCN-06D3-016/017 |
| Submit paralel key berbeda | Satu state jawaban/hasil sah, tanpa outcome ganda. | GAP SCN-06D3-027 |
| Auto-finalize versus submit | Satu hasil dari jawaban yang sah berdasarkan waktu server. | GAP SCN-06D3-029 |
| Orphan Storage | Tidak ada delete spekulatif; mapping dan tindak lanjut dibuktikan. | OPEN SCN-06D3-011 |
| Antrean lokal/retry | Server tetap sumber benar; status lokal bukan penerimaan server. | OPEN SCN-06D3-034 |
| Backup/restore dan kapasitas | Bukti DB+Storage+mapping dan capability/sumber metrik tervalidasi. | GAP `SCN-06D3-043`; OPEN `SCN-06D3-044` |

## DC-10 — Keterlacakan

| Cakupan | Referensi |
|---|---|
| Integritas | INV-001 sampai INV-013; REL-001 sampai REL-018. |
| Keamanan/lifecycle | SEC-REQ-001 sampai SEC-REQ-016; DLC-001 sampai DLC-014; SEC-RISK-001 sampai SEC-RISK-015. |
| Produk | FR-ACT-002/005/006/008, FR-PUB-003—008, FR-MED-003, FR-LNK-005/006/008, NFR-SEC-001/004, NFR-REL-001—003. |
| Keputusan | CR-DB-001 sampai CR-DB-004 dan keputusan 06E-4 sampai 06E-7. |

## DC-11 — Status Akhir dan Tahap Berikutnya

Dokumen tetap **DRAF — BELUM DIAUDIT**. Tujuh GAP dan tiga OPEN tidak ditutup. Tahap berikutnya adalah `RLS_SECURITY.md`, yang akan menurunkan matriks akses, jalur server, Storage, dan threat model tanpa menulis policy RLS sintaktis.
