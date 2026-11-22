# ARSITEKTUR DATABASE — FLIPBOOK STUDIO

## DA-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Dokumen | FS-DOC-06 — Database Architecture |
| Versi | `v0.1.2-draft` |
| Status | **DRAF — BELUM DIAUDIT** |
| Tujuan | Menetapkan batas arsitektur data hybrid sebagai dasar ERD, kamus data, constraint, RLS, rencana migrasi, dan rencana pengujian berikutnya. |
| Bukan cakupan | SQL, migrasi, nama tabel/kolom final, tipe PostgreSQL final, policy RLS sintaktis, konfigurasi Supabase, atau implementasi aplikasi. |

Dokumen ini tidak menyetujui implementasi. Keputusan konseptual yang telah disetujui tetap dirujuk dari `DB_CONCEPTUAL_DECISIONS.md`, `DB_LOGICAL_DECISIONS.md`, `DATABASE_LOGICAL_MODEL.md`, `DATABASE_SECURITY_LIFECYCLE_DRAFT.md`, dan `DATABASE_FINAL_SPECIFICATION_DRAFT.md`.

### Riwayat Revisi Terkendali

| Versi | Perubahan |
|---|---|
| `v0.1.1-draft` | Penyelarasan referensi administratif CR-IA-001; tidak mengubah arsitektur data, GAP, OPEN, fase, atau keputusan teknis. |
| `v0.1.2-draft` | Penyelarasan status pascapenguncian ulang CR-IA-001; dokumen tetap DRAF tanpa perubahan arsitektur data, GAP, OPEN, fase, atau keputusan teknis. |

## DA-01 — Acuan dan Batas Konsistensi

Arsitektur ini diturunkan dari FS-DOC-01 sampai FS-DOC-05 yang terkunci dan artefak FS-DOC-06 yang masih relevan. Kontrak yang tidak boleh berubah adalah: UUID stabil, draf relasional, snapshot publikasi immutable, proyeksi Reader yang aman, rahasia penilaian server-only, sesi siswa bertoken tanpa penyimpanan token mentah, aktivasi versi atomik secara konseptual, dan audit operasi kritis.

IA-Q-001 sampai IA-Q-004 telah **DECIDED/CLOSED melalui CR-IA-001**. Baseline terkait telah dikunci kembali setelah audit konsistensi; dokumen ini tidak mengubah route, inventaris IA, fase, atau keputusan produk.

## DA-02 — Prinsip Arsitektur Hybrid

| Lapisan | Tanggung jawab | Batas wajib |
|---|---|---|
| Supabase Auth / `auth` | Identitas administrator. | Tidak menjadi tempat data aplikasi atau rahasia penilaian. |
| PostgreSQL `public` | Data aplikasi yang dapat dilindungi RLS dan metadata relasional. | Default deny; tidak ada akses publik langsung ke draf atau rahasia. |
| PostgreSQL `private` | Kunci jawaban, bobot rahasia, dan data yang hanya boleh diproses server tepercaya. | Tidak diekspos melalui Data API atau browser. |
| Supabase Storage | Objek media dan representasi aset. | Storage bukan otoritas lifecycle; akses harus tunduk pada pemeriksaan lifecycle dan scope. |
| Jalur server tepercaya | Publish, rollback, revoke, penilaian, finalisasi, QR dinamis, audit, dan operasi Storage sensitif. | Memvalidasi identitas, scope objek, lifecycle, dependensi, serta konkurensi. |
| Client/browser | Reader, draf UI, preferensi, posisi baca, dan antrean jawaban terbatas. | Bukan sumber kebenaran; token sesi mentah tidak dipersistenkan otomatis. |

## DA-03 — Domain Data dan Representasi

| Domain | Kandidat konseptual/logis | Representasi arsitektural | Fase |
|---|---|---|---|
| Administrasi dan konfigurasi | Principal admin, konfigurasi, audit | Relasional privat/operasional; audit generik berklasifikasi domain. | MVP |
| Buku dan draf | Buku, alias slug, node struktur, komponen, override tema | Draf relasional dengan UUID stabil dan CAS. | MVP; tema lanjutan sesuai baseline |
| Media | Metadata media dan dependensi snapshot-media | Metadata relasional + Storage; objek dan metadata direkonsiliasi. | MVP |
| Publikasi | Snapshot versi, proyeksi publik, definisi aktivitas rahasia | Snapshot immutable; proyeksi publik terpisah secara akses; rahasia tetap server-only. | MVP |
| Aktivitas siswa | Sesi, attempt, jawaban diterima, hasil final, hasil idempoten | Relasional privat/server-only dengan pin versi aktivitas asal. | MVP |
| Retry dan QR | Retry grant; target QR dinamis; agregat QR | Retry dan QR dinamis Fase 2; QR statis tidak memerlukan statistik scan khusus. | Fase 2 kecuali QR statis |
| Operasional | Observasi kapasitas; bukti backup/pemulihan | Bukti operasional atau data provider; bukan tabel fisik otomatis. | MVP/Fase 2 sesuai kebutuhan |

Daftar ini memetakan 23 kandidat logis, bukan keputusan bahwa terdapat 23 tabel fisik.

## DA-04 — Batas Akses dan Trust Boundary

| Subjek | Boleh meminta | Tidak boleh memperoleh langsung |
|---|---|---|
| Reader anonim | Proyeksi publik yang tervalidasi dan lifecycle-nya mengizinkan. | Draf, snapshot lengkap, kunci jawaban, bobot, sesi/attempt siswa lain, media privat. |
| Siswa bersesi sah | Operasi attempt miliknya dalam scope aktivitas, deadline, dan lifecycle yang sah. | Token/attempt pengguna lain, hasil/kunci rahasia, finalisasi tanpa validasi server. |
| Administrator | Operasi sesuai scope admin melalui jalur terotorisasi. | Eksekusi sensitif tanpa validasi server atau data privat siswa yang tidak relevan. |
| Server tepercaya | Menjalankan operasi kritis setelah memvalidasi konteks. | Melewati pemeriksaan identitas, scope, lifecycle, dependensi, atau konkurensi. |

RLS bersifat default deny. Penyembunyian field di React atau query parameter bukan mekanisme keamanan.

## DA-05 — Snapshot, Proyeksi Publik, dan Penilaian Privat

1. Draf dapat berubah melalui CAS, tetapi snapshot versi publikasi bersifat immutable.
2. Snapshot lengkap tidak otomatis dapat dikirim ke Reader.
3. Proyeksi publik hanya boleh berisi struktur/konten/media yang telah divalidasi dan diizinkan lifecycle.
4. Definisi aktivitas, kunci jawaban, bobot rahasia, dan konfigurasi scoring sensitif tetap berada pada batas server-only.
5. Attempt, jawaban, dan hasil selalu merujuk versi publikasi serta definisi aktivitas asal; publish baru, rollback, atau perubahan draf tidak mengubah histori penilaian.
6. Satu buku hanya dapat memiliki pointer versi aktif yang sah. Aktivasi pointer dan audit terkait harus diperlakukan sebagai satu kontrak atomik PostgreSQL secara konseptual.

## DA-06 — Kontrak Operasi Kritis

| Operasi | Kontrak arsitektural | Bukti minimum sebelum dinyatakan siap |
|---|---|---|
| Autosave draf | CAS/revision menolak tulis stale tanpa silent overwrite. | Uji dua autosave dengan expected revision sama. |
| Publish | Validasi draf, struktur, komponen, aktivitas, proyeksi publik, dan media terjadi sebelum aktivasi. | Uji publish ganda; satu versi aktif; audit kedua outcome. |
| Rollback/revoke | Rollback memverifikasi dependensi; emergency revoke lebih prioritas dan akses tidak pulih otomatis setelah restore. | Uji lifecycle, cache, media, dan audit. |
| Penghapusan media | Admin meminta; server memeriksa dependensi, pending delete, dan revalidasi sebelum operasi Storage. | Uji race rollback versus delete dan rekonsiliasi mismatch. |
| Jawaban/finalisasi | Server menerima jawaban sah, menghormati deadline UTC, idempotensi, dan maksimal satu hasil per attempt. | Uji double submit serta empat interleaving auto-finalize/submit. |
| Retry grant | Fase 2; grant sah dapat memberi attempt baru tanpa menimpa attempt/hasil lama. | Uji consume sekali dan penolakan replay. |
| QR dinamis | Fase 2; target internal aktif saja, tanpa siklus/target eksternal; agregat non-PII. | Uji resolusi lifecycle dan increment agregat bersamaan. |

Tidak ada mekanisme locking, isolation level, job, queue, TTL, atau detail transaksi fisik yang ditetapkan pada dokumen ini.

## DA-07 — Storage, Backup, dan Operasional

Media yang direferensikan snapshot atau attempt tidak boleh dihapus tidak aman. Storage dan PostgreSQL tidak diasumsikan berada dalam transaksi terdistribusi. Kegagalan setelah penghapusan objek harus ditandai, diaudit, dan direkonsiliasi.

Strategi kebijakan backup adalah ekspor operasional terverifikasi, dengan provider tambahan opsional. Klaim recovery memerlukan bukti database, objek Storage, serta mapping/dependensi media. Cadence, tooling, retensi, lokasi, dan kemampuan provider masih belum final.

Observasi kapasitas dapat menggabungkan telemetry provider terverifikasi dan perhitungan aplikasi. Nilai tidak tersedia atau kedaluwarsa berarti tidak pasti, bukan nol, dan tidak boleh memicu tindakan destruktif otomatis.

## DA-08 — Kesesuaian dengan Keputusan IA/UI

| Keputusan | Dampak arsitektur data | Batas |
|---|---|---|
| IA-Q-001 — sidebar dan URL stabil | Tidak mengubah identitas UUID, slug, atau 15 route yang telah ada. | Tercatat melalui CR-IA-001; baseline terkait telah dikunci kembali. |
| IA-Q-002 — breadcrumb | Menggunakan konteks hierarkis buku/struktur yang sudah ada; bukan kontrol akses. | Tidak menyimpan data navigasi baru sebagai kewajiban database. |
| IA-Q-003 — metrik publish | Ringkasan hanya dari outcome/audit yang tersedia dan terverifikasi; detail aman tanpa rahasia. | Tidak ada angka estimasi yang diperlakukan fakta. |
| IA-Q-004 — indikator antrean | Status lokal dibedakan dari jawaban yang benar-benar diterima server. | Browser storage, expiry, retry, isolasi perangkat bersama, dan recovery tetap OPEN. |

## DA-09 — GAP dan OPEN yang Dipertahankan

| Status | Skenario | Alasan belum ditutup |
|---|---|---|
| GAP | SCN-06D3-005 | Serialisasi/isolation fisik publish belum dibuktikan. |
| GAP | SCN-06D3-008 | Koordinasi rollback dan penghapusan media/Storage belum dibuktikan. |
| GAP | SCN-06D3-016 | Cache stale setelah revoke memerlukan bukti jalur akses/provider. |
| GAP | SCN-06D3-017 | URL Storage tidak boleh melewati lifecycle; model akses fisik belum dipilih. |
| GAP | SCN-06D3-027 | Submit paralel dengan key berbeda membutuhkan arbitrasi fisik. |
| GAP | SCN-06D3-029 | Interleaving auto-finalize dan submit membutuhkan kontrak isolation teruji. |
| GAP | SCN-06D3-043 | Backup/restore provider dan media/mapping belum diverifikasi. |
| OPEN | SCN-06D3-011 | Jadwal, metode, dan bukti rekonsiliasi orphan Storage belum final. |
| OPEN | SCN-06D3-034 | Detail browser persistence, privasi perangkat, expiry, retry, dan recovery antrean belum final. |
| OPEN | SCN-06D3-044 | Capability provider, sumber, interval, ambang, dan bukti telemetry belum final. |

## DA-10 — Urutan Dokumen Turunan

1. `DATABASE_ERD.md`: hubungan kandidat relasional dan cardinality tanpa memaksa semua kandidat menjadi tabel.
2. `DATA_DICTIONARY.md`: atribut fisik usulan, tipe, nullability, key, dan indeks kandidat dengan penandaan keputusan belum final.
3. `DATABASE_CONSTRAINTS.md`: constraint/invariant, CAS, idempotensi, lifecycle, dan batas transaksi.
4. `RLS_SECURITY.md`: matriks RLS, jalur server, Storage, threat model, dan pembuktian akses.
5. `DATABASE_MIGRATION_PLAN.md`: urutan migrasi dan rollback konseptual setelah pilihan fisik diaudit.
6. `DATABASE_TEST_PLAN.md`: bukti untuk GAP/OPEN, RLS, transaksi, media, QR, backup/restore, dan aksesibilitas alur data.

## DA-11 — Kriteria Kesiapan Tahap Berikutnya

`DATABASE_ERD.md` dapat disusun sebagai draf karena tidak menetapkan SQL. `DATA_DICTIONARY.md`, `DATABASE_CONSTRAINTS.md`, dan `RLS_SECURITY.md` harus menandai setiap pilihan fisik sebagai usulan sampai audit teknis. Tidak ada migrasi, policy RLS sintaktis, atau implementasi database yang boleh dimulai sebelum dokumen turunan diaudit dan bukti GAP/OPEN yang relevan tersedia.

## DA-12 — Status Akhir

Dokumen ini adalah dasar arsitektur untuk desain fisik bertahap. Statusnya tetap **DRAF — BELUM DIAUDIT**. Tidak ada keputusan baru yang ditetapkan selain pencatatan keputusan pemilik yang telah diberikan sebelumnya.
