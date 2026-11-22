# PRODUCT REQUIREMENTS DOCUMENT (PRD) — FLIPBOOK STUDIO

---

## 1. Identitas Dokumen dan Status Persetujuan

- **Nama Proyek:** Flipbook Studio
- **Kode Proyek:** FS-CORE
- **Nomor Dokumen:** FS-DOC-01
- **Nama Dokumen:** `docs/PRODUCT_REQUIREMENTS.md`
- **Fase Pengembangan:** Fase 0 — Audit dan Dokumentasi Arsitektur
- **Status Dokumen:** **APPROVED & LOCKED — DISETUJUI PEMILIK PROYEK**
- **Versi Dokumen:** v1.2.0-final-alignment
- **Tanggal Pembuatan:** 17 November 2026
- **Tanggal Persetujuan:** 17 November 2026
- **Pihak yang Menyetujui:** Pemilik Proyek Flipbook Studio
- **Status Baseline:** Final dan Terkunci
- **Jenis Persetujuan:** Persetujuan eksplisit pemilik proyek
- **Kebijakan Perubahan:** Perubahan substansial setelah penguncian hanya diperbolehkan melalui permintaan perubahan resmi (change request) dan persetujuan baru pemilik proyek.
- **Basis Acuan (Single Source of Truth):**
  - `FLIPBOOK_STUDIO_MASTER_PROMPT.md`
  - Keputusan Terkunci Q1–Q5 & A1–A12 (Addendum Persetujuan Pemilik Proyek)
  - `FASE_0_AUDIT_REPORT.md` (Artifact ID: `9337acfb-a007-4c7b-9ad6-89d736412cbf`)
- **Penulis Dokumen:** Tim Arsitektur Sistem Flipbook Studio (Senior Software Architect, Product Manager, Database Architect, Security Architect, UI/UX Architect, Technical Documentation Specialist)

---

## 2. Ringkasan Eksekutif

**Flipbook Studio** adalah platform web modern untuk membuat, mengelola, menerbitkan, membagikan, dan membaca buku digital, flipbook, serta e-modul interaktif secara mandiri dan fleksibel. Platform ini dirancang sebagai sistem yang bersifat **umum (general-purpose)**—bukan aplikasi silang-spesifik untuk satu topik kurikulum, satu judul buku, atau satu instansi sekolah saja. 

Platform mengimplementasikan arsitektur berpusat pada dua peran:
1. **Administrator Tunggal:** Beroperasi melalui antarmuka desktop/tablet terautentikasi (Supabase Auth) untuk menyusun konten interaktif bertingkat (maksimal 2 level hierarki: Bab > Halaman), mengelola tema, melakukan validasi bertahap, dan mengeksekusi penerbitan berbasis snapshot *immutable*.
2. **Pembaca Publik (termasuk siswa usia SD):** Mengakses buku tanpa keharusan membuat akun (*zero-friction*), dengan pengalaman visual adaptif (mode flipbook dua halaman desktop dengan fallback vertikal scroll, serta satu kolom responsif untuk perangkat bergerak). Identitas pembaca bersifat *self-reported* dan hanya diminta saat pembaca memulai aktivitas yang hasilnya dicatat.

Sistem bertumpu pada fondasi teknologi modern: frontend **React + Vite** di-hosting pada **Cloudflare Pages**, terintegrasi dengan **Supabase PostgreSQL** (arsitektur hybrid tiga-schema: `auth`, `public`, `private`), **Supabase Storage** (strategi hybrid privat-draf & publik-terbit), dan kombinasi **Supabase Edge Functions** serta **PostgreSQL Functions/RPC** yang aman. Seluruh keputusan desain memprioritaskan efisiensi sumber daya guna mencapai target biaya operasional awal **Rp0** (memanfaatkan paket gratis penyedia layanan tanpa mengorbankan integritas data dan keamanan privasi anak).

---

## 3. Latar Belakang dan Permasalahan

### 3.1 Latar Belakang
Kebutuhan akan media pembelajaran dan modul literasi digital interaktif terus meningkat di berbagai jenjang pendidikan dan komunitas. Namun, mayoritas solusi yang tersedia di pasar saat ini memiliki beberapa kelemahan fundamental:
- **Terkunci pada Ekosistem Proprietary / Berbayar Mahal:** Layanan flipbook populer membebankan biaya langganan berulang yang tinggi dan menampilkan iklan komersial yang tidak pantas untuk lingkungan pendidikan dasar.
- **Tautan Mudah Rusak (Link Rot):** Penataan ulang halaman atau pembaruan buku pada platform konvensional kerap merusak tautan statis atau QR code cetak yang telah didistribusikan ke siswa.
- **Kuis yang Mudah Dimanipulasi:** Evaluasi interaktif pada flipbook konvensional umumnya membocorkan kunci jawaban langsung di source code sisi peramban (client-side script), sehingga siswa dapat memeriksa jawaban melalui peramban pengembang (*inspect element*).
- **Pelanggaran Privasi Anak:** Banyak platform mengharuskan siswa login menggunakan akun sosial pihak ketiga, memasang pelacak analitik invasif (*trackers/fingerprinting*), atau menyimpan data pribadi secara berlebihan.

### 3.2 Rumusan Masalah
Flipbook Studio dirancang untuk menjawab lima tantangan teknis inti:
1. Bagaimana menyediakan editor visual yang kaya dan fleksibel tanpa risiko tata letak yang rusak (*layout breakage*) di layar kecil?
2. Bagaimana menjamin bahwa setiap tautan deep link dan QR Code cetak tetap stabil dan valid meskipun isi buku mengalami perubahan struktur bab/halaman secara dinamis?
3. Bagaimana menjamin penilaian kuis (*scoring*) dan pencatatan waktu (*timer*) bersifat tepercaya (*server-authoritative*) tanpa mengekspos kunci jawaban sebelum waktunya?
4. Bagaimana memastikan data anak terlindungi secara ketat sesuai prinsip *Privacy by Design* tanpa menambah beban operasional pendaftaran akun?
5. Bagaimana merancang seluruh arsitektur sistem agar dapat beroperasi secara andal dalam batas kuota gratis (*Rp0 tier*) penyedia layanan cloud modern?

---

## 4. Visi, Tujuan, dan Nilai Produk

### 4.1 Visi Produk
Menjadi platform pembuat dan pembaca modul digital interaktif yang paling stabil, aman, aksesibel, dan efisien secara operasional untuk para pendidik, penulis, dan institusi.

### 4.2 Tujuan Produk (Product Goals)
- **Kemudahan Editor:** Memungkinkan admin menyusun e-modul multimedia bertaraf profesional melalui editor visual intuitif tanpa memerlukan keterampilan pemrograman.
- **Integritas Penilaian & Sesi:** Mengamankan evaluasi pembelajaran melalui penilaian sisi peladen (*backend-only scoring*) dan token sesi anonim ber-hash.
- **Stabilitas Tautan & QR Code:** Memastikan kesinambungan antara materi cetak dan digital melalui stable identifier, penanganan alias slug lama, dan QR code dinamis cerdas.
- **Keandalan Versioning:** Menghindari efek samping penyuntingan terhadap pembaca melalui pemisahan mutlak antara draft relasional dan snapshot publikasi *immutable*.
- **Aksesibilitas & Inklusivitas:** Mematuhi pedoman aksesibilitas ramah anak (kontras tinggi, reduced motion, ukuran teks fleksibel, navigasi keyboard penuh, dan alternatif sentuh).
- **Target Biaya Rp0:** Mengoptimalkan struktur data JSONB terkompresi, sanitasi aset, dan logika agregasi agar tetap beroperasi optimal pada tingkat layanan gratis cloud.

### 4.3 Nilai Produk (Core Values)
- **Reliable by Structure:** Struktur data tidak mudah korup; snapshot terbit tidak terganggu oleh draf yang sedang diedit.
- **Privacy by Design:** Minimisasi data personal, ketiadaan pelacakan invasif, dan penanganan ketat data siswa sekolah dasar.
- **Honest Simplicity:** Antarmuka bersih, fokus pada keterbacaan materi, tanpa distraksi visual atau komersialisasi.

---

## 5. Sasaran Pengguna dan Aktor

Sistem secara eksplisit membatasi dan melayani dua aktor utama:

| Atribut | Aktor 1: Administrator | Aktor 2: Pembaca Publik (Termasuk Siswa SD) |
|---|---|---|
| **Otentikasi** | Wajib login via Supabase Auth (Email & Kata Sandi) | Tanpa registrasi/login akun; akses publik anonim |
| **Identitas** | Terverifikasi melalui record `admin_profiles` | *Self-reported* (Nama & Kelas) hanya saat memulai aktivitas tercatat |
| **Perangkat Utama** | Komputer Desktop, Laptop, Tablet Layar Lebar | Smartphone, Tablet, Chromebook, Komputer Lab Bersama |
| **Hak Akses** | CRUD Buku, Draf, Komponen, Media, Aset, QR, Publikasi, Nilai | Akses baca buku terbit (`read-only`), partisipasi aktivitas terbit |
| **Konteks Penggunaan** | Menyusun modul pembelajaran, memantau hasil pengerjaan kuis, mencetak QR | Membaca materi mandiri, mengerjakan latihan di kelas / di rumah |
| **Privasi Data** | Kredensial terlindungi enkripsi standar industri | Token sesi acak di peramban; hanya nilai hash SHA-256 disimpan di DB |

---

## 6. Ruang Lingkup Produk

### 6.1 Dalam Ruang Lingkup (In-Scope)
- Pengelolaan multi-buku oleh satu administrator.
- Penyuntingan draf relasional dengan kedalaman nesting komponen maksimal 3 tingkat.
- Penyusunan struktur modul maksimal 2 tingkat (Bab/Bagian > Halaman Mandiri).
- Pustaka komponen terintegrasi (Teks, Media, Tata Letak, Interaktif).
- Wizard penerbitan 5 tahap dengan validasi menyeluruh dan aktivasi pointer versi atomik.
- Reader adaptif dengan mode flipbook desktop (fallback ke scroll vertikal) dan mode satu kolom mobile.
- Aktivitas interaktif dengan penilaian backend murni (*backend-only scoring*) dan timer otoritatif.
- Generator dan manajer QR Code statis & dinamis dengan analitik agregat harian Asia/Jakarta.
- Fitur "Ganti Pembaca" pada Reader untuk perangkat laboratorium sekolah yang digunakan bersama (membersihkan token sesi lokal dan riwayat pembaca).
- Strategi pencadangan menyeluruh (data relasional, skema, dan file fisik media sebenarnya) serta prosedur pemulihan bencana (*disaster recovery*).

### 6.2 Di Luar Ruang Lingkup (Out-of-Scope / Non-Goals)
- Multi-tenancy atau pendaftaran banyak administrator independen (*SaaS multi-tenant*).
- Pembuatan akun login sosial (Google, Apple, FB) untuk siswa pembaca.
- Sinkronisasi riwayat posisi baca antarperangkat pembaca (posisi baca tersimpan *lokal* di peramban).
- Forum diskusi terbuka, obrolan langsung (*live chat*), atau fitur jejaring sosial siswa.
- Penjualan buku komersial, integrasi payment gateway, atau DRM berbasis lisensi terenkripsi rumit.
- Editor tata letak bebas mutlak (*absolute freehand canvas*) bergaya Adobe InDesign/Photoshop yang merusak responsivitas mobile.
- Penyisipan kode JavaScript sembarang (*arbitrary script execution*) oleh admin di dalam komponen buku.

---

## 7. Kebutuhan Fungsional per Modul

### 7.1 Modul 1: Administrator & Autentikasi (FR-ADM)

- **FR-ADM-001 (Otentikasi Tunggal):** Sistem wajib menyediakan mekanisme otentikasi aman bagi administrator tunggal menggunakan Supabase Auth melalui kredensial terdaftar.
- **FR-ADM-002 (Otorisasi Server-Side):** Sistem wajib memvalidasi sesi admin pada tingkat database/RLS dan Supabase Edge Functions sebelum memberikan akses ke endpoint privat.
- **FR-ADM-003 (Dashboard Ringkasan):** Sistem wajib menyediakan halaman dashboard admin yang menampilkan ringkasan jumlah buku (draf dan terbit), riwayat penerbitan terbaru, dan indikator penggunaan kuota penyimpanan.
- **FR-ADM-004 (Audit Logging Tindakan Kritis):** Sistem wajib mencatat setiap tindakan kritis admin (penerbitan, unpublish, emergency revoke, rollback, perubahan tujuan QR dinamis, pemberian izin retry) ke dalam tabel audit log di skema privat.
- **FR-ADM-005 (Pengaturan Aplikasi):** Sistem wajib menyediakan antarmuka konfigurasi umum aplikasi yang tersimpan aman pada tabel `app_settings`.

### 7.2 Modul 2: Manajemen Buku & Struktur Konten (FR-BOK)

- **FR-BOK-001 (Manajemen Multi-Buku):** Administrator dapat membuat, menyunting metadata (judul, deskripsi, penulis, mata pelajaran, target kelas, tahun), mengarsipkan, dan menghapus buku.
- **FR-BOK-002 (Identitas Stabil / Stable IDs):** Setiap buku, bab, halaman, komponen, dan aktivitas wajib memiliki identifier unik stabil (`UUIDv4`) yang tidak berubah saat terjadi perubahan susunan, pemindahan induk, atau perubahan nomor urut.
- **FR-BOK-003 (Pemisahan Slug Publik):** Sistem wajib memisahkan antara `UUID` internal dan `slug` publik ramah-URL.
- **FR-BOK-004 (Hierarki Konten Terbatas):** Struktur modul mendukung kombinasi halaman mandiri dan bab yang menampung halaman, dengan pembatasan kedalaman struktural maksimal dua tingkat: `Bab/Bagian > Halaman`.
- **FR-BOK-005 (Operasi Halaman):** Sistem wajib menyediakan fungsi tambah halaman, pindah halaman antarbab, ubah urutan (*reorder*), duplikasi halaman (menghasilkan ID baru tanpa riwayat data), dan hapus halaman dari draf.
- **FR-BOK-006 (Daftar Isi Otomatis):** Sistem wajib menyusun daftar isi buku secara otomatis berdasarkan urutan hierarki struktural yang sah pada draf maupun snapshot terbit.

### 7.3 Modul 3: Editor Visual & Properti Komponen (FR-EDT)

- **FR-EDT-001 (Tata Letak Tiga Panel Adaptif):** Editor desktop wajib menyediakan antarmuka 3 panel adaptif: Panel Kiri (Struktur/Pohon Halaman & Pustaka Komponen), Panel Tengah (Canvas Editor responsif), dan Panel Kanan (Inspektor Properti Kontekstual).
- **FR-EDT-002 (Responsivitas Panel Editor):** Pada resolusi tablet, antarmuka bertransisi menjadi 2 panel terintegrasi; pada layar bergerak, panel ditampilkan secara bergantian via laci/drawer.
- **FR-EDT-003 (Dua Mode Halaman):** Editor wajib mendukung:
  1. *Mode Blok:* Alur konten linear vertikal terstruktur.
  2. *Mode Tata Letak Bebas Terbatas:* Berbasis grid/container responsif dengan batasan breakpoint, bukan *absolute free-positioning* sembarang.
- **FR-EDT-004 (Interaksi Penambahan & Pengurutan Komponen):** Penambahan komponen dapat dilakukan melalui klik palet atau drag-and-drop; pengurutan wajib mendukung drag handle, tombol naik/turun, pintasan keyboard, dan tombol sentuh aksesibel.
- **FR-EDT-005 (Batas Kedalaman Nesting Komponen):** Struktur hierarki komponen kontainer di dalam halaman dibatasi secara ketat maksimal 3 tingkat (Tingkat 1: Container Induk > Tingkat 2: Kolom/Kartu > Tingkat 3: Komponen Konten/Interaktif).
- **FR-EDT-006 (Inspektor Properti Komponen):** Setiap komponen wajib memiliki pengaturan terisolasi mencakup 5 tab: Konten, Tampilan, Tata Letak, Perilaku, dan Aksesibilitas (alt-text, peran ARIA).
- **FR-EDT-007 (Autosave, Concurrency Control & Validasi Struktural):** Sistem wajib menerapkan penyimpanan otomatis draf berbasis *debounce* yang divalidasi oleh backend menggunakan *optimistic concurrency control* via kolom nomor revisi (`revision counter`). Setiap operasi penyimpanan memeriksa kesesuaian revisi (`compare-and-swap`). Sistem menolak secara mutlak penimpaan data diam-diam (*silent overwrite*). Jika terdeteksi konflik akibat pengeditan simultan pada tab/perangkat berbeda, perubahan lokal tetap dipertahankan di memori/storage sementara dan antarmuka menampilkan perbandingan visual resolusi konflik. Penggabungan otomatis (*auto-merge*) hanya diizinkan untuk modifikasi bidang data yang terbukti tidak bertabrakan secara semantik; operasi struktural (penambahan, pemindahan, pengurutan ulang, dan penghapusan halaman/komponen) wajib diselesaikan manual oleh admin. Mekanisme undo/redo sisi klien dijaga agar tetap konsisten dengan titik revisi tersimpan, dan penerbitan buku hanya dapat mengeksekusi draf dengan status revisi yang telah tersimpan utuh dan tervalidasi pada backend.
- **FR-EDT-008 (Undo/Redo Sisi Klien):** Editor menyediakan riwayat perubahan state lokal untuk membatalkan (*undo*) atau mengulang (*redo*) aksi penyuntingan draf.
- **FR-EDT-009 (Sanitasi Konten & Allowlist):** Semua masukan teks kaya (*rich text*) wajib disanitasi dari tag script/vektor XSS; komponen embed dibatasi hanya pada domain yang masuk allowlist terverifikasi (YouTube, Vimeo, Google Slides).

### 7.4 Modul 4: Pustaka Komponen Konten & Interaktif (FR-CMP)

Pustaka komponen dibagi menjadi 4 kategori fungsional:
- **FR-CMP-001 (Komponen Konten Dasar):** Judul (Heading H1-H4), Paragraf, Daftar (Berbutir/Bernomor), Tabel Sederhana, Kutipan (Blockquote), Tombol Tautan Internal/Eksternal.
- **FR-CMP-002 (Komponen Media):** Gambar Tunggal, Galeri Gambar, Pemutar Video (terunggah atau allowlisted embed), Pemutar Audio Pembelajaran, Dokumen PDF Viewer tersemat.
- **FR-CMP-003 (Komponen Tata Letak Kontainer):** Container Responsif, Multi-Kolom (1-4 kolom adaptif), Kartu (Card), Pemisah Garis (Divider), Spasi Vertikal Dinamis, Kotak Catatan/Informasi Tematik (Alert Box).
- **FR-CMP-004 (Komponen Pembelajaran Interaktif):**
  - Pilihan Ganda (Single Choice)
  - Pilihan Jamak (Multiple Response)
  - Benar/Salah (True/False)
  - Isian Singkat (Short Answer Text)
  - Mencocokkan Pasangan (Matching Pair)
  - Mengurutkan Urutan Logis (Sequence Ordering)
  - Drag-and-Drop Area (dengan mode alternatif keyboard)
  - Titik Sentuh Informatif (Interactive Hotspot)
  - Kartu Balik Pemahaman (Flashcard)
  - Refleksi / Tanggapan Diri (Self-Reflection Form tanpa skor)

### 7.5 Modul 5: Sistem Tema & Pewarisan Desain (FR-THM)

- **FR-THM-001 (Tiga Tingkat Pewarisan Gaya):** Gaya visual diatur secara berjenjang: Tema Global Buku -> Pengaturan Tata Halaman Spesifik -> Override Per-Komponen.
- **FR-THM-002 (Pewarisan Token Desain):** Komponen yang tidak dioverride wajib mewarisi token tema dinamis (warna semantik, font, radius sudut, density, bayangan), bukan nilai heksadesimal statis mentah.
- **FR-THM-003 (Preset Tema Bawaan):** Sistem menyediakan sekurang-kurangnya 4 preset tema baku ramah keterbacaan: *Alam*, *Samudra*, *Hangat*, dan *Minimal*.
- **FR-THM-004 (Reset Override):** Administrator dapat mengembalikan override gaya komponen atau halaman kembali ke nilai baku token tema induk dengan satu klik.
- **FR-THM-005 (Isolasi Tema Draf):** Perubahan tema pada draf tidak memengaruhi tampilan buku terbit aktif hingga siklus publikasi ulang dijalankan.

### 7.6 Modul 6: Pratinjau (Preview) & Mode Pengujian (FR-PRV)

- **FR-PRV-001 (Quick Canvas Preview):** Editor menyediakan tombol alih cepat mode penyuntingan ke pratinjau instan pada canvas kerja.
- **FR-PRV-002 (Full-screen Realistic Preview):** Pratinjau layar penuh wajib mengeksekusi mesin render (*rendering engine*) yang sama persis dengan Reader publik, mendukung pemilihan viewport (Desktop, Tablet, Mobile) dan orientasi (Landscape, Portrait).
- **FR-PRV-003 (Mode Uji Aktivitas Terisolasi):** Sistem wajib menyediakan lingkungan uji coba kuis bagi admin yang terisolasi mutlak dari basis data hasil pengerjaan siswa asli. Isolasi tidak boleh hanya bergantung pada parameter kueri URL sisi klien, melainkan divalidasi oleh backend token sesi pengujian (`is_test_mode = true`).

### 7.7 Modul 7: Siklus Publikasi, Snapshot & Versioning (FR-PUB)

- **FR-PUB-001 (Wizard Publikasi Lima Tahap):** Penerbitan buku wajib melalui alur wizard 5 tahap:
  1. *Pemeriksaan Konten:* Memeriksa kelengkapan halaman dan judul.
  2. *Validasi Aktivitas:* Memastikan semua kuis memiliki kunci jawaban, bobot nilai, dan konfigurasi skor valid.
  3. *Verifikasi Tampilan & Tema:* Memeriksa keterbacaan kontras dan kompatibilitas tema.
  4. *Pengaturan Publikasi:* Menentukan slug publik, opsi akses, dan konfigurasi penarikan.
  5. *Konfirmasi Akhir:* Ringkasan perubahan sebelum eksekusi penulisan snapshot.
- **FR-PUB-002 (Kategori Status Validasi):** Sistem menampilkan hasil validasi: *Lulus (Pass)*, *Peringatan (Warning)*, atau *Kesalahan (Error)*. Kesalahan berkategori Error memblokir proses publikasi secara mutlak.
- **FR-PUB-003 (Pembuatan Snapshot Immutable):** Saat konfirmasi publikasi, sistem menyusun snapshot `content_snapshot JSONB` lengkap yang merepresentasikan struktur bab, halaman, komponen, referensi aset, dan versi aktivitas pada saat itu juga.
- **FR-PUB-004 (Aktivasi Pointer Versi Atomik):** Pengalihan pointer `books.active_version_id` ke snapshot versi baru wajib dieksekusi secara atomik dalam satu transaksi PostgreSQL bersama pencatatan audit log publikasi.
- **FR-PUB-005 (Version Pinning Percobaan Siswa):** Setiap sesi aktivitas siswa yang sedang berjalan wajib dipatok (*pinned*) secara permanen pada `activity_version_id` asal, sehingga pembaruan publikasi buku di tengah pengerjaan tidak merusak atau mengubah aturan penilaian siswa tersebut.
- **FR-PUB-006 (Kebijakan Penarikan Publikasi / Unpublish):** Saat melakukan penarikan publikasi buku, administrator wajib disajikan pilihan kebijakan penanganan terhadap sesi pengerjaan aktivitas siswa yang sedang berjalan. Kebijakan **default** yang ditegakkan backend adalah: (a) siswa yang telah memulai percobaan sebelum waktu penarikan diizinkan menyelesaikan pengerjaan hingga batas waktu sesinya berakhir (*grace period*); (b) pendaftaran percobaan baru ditolak seketika; (c) seluruh data hasil pengerjaan historis tetap dipertahankan utuh dan tidak dihapus; dan (d) aturan penilaian sesi yang sedang berjalan tetap terikat kokoh pada versi aktivitas asal tanpa perubahan aturan di tengah jalan. Administrator juga dapat memilih opsi penarikan ketat (*immediate block*) bila diperlukan, yang menghentikan penerimaan jawaban baru saat itu juga.
- **FR-PUB-007 (Pencabutan Darurat / Emergency Revoke):** Sistem wajib menyediakan fungsi pencabutan darurat yang secara langsung memblokir seluruh akses publik baru di tingkat backend/gateway, menolak operasi aktivitas yang sedang berjalan, dan mencegah finalisasi nilai yang tidak diizinkan tanpa otomatis memberi nilai nol secara sepihak kepada siswa yang terdampak. Seluruh data historis tetap dipertahankan dan tindakan dicatat dalam audit log. Sistem secara eksplisit membedakan antara pencabutan hak akses di peladen (ditegakkan seketika), pembatalan cache jaringan yang masih dapat dikendalikan (*controllable cache invalidation*), dan keterbatasan penarikan materi yang telah terunduh pada penyimpanan lokal peramban pengguna.
- **FR-PUB-008 (Rollback Terkontrol):** Administrator dapat memutar kembali (*rollback*) versi aktif buku ke salah satu snapshot versi terbit sebelumnya yang sah melalui transaksi atomik baru.

### 7.8 Modul 8: Reader Adaptif & Aksesibilitas (FR-RDR)

- **FR-RDR-001 (Halaman Pembuka / Sampul Luar):** Akses ke URL utama buku (`/b/:slug`) wajib menampilkan Halaman Pembuka yang memuat sampul luar, judul, deskripsi, metadata modul, dan tombol "Mulai Membaca" / "Lanjutkan Membaca".
- **FR-RDR-002 (Pemisahan Sampul Luar dan Sampul Isi):** Halaman Pembuka di luar buku terpisah dari halaman pembuka bab/isi di dalam buku.
- **FR-RDR-003 (Mode Flipbook Desktop Cerdas):** Pada layar desktop, Reader menampilkan animasi pembalikan dua halaman (*dual-page flipbook*) hanya jika dimensi konten sesuai. Jika halaman memuat konten panjang atau interaktif kompleks, Reader secara cerdas beralih ke mode satu halaman / scroll vertikal terpadu.
- **FR-RDR-004 (Mode Mobile Satu Kolom):** Pada perangkat smartphone, Reader selalu merender tata letak satu kolom vertikal yang mulus dengan navigasi sentuh (*swipe*) opsional yang tidak mengganggu komponen interaktif seret (drag-and-drop).
- **FR-RDR-005 (Navigasi Komprehensif):** Reader menyediakan bilah navigasi ringkas, laci daftar isi, indikator nomor halaman, tombol sebelumnya/berikutnya, dan penanganan tautan internal berbasis Stable ID.
- **FR-RDR-006 (Penyimpanan Progres Baca Lokal):** Posisi halaman terakhir dibaca disimpan secara lokal pada `localStorage` peramban pembaca, tanpa transmisi analitik atau sinkronisasi lintas perangkat.
- **FR-RDR-007 (Preferensi Aksesibilitas Pembaca):** Pembaca dapat mengatur ukuran font teks, beralih ke mode kontras tinggi, dan mengaktifkan mode *reduced motion* (menonaktifkan animasi flipbook).
- **FR-RDR-008 (Tanpa Autoplay Media):** Reader dilarang memutar audio atau video secara otomatis tanpa inisiasi interaksi eksplisit oleh pembaca.
- **FR-RDR-009 (Ganti Pembaca di Perangkat Bersama):** Reader menyediakan tombol "Ganti Pembaca" di halaman pembuka dan menu buku guna membersihkan token sesi lokal saat perangkat digunakan bergantian oleh siswa lain di laboratorium komputer.

### 7.9 Modul 9: Penilaian Pembelajaran & Integritas Sesi (FR-ACT)

- **FR-ACT-001 (Pendaftaran Sesi Identitas Minimal):** Pembaca diminta memasukkan Nama dan Kelas *hanya* ketika hendak memulai aktivitas pembelajaran yang hasilnya dicatat ke peladen.
- **FR-ACT-002 (Token Sesi Anonim Ber-Hash):** Sistem menghasilkan token acak kriptografis di sisi peramban; hanya nilai hash SHA-256 dari token yang disimpan pada basis data untuk validasi kepemilikan sesi pengerjaan.
- **FR-ACT-003 (Backend-Only Scoring):** Seluruh pencocokan kunci jawaban, pembobotan, dan kalkulasi nilai dilakukan secara eksklusif di dalam Supabase Edge Functions / PostgreSQL Functions pada skema privat. Kunci jawaban tidak pernah dikirimkan ke peramban pembaca sebelum batas waktu atau status publikasi nilai diizinkan.
- **FR-ACT-004 (Konfigurasi Percobaan & Agregasi):** Admin dapat menentukan aturan percobaan pengerjaan (1 kali, N kali, atau tanpa batas) dan metode perhitungan nilai akhir (Nilai Tertinggi, Terakhir, Pertama, atau Rata-rata).
- **FR-ACT-005 (Server-Authoritative Timer & Mekanisme Auto-Finalize):** Batas waktu pengerjaan ujian/kuis ditentukan sepenuhnya oleh waktu peladen (timestamp UTC pada backend) dan bukan berdasarkan waktu perangkat siswa. Pengiriman jawaban yang diterima peladen setelah batas waktu resmi terlewati wajib ditolak. Sesi yang telah melewati tenggat waktu secara logis dianggap telah berakhir, meskipun status pada database belum diperbarui seketika. Finalisasi evaluasi nilai dieksekusi secara deterministik dan idempoten berdasarkan jawaban terakhir yang tersimpan secara sah sebelum tenggat waktu resmi terlewati; eksekusi penulisan status finalisasi dapat terjadi saat akses berikutnya (*on-access finalization*) atau melalui proses penjadwalan backend bila tersedia tanpa memerlukan proses latar belakang yang berjalan terus-menerus setiap detik. Kondisi peramban ditutup atau koneksi terputus tidak mengubah batas waktu logis sesi serta tidak boleh menimbulkan penghitungan nilai ganda.
- **FR-ACT-006 (Autosave Jawaban Berkala & Idempoten):** Jawaban pembaca disimpan berkala secara otomatis ke backend dengan pengesahan token sesi ber-hash; operasi penyimpanan dan pengiriman jawaban wajib bersifat idempoten menggunakan kunci transaksi/revisi untuk menangkal anomali transmisi jaringan ganda tanpa risiko data korup.
- **FR-ACT-007 (Kebijakan Pengungkapan Hasil):** Admin dapat mengonfigurasi kapan umpan balik (skor angka, ketuntasan, status benar/salah, penjelasan pembahasan) diungkapkan kepada siswa (langsung setelah submit, setelah sesi selesai, atau setelah tanggal tertentu).
- **FR-ACT-008 (Manual Retry Grant / Izin Pengerjaan Ulang):** Administrator terotorisasi dapat memberikan izin pengerjaan ulang (*retry grant*) kepada siswa tertentu berdasarkan ID percobaan unik pengerjaan sebelumnya (nama dan kelas hanya berfungsi sebagai penanda visual pembaca, bukan bukti otentikasi identitas). Backend menghasilkan kode otorisasi acak sekali pakai (*single-use*) yang memiliki masa kedaluwarsa eksplisit dan diverifikasi secara atomik saat dikonsumsi. Pengerjaan ulang yang sah menghasilkan record pengerjaan baru tanpa menimpa atau menghapus hasil pengerjaan historis, dapat diakses dari perangkat berbeda jika diizinkan konfigurasi sesi, dan seluruh tindakannya dicatat dalam audit log. Kode yang telah kedaluwarsa, telah digunakan, atau tidak terdaftar ditolak secara deterministik, serta izin retry dilarang keras menembus status buku yang sedang terkena Emergency Revoke atau Unpublish.

### 7.10 Modul 10: Deep Linking & Manajemen QR Code (FR-LNK)

- **FR-LNK-001 (Format Standar URL Publik):** Sistem mendukung pola URL publik yang konsisten:
  - Halaman Pembuka Buku: `/b/:slug`
  - Halaman Tertentu Buku: `/b/:slug/p/:stablePageId`
  - Aktivitas Spesifik: `/b/:slug/a/:stableActivityId`
  - Tautan Singkat QR Dinamis: `/q/:shortCode`
- **FR-LNK-002 (Pencatatan Alias Slug Lama):** Jika admin memperbarui slug publik sebuah buku, slug lama wajib disimpan secara otomatis di tabel `book_slug_aliases` untuk mengalihkan (*redirect 301/308*) pembaca ke slug terbaru.
- **FR-LNK-003 (Penanganan Deep Link & Halaman Tidak Tersedia):** Jika deep link merujuk ke halaman/aktivitas yang telah dihapus atau tidak lagi tersedia pada versi terbit aktif, sistem wajib menampilkan halaman penjelasan ramah pengguna yang informatif (menjelaskan bahwa halaman asal tidak lagi tersedia) disertai tautan alternatif ke beranda buku bila buku masih terbit aktif. Jika administrator telah menetapkan tujuan pengganti eksplisit (*explicit fallback target*), sistem menampilkan rekomendasi tujuan pengganti tersebut dan mengharuskan pembaca memilih/mengklik secara sadar (*explicit user choice*), tanpa pengalihan otomatis diam-diam (*no silent redirect*). Tujuan pengganti wajib berupa entitas internal yang sah dan berstatus aktif; sistem memvalidasi konfigurasi pengganti agar tidak membentuk rantai pengalihan melingkar (*redirect cycles*).
- **FR-LNK-004 (QR Code Statis):** Generator QR code statis menghasilkan gambar kode matriks yang langsung mengkodekan URL lengkap buku terbit.
- **FR-LNK-005 (QR Code Dinamis, Integritas Target & Audit):** QR code dinamis mengarah ke URL perantara `/q/:shortCode`. Admin dapat mengalihkan target QR dinamis kapan saja secara fleksibel ke buku, bab, atau aktivitas lain yang berstatus terbit sah tanpa mengubah cetakan fisik QR. Setiap perubahan target tujuan dicatat lengkap dalam audit log. Sistem memvalidasi ketiadaan siklus pengalihan internal dan secara tegas menolak pemindaian apabila buku target sedang dalam status ditarik (Unpublish) atau dicabut darurat (Emergency Revoke), sehingga QR tidak dapat dijadikan jalan pintas (*bypass*) terhadap status penarikan publikasi.
- **FR-LNK-006 (Larangan Mutlak Redirect Eksternal):** Sistem menolak secara tegas konfigurasi target QR dinamis yang mengarah ke domain luar/situs eksternal demi keamanan siswa.
- **FR-LNK-007 (Ekspor Kualitas Tinggi):** QR Code dapat diunduh dalam format PNG dan SVG resolusi tinggi dengan zona tenang (*quiet zone*) dan rasio kontras yang telah tervalidasi agar mudah dipindai kamera gawai.
- **FR-LNK-008 (Statistik Agregat Harian Non-Invasif):** Pemindaian QR dinamis hanya mencatat agregat total pemindaian harian (zona waktu `Asia/Jakarta`) berupa counter numerik (`successful_accesses`, `failed_accesses`). Sistem dilarang keras menyimpan alamat IP, koordinat GPS, peramban fingerprint, atau identitas siswa pada log QR.

### 7.11 Modul 11: Manajemen Media & Aset (FR-MED)

- **FR-MED-001 (Penyimpanan Media Hybrid & Objek Immutable):** Media yang diunggah saat penyuntingan draf disimpan pada bucket Supabase Storage berstatus privat. Sebelum versi buku diaktifkan ke publik, seluruh file fisik biner media yang diperlukan wajib dipastikan telah benar-benar tersedia pada lokasi penyimpanan terbit (dapat melalui penyalinan file biner atau deduplikasi berbasis hash terhadap objek terbit yang sudah ada). Snapshot publikasi menyimpan referensi stabil menuju objek terbit yang telah diverifikasi keberadaan dan integritasnya; objek media terbit bersifat *immutable* dan dilarang ditimpa secara diam-diam oleh perubahan media draf. Kegagalan penyalinan, deduplikasi, atau verifikasi aset fisik wajib membatalkan aktivasi publikasi tanpa menghasilkan snapshot dengan media rusak.
- **FR-MED-002 (Deduplikasi Aset Identik):** Media yang diunggah diproses menggunakan penghitungan hash konten (SHA-256) untuk mencegah duplikasi penyimpanan file yang sama persis di peladen storage.
- **FR-MED-003 (Retensi Media Terikat Snapshot Historis & Sesi):** Seluruh file fisik media yang direferensikan oleh snapshot publikasi (baik versi terbit yang sedang aktif maupun versi historis yang masih dipertahankan) serta media yang diperlukan oleh sesi pengerjaan siswa aktif wajib dilindungi secara mutlak dari penghapusan permanen storage (*reference counting protection*). Penghapusan aset media fisik hanya diizinkan apabila hasil audit dependensi membuktikan bahwa tidak ada lagi versi snapshot aktif, snapshot historis sah, atau riwayat sesi pengerjaan yang mereferensikannya, sejalan dengan prinsip retensi snapshot A3.

---

## 8. Kebutuhan Nonfungsional (Non-Functional Requirements)

### 8.1 Kinerja dan Waktu Tanggap (NFR-PERF)
- **NFR-PERF-001 (Waktu Muat Reader - Target Pengujian):** Pada pengujian laboratorium dengan kondisi jaringan seluler 4G standar (latensi ~100ms, kecepatan unduh ~10Mbps) dan beban konten halaman teks proporsional (di bawah 1,5 MB total aset gambar terkompresi), antarmuka Reader ditargetkan mampu merender konten teks inti dan tata letak awal (First Contentful Paint) dalam waktu kurang dari 2,5 detik. Metrik diukur menggunakan automated browser audit (Lighthouse/WebPageTest) sebagai tolok ukur kinerja yang dapat diuji (*testable target*).
- **NFR-PERF-002 (Non-blocking Autosave):** Operasi penyimpanan otomatis draf (*debounced autosave*) pada antarmuka editor wajib dijalankan secara asinkron (*background worker/fetch*) dan tidak boleh menyebabkan pembekuan (*UI freezing*) atau penurunan responsivitas pengetikan pada thread utama peramban admin.
- **NFR-PERF-003 (Efisiensi Pengalihan Tautan Singkat):** Penanganan pengalihan rute deep link dan QR Code dinamis (`/q/:shortCode`) dirancang dengan efisiensi tingkat Edge/CDN Cloudflare untuk meminimalkan waktu pemrosesan sebelum mengembalikan respons pengalihan (respons pengalihan HTTP diarahkan selesai secara realistis dalam waktu respons jaringan standar).
- **NFR-PERF-004 (Efisiensi Transaksi Publikasi):** Transaksi atomik penerbitan buku (*publish transaction*) di sisi backend PostgreSQL ditargetkan menyelesaikan penulisan snapshot dan peralihan pointer versi dalam waktu kurang dari 3,0 detik untuk buku berukuran standar hingga 50 halaman.

### 8.2 Keamanan dan Otorisasi (NFR-SEC)
- **NFR-SEC-001 (RLS Default Deny):** Seluruh tabel pada skema basis data wajib menerapkan kebijakan Row Level Security (RLS) dengan postur awal *Default Deny* bagi peran publik/anon.
- **NFR-SEC-002 (Kerahasiaan Kunci Layanan):** Token `service_role` Supabase dilarang keras disertakan dalam kode sisi klien (bundle JavaScript frontend). Seluruh operasi berhak istimewa wajib dijalankan melalui Supabase Edge Functions terautentikasi.
- **NFR-SEC-003 (Enkripsi Transit & Penyimpanan):** Seluruh komunikasi data wajib menggunakan protokol TLS 1.3. Kredensial dan data sensitif dienkripsi saat diam (*at rest*).
- **NFR-SEC-004 (Isolasi Skema Sensitif):** Kunci jawaban kuis, fungsi penilaian, dan audit log disimpan pada skema basis data `private` yang terisolasi total dari Supabase PostgREST Data API publik.
- **NFR-SEC-005 (Mitigasi Serangan Web):** Aplikasi wajib dilengkapi Content Security Policy (CSP), proteksi Cross-Site Scripting (XSS), mitigasi Clickjacking via frame restrictions, dan sanitasi input ketat.
- **NFR-SEC-006 (Perlindungan Beban & Pembatasan Laju Berlapis):** Arsitektur keamanan menerapkan pembatasan laju (*rate limiting*) berlapis: perlindungan trafik DDoS di tingkat Edge oleh Cloudflare, validasi payload dan throttling pada Supabase Edge Functions, serta constraint kuota bisnis di tingkat PostgreSQL. Pembatasan pada tingkat Cloudflare tidak boleh dianggap cukup untuk melindungi panggilan langsung ke endpoint Supabase; seluruh endpoint API publik Supabase (pencatatan jawaban, sesi, pemindaian QR) wajib memiliki mekanisme otorisasi dan kontrol frekuensi permintaan mandiri.
- **NFR-SEC-007 (Hak Eksekusi & Pengamanan Search Path Database):** Seluruh fungsi PostgreSQL yang bersifat *privileged* (`SECURITY DEFINER`) wajib menerapkan prinsip *least privilege* dan pengamanan jalur resolusi objek secara ketat. Fungsi privileged dilarang menyertakan skema yang dapat ditulis oleh peran tidak tepercaya pada `search_path`. Praktik pengamanan yang ditegakkan adalah menggunakan `SET search_path = ''` (kosong) dengan seluruh pemanggilan tabel, view, dan fungsi internal ditulis secara berkualifikasi skema eksplisit (*fully schema-qualified identifiers*, misal: `public.books`, `private.grading_keys`), atau membatasi `search_path` hanya pada skema sistem tepercaya tanpa melibatkan skema publik sembarang atau `pg_temp` yang rentan terhadap pembajakan resolusi objek (*search_path hijacking*). Hak `EXECUTE` dibatasi secara eksplisit hanya untuk peran database berwenang, dan hak `CREATE` pada skema database dibatasi ketat guna mencegah pembuatan objek tiruan berbahaya. Data kunci jawaban, fungsi penilaian, dan identitas siswa tidak boleh terekspos melalui PostgREST Data API publik.

### 8.3 Aksesibilitas dan Ramah Anak (NFR-ACC)
- **NFR-ACC-001 (Kepatuhan WCAG):** Seluruh antarmuka pembaca (Reader) wajib memenuhi kriteria kepatuhan minimal **WCAG 2.1 Level AA**, terutama dalam rasio kontras teks (minimal 4.5:1 untuk teks normal).
- **NFR-ACC-002 (Navigasi Keyboard Mandiri):** Seluruh alur membaca buku, membuka daftar isi, dan menjawab kuis interaktif wajib dapat dioperasikan secara penuh hanya menggunakan papan ketik (*keyboard-only navigable*).
- **NFR-ACC-003 (Target Sentuh Ramah Anak):** Elemen interaktif pada Reader (tombol navigasi, kartu pilihan, kontrol suara) memiliki luas area sentuh minimal 44x44 CSS pixels guna mengakomodasi motorik anak usia sekolah dasar.
- **NFR-ACC-004 (Dukungan Pembaca Layar):** Seluruh gambar wajib memiliki bidang pengisian teks alternatif (*alt text*), dan komponen interaktif dilengkapi label ARIA yang memadai.

### 8.4 Keandalan, Ketersediaan & Integritas (NFR-REL)
- **NFR-REL-001 (Integritas Transaksi):** Operasi penerbitan buku, penarikan publikasi, dan rollback wajib mengimplementasikan transaksi atomik ACID pada PostgreSQL.
- **NFR-REL-002 (Idempotensi Komunikasi):** Endpoint penyerahan jawaban siswa wajib mendukung header idempoten (`Idempotency-Key`) untuk mencegah penghitungan ganda akibat *double-submit* atau gangguan jaringan.
- **NFR-REL-003 (Pencadangan Menyeluruh & Pemulihan Bencana):** Sistem wajib menyediakan strategi pencadangan menyeluruh (*hybrid backup*) yang mencakup: (a) data relasional dan skema database; (b) file fisik media sebenarnya (*actual binary files*) pada storage secara utuh, bukan sekadar metadata atau tautan referensi; (c) integritas pemetaan antara snapshot historis dan aset media terkait; (d) penyimpanan salinan cadangan pada lokasi terpisah yang aman; (e) pencadangan manual wajib sebelum operasi berisiko tinggi; (f) pencadangan terjadwal apabila kemampuan infrastruktur mengizinkan; serta (g) prosedur pengujian pemulihan (*restore test*) berkala untuk memverifikasi keutuhan sistem hasil pemulihan. Sistem tidak boleh mengasumsikan paket gratis Supabase otomatis menyediakan backup terjadwal atau Point-in-Time Recovery.

### 8.5 Efisiensi Biaya Operasional (NFR-CST)
- **NFR-CST-001 (Optimasi Kuota Paket Gratis & Pemantauan Kapasitas):** Desain skema data, struktur serialisasi JSONB, dan siklus hidup aset dioptimalkan secara terukur untuk beroperasi dalam batas paket gratis penyedia layanan. Pengukuran kuota dipisahkan secara tegas berdasarkan metrik penyedia: kapasitas database (target awal < 500 MB), kapasitas penyimpanan file Storage (target awal < 1 GB), bandwidth keluar/egress, frekuensi pemanggilan Edge Functions, serta batas waktu build/hosting Cloudflare Pages. Dashboard admin wajib menyediakan visualisasi pemantauan penggunaan kuota dan peringatan proaktif sebelum ambang batas kritis tercapai. Seluruh besaran batas kuota wajib diverifikasi ulang melalui dokumentasi resmi mutakhir sebelum peluncuran sistem.
- **NFR-CST-002 (Ketiadaan Eskalasi Biaya Otomatis):** Target biaya operasional awal Rp0 dipertahankan secara ketat. Sistem dilarang memicu upgrade akun berbayar otomatis (*no automatic paid tier escalation*). Setiap perubahan arsitektur atau keputusan yang berpotensi menimbulkan biaya keuangan wajib memperoleh persetujuan eksplisit dari pemilik proyek sebelum dieksekusi.

---

## 9. Siklus Hidup Buku dan Publikasi

Siklus hidup konten di dalam Flipbook Studio memisahkan secara tegas antara status kerja penyusunan (*drafting*) dan status konsumsi publik (*published snapshot*):

```
+-------------------------------------------------------------------------------+
|                            SIKLUS HIDUP BUKU                                  |
+-------------------------------------------------------------------------------+
                                        |
                                        v
                               [ 1. DRAFT AKTIF ]
                                        |
       +--------------------------------+-------------------------------+
       |                                                                |
       v                                                                v
[ Auto-save Draf ]                                            [ Pratinjau Editor ]
(Revisi Relasional)                                           (Quick & Fullscreen)
       |                                                                |
       +--------------------------------+-------------------------------+
                                        |
                                        v
                       [ 2. WIZARD PUBLIKASI 5 TAHAP ]
                       - Validasi 1: Kelengkapan Konten
                       - Validasi 2: Konfigurasi Kuis
                       - Validasi 3: Kompatibilitas Tema
                       - Validasi 4: Pengaturan Slug & Akses
                       - Validasi 5: Konfirmasi Akhir
                                        |
                      [ Status: Lulus / Peringatan ]
                         (Jika Error -> Ditolak)
                                        |
                                        v
                   [ 3. PEMBENTUKAN SNAPSHOT IMMUTABLE ]
                   - Serialisasi Halaman ke JSONB
                   - Pinning Versi Kuis & Bobot
                   - Duplikasi Referensi Aset Media
                                        |
                                        v
                    [ 4. ATOMIC ACTIVATION TRANSAKSI ]
                    - books.active_version_id diupdate
                    - Slug alias lama dicatat
                    - Audit log penerbitan ditulis
                                        |
       +--------------------------------+-------------------------------+
       |                                                                |
       v                                                                v
[ 5A. BUKU TERBIT AKTIF ]                                     [ 5B. DRAFT VERSI BARU ]
(Diakses Pembaca Publik)                                      (Diedit Admin Mandiri)
       |                                                                |
       +----------------------------------------------------------------+
                                        |
               +------------------------+------------------------+
               |                        |                        |
               v                        v                        v
      [ UNPUBLISH BUKU ]       [ EMERGENCY REVOKE ]         [ ROLLBACK ]
      (Tindakan Terpisah)      (Tindakan Terpisah)          (Tindakan Terpisah)
      - Default: Grace period  - Akses publik distop       - Pointer versi
        percobaan aktif          di gateway                  dialihkan atomik
        selesai; baru ditolak  - Sesi aktif ditolak          ke snapshot lama
      - Opsi Admin: Immediate  - Tanpa nilai nol auto      - Validasi integritas
        block (stop jawaban)   - Data historis aman          snapshot & aset
      - Data historis aman     - Audit log ditulis         - Audit log ditulis
```

### 9.1 Rincian Transisi Status:
1. **Draf Baru:** Dibuat dengan `active_version_id = NULL`. Konten tersimpan dalam tabel relasional normalisasi (`draft_pages`, `draft_components`).
2. **Penerbitan:** Wizard validasi memeriksa seluruh persyaratan. Jika validasi berstatus *Lulus*, peladen membentuk baris baru di `book_versions` berisi snapshot utuh dan memindahkan pointer `books.active_version_id` ke baris baru tersebut secara atomik.
3. **Penyuntingan Pasca-Terbit:** Administrator bebas mengubah tabel draf. Perubahan draf tidak memengaruhi snapshot aktif yang sedang dibaca pembaca sampai admin menerbitkan kembali sebagai versi baru (misal v2).
4. **Pencabutan Akses (Unpublish):** Pointer `books.active_version_id` dikosongkan (`NULL`), status publikasi buku beralih ke non-aktif. Administrator menetapkan kebijakan bagi percobaan yang sedang berjalan (default: mengizinkan siswa menyelesaikan percobaan aktif hingga batas waktu sesinya berakhir tanpa izin pendaftaran sesi baru). Hasil historis dan snapshot versi tetap aman tersimpan.
5. **Pencabutan Darurat (Emergency Revoke):** Digunakan bila ditemukan pelanggaran kritis atau kebocoran materi. Sistem secara instan menolak seluruh otorisasi permintaan publik baru di tingkat backend gateway, memblokir interaksi aktivitas yang sedang berjalan, dan mencegah finalisasi nilai yang tidak sah tanpa menghapus data historis maupun memberi nilai nol otomatis. Kebijakan ini menegakkan pencabutan akses di peladen dan memicu invalidasi cache yang dapat dikendalikan.
6. **Rollback:** Jika versi terbaru memiliki kesalahan materi, admin dapat memilih versi publikasi masa lalu yang tersimpan di `book_versions` untuk diaktifkan kembali secara instan melalui transaksi atomik baru.

---

## 10. Prinsip Privasi dan Perlindungan Data Anak

Sistem menerapkan filosofi **Privacy by Design** dan perlindungan ketat terhadap anak di bawah umur (mempertimbangkan prinsip umum regulasi pelindungan data pribadi yang berlaku, termasuk UU Pelindungan Data Pribadi Indonesia dan standar perlindungan privasi anak internasional, tanpa membuat klaim kepatuhan hukum sepihak sebelum diverifikasi secara formal):

1. **Prinsip Tanpa Kewajiban Akun (Zero-Account Requirement):** Pembaca tidak dibebani kewajiban mendaftarkan email, nomor telepon, kata sandi, atau akun media sosial pihak ketiga.
2. **Pengumpulan Data Bersyarat & Terbatas (Data Minimization):** Data nama dan identitas kelas pembaca hanya diminta jika pembaca secara sadar memulai aktivitas pembelajaran/kuis yang hasilnya dipantau guru/admin. Membaca buku murni bersifat 100% tanpa identitas.
3. **Data Bersifat Self-Reported:** Identitas yang dimasukkan siswa dianggap sebagai data laporan mandiri tidak terverifikasi. Sistem tidak melakukan verifikasi identitas kependudukan resmi.
4. **Ketiadaan Pelacakan Invasif (No Behavioral Trackers):** Platform dilarang memasang tag pelacak iklan komersial (Google Analytics pihak ketiga komersial, Facebook Pixel, fingerprinting skrip).
5. **Isolasi Token Sesi Siswa & Hash Storage:** Token sesi pembaca dibuat acak melalui algoritma *cryptographically secure pseudorandom number generator* (CSPRNG) di peramban. Peladen hanya menyimpan hasil hash SHA-256 dari token tersebut untuk validasi otorisasi. Token mentah tidak pernah disimpan di database, memitigasi risiko kebocoran sesi dari sisi backend.
6. **Kebijakan Kedaluwarsa Sesi:** Setiap token sesi memiliki masa berlaku (*expiry time*) yang ditentukan backend. Sesi kedaluwarsa secara otomatis ditolak untuk pengiriman data baru.
7. **Pemberitahuan Privasi Bahasa Ramah Anak:** Saat memasukkan nama dan kelas untuk kuis, sistem menampilkan pemberitahuan privasi singkat dengan bahasa sederhana: *"Nama dan kelasmu hanya digunakan agar gurumu dapat melihat nilaimu. Data ini tidak dibagikan ke orang lain."* Apabila diwajibkan oleh regulasi, sistem menyediakan kotak persetujuan (*consent checkbox*) yang jelas.
8. **Pembersihan Sesi di Perangkat Laboratorium:** Fitur "Ganti Pembaca" menjamin token sesi, riwayat pengerjaan lokal, dan cache data pembaca sebelumnya dihapus secara tuntas dari penyimpanan lokal peramban (`localStorage`/`sessionStorage`) ketika seorang siswa selesai menggunakan komputer laboratorium sekolah bersama.
9. **Pemisahan Retensi Data Pribadi Siswa:** Administrator memiliki hak menghapus data hasil kuis dan identitas siswa secara massal (*bulk delete*) atau berdasarkan batas waktu retensi tertentu tanpa merusak struktur materi buku, relasi aset, atau snapshot publikasi.
10. **Akses Terbatas terhadap Hasil Siswa:** Data lembar jawaban dan skor siswa hanya dapat diakses oleh administrator terotentikasi melalui antarmuka admin terlindungi atau oleh pembaca pemilik token sesi yang valid sebelum masa sesi berakhir. Endpoint publik dilarang menyajikan rekap data nilai siswa secara terbuka.

---

## 11. Prinsip Keamanan dan Otorisasi

Flipbook Studio menegakkan kontrol keamanan data berlapis (*defense-in-depth*):

```
+-------------------------------------------------------------------------------+
|                        LAPISAN KEAMANAN APLIKASI                              |
+-------------------------------------------------------------------------------+

[ LAPISAN 1: EDGE & NETWORK ]
  - Cloudflare Pages (DDoS Mitigation, TLS 1.3 Termination)
  - Content Security Policy (CSP) & Frame-Ancestors Header
  - Edge Rate Limiting pada Endpoint Publik

[ LAPISAN 2: GATEWAY & BACKEND ]
  - Supabase Edge Functions (Deno Runtime)
  - Otentikasi Administrator via Supabase Auth JWT
  - Sanitasi Input Payload & Validasi Skema Zod
  - Token Sesi Pembaca (Validasi Hash SHA-256)
  - Tanpa service_role key di sisi Klien Frontend

[ LAPISAN 3: DATABASE POSTGRESQL HYBRID ]
  - Skema 'auth': Dikelola Supabase (Hanya Admin)
  - Skema 'public': RLS Default Deny (Akses Read-Only Terbatas untuk Snapshot)
  - Skema 'private': Terisolasi Total dari Data API
    * Kunci Jawaban Kuis & Mesin Penilaian (Grading Secrets)
    * Audit Logs & Token Verifier
    * PostgreSQL Functions & Stored Procedures (SECURITY DEFINER, search_path aman)
```

1. **Arsitektur Database Hybrid Tiga Skema:**
   - `auth`: Menampung kredensial login admin tunggal.
   - `public`: Menampung tabel draf, metadata buku, dan tabel snapshot terbit yang dilindungi kebijakan RLS ketat. Peran `anon` hanya memiliki izin `SELECT` pada data buku dan halaman yang terhubung ke `active_version_id`.
   - `private`: Menampung tabel sensitif yang tidak dapat diakses melalui Supabase PostgREST API (misal: kunci jawaban, bobot nilai, audit log, data sesi ber-hash).
2. **Penilaian di Peladen (Server-Authoritative Scoring):**
   - Kunci jawaban disimpan secara eksklusif di skema `private`.
   - Pembaca mengirimkan lembar jawaban ke Supabase Edge Function terautentikasi.
   - Edge Function mengeksekusi penilaian melalui PostgreSQL Function di skema privat dan mengembalikan skor akhir serta token hasil yang telah difinalisasi.
3. **Pencegahan Eksfiltrasi Data & Pengamanan Search Path:**
   - Kunci API `service_role` hanya digunakan secara internal di dalam Supabase Edge Functions yang aman dan tidak pernah dikirimkan ke peramban.
   - Seluruh fungsi database privileged (`SECURITY DEFINER`) wajib menetapkan pengamanan `search_path` eksplisit (misal: `SET search_path = ''` dengan nama objek berkualifikasi skema penuh) dan membatasi hak `CREATE` pada skema untuk menangkal eskalasi hak istimewa atau pembajakan resolusi objek via `pg_temp`. Hak `EXECUTE` dibatasi hanya kepada peran database yang sah.
   - PostgREST Data API hanya membuka tabel publik yang diberi izin via RLS, sementara skema `private` (kunci grading, audit logs, hash token verifier) tidak dipetakan ke API.
   - Pembatasan laju (*rate limiting*) diterapkan berlapis: di tingkat Edge oleh Cloudflare dan secara mandiri di tingkat Edge Functions / Database Constraints untuk mencegah eksfiltrasi atau penolakan layanan (*denial of service*).
   - Constraint integritas database (Foreign Keys, Check Constraints, Unique Constraints, Triggers) menjadi benteng pertahanan terakhir yang menjamin tidak ada data korup yang masuk sekalipun lapisan aplikasi mengalami anomali.

---

## 12. Prinsip Integritas Data dan Versioning

1. **Immutability of Published Snapshots:** Sekali sebuah versi diterbitkan ke tabel `book_versions`, baris snapshot tersebut bersifat *read-only* dan tidak boleh diubah (*immutable*). Perbaikan materi dilakukan dengan membuat draf baru dan menerbitkan versi suksesor.
2. **Kebijakan Retensi Snapshot Publikasi & Aset Terkait (A3):** Secara default, seluruh snapshot publikasi historis dipertahankan utuh dalam database untuk menjamin integritas referensi aktivitas dan audit jejak materi. Perlindungan integritas ini mencakup perlindungan mutlak terhadap seluruh file fisik media yang direferensikan oleh snapshot publikasi historis yang dipertahankan maupun sesi pengerjaan siswa yang sah. Penghapusan snapshot atau aset media terkait secara permanen dilarang keras dijadikan strategi utama penghematan kapasitas; penghapusan hanya diizinkan melalui evaluasi dependensi mendalam (memastikan tidak ada sesi aktivitas siswa aktif maupun historis, referensi aset media, atau audit log yang bergantung padanya). Retensi snapshot konten dan aset media dikelola secara independen dan terpisah dari retensi data pribadi hasil kuis siswa.
3. **Stable Identifiers:** Seluruh entitas struktural mengandalkan UUID unik yang persisten. Referensi antarhalaman (tautan internal daftar isi atau tombol loncat) disimpan menggunakan UUID halaman tujuan, bukan nomor urut halaman yang rentan bergeser saat ada penambahan halaman baru.
4. **Referential Integrity on Deletion:** Penghapusan buku atau halaman pada tingkat draf tidak diperkenankan menghapus rekaman snapshot historis yang masih aktif atau rekaman hasil nilai siswa yang telah tersimpan (*soft-delete* atau *restricted foreign key constraints*).
5. **Optimistic Concurrency Control Berbasis Revisi (A10):** Tabel draf mengimplementasikan kolom integer `revision`. Setiap operasi pembaruan memeriksa kesamaan nomor revisi (`WHERE revision = :expected_revision`). Jika terjadi ketidakcocokan, pembaruan ditolak (*no silent overwrite*), perubahan lokal diamankan, dan editor memicu proses rekonsiliasi visual. Penggabungan otomatis hanya diizinkan untuk atribut non-struktural yang tidak bertabrakan semantik.
6. **Idempotency on Critical Endpoints:** Endpoint publik krusial (mulai aktivitas, kirim jawaban kuis, finalisasi nilai) wajib menerima header `Idempotency-Key` dari klien guna menangkal anomali jaringan pengiriman berulang (*duplicate submission*).

---

## 13. Strategi MVP dan Fase Pengembangan

Pengembangan platform dibagi menjadi fase-fase terstruktur dengan prinsip utama yang tidak boleh ditawar: **Setiap fitur yang masuk MVP wajib disertai kontrol keamanan, integritas data, dan penanganan kegagalan minimum yang diperlukan untuk menjalankan fitur tersebut dengan aman.** Kontrol fondasi (seperti backend-only scoring, timer otoritatif backend, idempotency, optimisic locking, isolasi skema privat, dan perlindungan hasil historis saat unpublish) wajib hadir sejak hari pertama fitur terkait diaktifkan, bukan ditunda ke fase lanjutan.

Pembagian fase berikut memisahkan antara **Fitur Wajib MVP**, **Fitur Penguatan (Fase 2)**, dan **Fitur Penyempurnaan (Fase 3)** sebagai usulan prioritas pengerjaan teknis yang tunduk pada persetujuan pemilik proyek:

| Domain Modul | Fase 1: MVP (Wajib dengan Kontrol Keamanan & Integritas Penuh) | Fase 2: Penguatan Pembelajaran & QR Lanjutan (Usulan) | Fase 3: Lanjutan & Penyempurnaan (Usulan) |
|---|---|---|---|
| **Manajemen Buku** | Pembuatan buku, metadata, struktur campuran halaman mandiri dan bab (maks 2 tingkat: Bab > Halaman), Stable IDs unik, penanganan tautan halaman terhapus informatif | Fasilitas akselerasi penyusunan modul: template buku, template halaman, dan kemampuan duplikasi modul antarbuku (template merupakan fasilitas percepatan, bukan prasyarat pembuatan halaman mandiri) | Ekspor arsip buku terstandarisasi (ZIP/JSON) |
| **Editor Visual** | Editor 3-panel adaptif, Mode Blok, nesting maks 3 tingkat, autosave debounced + optimistic revision lock, sanitasi rich-text, allowlist embed | Mode Tata Letak Bebas Terbatas (Grid Responsif), multi-breakpoint preview | Pintasan keyboard tingkat lanjut, riwayat revisi draf mendalam |
| **Pustaka Komponen** | Heading, Paragraf, Gambar, Video allowlist, Kolom, Card, Pilihan Ganda, Benar/Salah, Isian Singkat (dengan validasi skema ketat dan aksesibilitas dasar) | Galeri gambar, Audio pembelajaran, Multi-respon, Mencocokkan, Mengurutkan, Hotspot, Flashcard | Dokumen PDF tersemat, Refleksi mandiri, Drag-and-drop interaktif alternatif aksesibel |
| **Sistem Tema** | Preset Minimal & Alam, pewarisan token tema global ke komponen, reset override ke token induk, rasio kontras memadai | Preset Samudra & Hangat, kustomisasi palet warna semantik | Ekspor/impor preset tema kustom |
| **Publikasi** | Wizard 5 tahap, snapshot JSONB immutable, aktivasi atomik, kebijakan Unpublish (default grace period + opsi immediate block), Emergency Revoke dengan invalidasi cache peladen, rollback versi dasar atomik berbasis verifikasi dependensi snapshot, pencatatan alias slug lama | Pengelolaan riwayat versi terbit mendalam, peninjauan perbandingan snapshot antarversi | Rollback versi tingkat lanjut dengan perbandingan visual diff perubahan antarkomponen |
| **Reader** | Halaman pembuka mandiri, mode scroll vertikal & flipbook dua halaman desktop dengan fallback cerdas, laci TOC otomatis, progres baca lokal, tombol Ganti Pembaca pembersih sesi lokal, kepatuhan aksesibilitas dasar (navigasi keyboard penuh, target sentuh minimal 44x44px, alt-text, label ARIA, preferensi reduced motion, pembacaan tanpa animasi flipbook, kontras tinggi, penyesuaian ukuran font) | Penyempurnaan pengalaman aksesibilitas tingkat lanjut, responsive drawer TOC kustom | Mode membaca lokal offline via Service Worker / PWA |
| **Aktivitas & Kuis** | Sesi identitas minimal (nama/kelas self-reported), token CSPRNG ber-hash SHA-256, backend-only scoring (kunci di private schema), server timer UTC + auto-finalize on-access, idempotency header | Konfigurasi multi-percobaan (1/N/tanpa batas), agregasi skor (tertinggi/terakhir), manual retry grant via kode sekali pakai berbatas waktu | Analitik sebaran butir soal & visualisasi distribusi skor kelas |
| **Tautan & QR** | Stable deep link (`/b/:slug/p/:id`), penanganan alias slug lama, halaman fallback informatif non-redirect diam-diam, QR statis PNG/SVG | QR dinamis (`/q/:code`), redirect alias teruji, larangan mutlak redirect eksternal, statistik agregat harian Asia/Jakarta non-PII | Manajemen multi-QR batch, laporan pemindaian tercetak |
| **Backup & Keamanan** | Prosedur backup manual data database + file fisik media sebenarnya, RLS default deny, fungsi privileged dengan search_path aman, rate limiting mandiri pada API Supabase, pemantauan kapasitas dasar (indikator kuota DB, storage, estimasi egress, peringatan ambang batas kuota gratis) | Skrip otomasi pencadangan mandiri terjadwal, visualisasi tren penggunaan kuota historis pada dashboard admin | Pengujian restore otomatis berkala pada lingkungan staging terisolasi |

---

## 14. Non-Goals dan Batasan Produk

Untuk menjaga fokus rekayasa dan efisiensi biaya, batasan berikut ditetapkan secara tegas:
- **Bukan Sistem Manajemen Pembelajaran (LMS) Lengkap:** Flipbook Studio tidak bertujuan menggantikan Moodle atau Google Classroom; tidak ada fitur penugasan pekerjaan rumah bertenggat rumit, absensi harian, atau forum antar-siswa.
- **Bukan Pengolah Kata / Desktop Publishing Bebas:** Canvas editor tidak mengizinkan penempatan elemen secara acak dengan koordinat piksel absolut mengambang (*freehand floating elements*), karena pendekatan tersebut terbukti merusak layout responsif di gawai seluler.
- **Bukan Toko Buku Digital Komersial:** Tidak menyediakan etalase publik terintegrasi payment gateway, langganan berbayar pembaca, atau sistem perlindungan DRM yang membatasi hak baca pembaca publik.
- **Ketiadaan Verifikasi Identitas Formal:** Data siswa bersifat laporan mandiri; sistem tidak bertanggung jawab atas ketidaksesuaian nama yang diinputkan siswa pada saat memulai kuis.

---

## 15. Asumsi Operasional dan Ketergantungan Eksternal

### 15.1 Asumsi Operasional
- **Admin Tunggal:** Seluruh manajemen buku dan administrasi sistem dijalankan oleh satu pemilik akun administrator tepercaya.
- **Konektivitas Internet Pembaca:** Pembaca diasumsikan memiliki sambungan internet aktif saat membuka buku dan mengirimkan jawaban kuis (fitur offline penuh merupakan kandidat fase lanjutan).
- **Peramban Modern:** Peramban pembaca mendukung standar web modern (ES6, Web Storage API, Fetch API, CSS Grid, Flexbox) seperti Google Chrome, Safari, Edge, dan Firefox versi mutakhir.

### 15.2 Ketergantungan Layanan Pihak Ketiga (Eksternal)
- **Supabase Cloud:** Database PostgreSQL, Auth, Edge Functions, dan Storage. Catatan: Paket gratis tidak menyediakan backup terjadwal otomatis berkala atau Point-in-Time Recovery; pencadangan mandiri wajib disiapkan oleh pengelola sistem.
- **Cloudflare Pages:** Hosting statis frontend React+Vite dan pengelolaan DNS/Edge Caching.
- **GitHub:** Penyimpanan kode sumber terkelola dan pemicu alur CI/CD Cloudflare Pages.

---

## 16. Risiko Produk dan Mitigasi

| Kode Risiko | Deskripsi Risiko | Dampak | Tingkat | Strategi Mitigasi Terencana |
|---|---|---|---|---|
| **RSK-001** | Akumulasi snapshot versi lama dan pertumbuhan file media mendekati batas kuota paket gratis penyedia layanan | Sistem menolak penulisan data baru atau terhenti | 🔴 Tinggi | Terapkan pengukuran kuota akurat, kompresi serialisasi JSONB snapshot, deduplikasi aset berbasis hash konten, peringatan kapasitas proaktif pada dashboard admin, dan pengendalian pertumbuhan data. Default seluruh snapshot dipertahankan; penghapusan hanya diizinkan melalui audit dependensi ketat (bukan sebagai strategi utama penghematan). |
| **RSK-002** | Konflik antara pustaka animasi pembalikan halaman flipbook dengan komponen interaktif kuis | Tampilan kuis terdistorsi atau event drag/touch macet | 🟡 Sedang | Evaluasi ketat pustaka flipbook pada Fase 0/1; jika halaman memuat komponen interaktif atau dimensi vertikal panjang, otomatis beralih (*fallback*) ke mode baca scroll terpadu. |
| **RSK-003** | Eksekusi transaksi publikasi (*atomic publish*) memakan waktu lama saat buku memiliki puluhan halaman | Timeout pada transaksi database atau HTTP gateway | 🟡 Sedang | Klien hanya mengirimkan permintaan publikasi dan ID revisi draf yang diharapkan; backend memverifikasi otorisasi admin, memeriksa bahwa draf yang akan diterbitkan identik dengan revisi yang lolos validasi wizard, serta merakit dan memverifikasi snapshot final secara otoritatif dari data draf tepercaya di peladen (termasuk sanitasi konten, validasi dependensi aset fisik, dan pemisahan grading secrets). Aktivasi pointer versi dilakukan via transaksi PostgreSQL atomik; jika revisi berubah atau aset belum lengkap, publikasi dibatalkan tanpa mengubah versi aktif. |
| **RSK-004** | Upaya manipulasi kunci jawaban oleh pembaca yang mahir teknis melalui inspeksi jaringan peramban | Integritas penilaian ujian rusak | 🟡 Sedang | Terapkan *backend-only scoring*; kunci jawaban tidak pernah dikirim ke klien sebelum kebijakan pengungkapan mengizinkan. |
| **RSK-005** | Siswa berbagi satu komputer laboratorium tanpa menghapus data pengerjaan siswa sebelumnya | Jawaban siswa baru tercampur dengan siswa sebelumnya | 🟡 Sedang | Sediakan tombol "Ganti Pembaca" yang mencolok di halaman pembuka dan header buku, yang membersihkan token sesi dan data lokal saat diklik. |
| **RSK-006** | Pemindaian QR Code cetak gagal terbaca akibat resolusi rendah atau kontras buruk | Pembaca tidak dapat mengakses materi dari buku cetak | 🟢 Rendah | Terapkan generator QR berbasis SVG dengan validasi batas *quiet zone* dan penegakan kontras warna gelap-terang otomatis saat ekspor. |
| **RSK-007** | Kehilangan data atau kegagalan pemulihan akibat ketiadaan backup otomatis bawaan pada paket gratis cloud | Gangguan kontinuitas sistem saat insiden infrastruktur | 🔴 Tinggi | Terapkan prosedur pencadangan mandiri komprehensif (data database dan file biner fisik media sebenarnya) yang disimpan di lokasi terpisah secara aman sebelum rilis produksi. |

---

## 17. Kriteria Penerimaan (Acceptance Criteria)

Berikut adalah kriteria penerimaan terukur yang wajib divalidasi pada pengujian produk:

| ID Kebutuhan | Kode Kriteria | Kriteria Penerimaan (Acceptance Criteria) | Metode Pengujian |
|---|---|---|---|
| **FR-ADM-001** | **AC-ADM-001** | Admin dapat login menggunakan email dan password terdaftar yang sah serta berhasil mendapatkan sesi terautentikasi dan diarahkan ke dashboard admin. Upaya login dengan kredensial salah ditolak secara deterministik dengan pesan kesalahan yang aman tanpa membocorkan eksistensi akun pengguna; sesi logout atau kedaluwarsa tidak lagi memberikan izin akses ke rute/data admin. | Pengujian Fungsional / E2E |
| **FR-BOK-002** | **AC-BOK-001** | Saat halaman dipindahkan antarbab atau diubah urutannya, UUID stable ID halaman tersebut tetap sama dan tautan internal menuju halaman tersebut tidak rusak. | Pengujian Integrasi Database |
| **FR-EDT-005** | **AC-EDT-001** | Editor secara visual dan terprogram menolak penambahan kontainer baru di dalam kontainer yang telah mencapai kedalaman 3 tingkat hierarki. | Pengujian UI Editor / Unit Test |
| **FR-EDT-007** | **AC-EDT-002** | Jika draft yang sama diedit di dua tab peramban terpisah, penyimpanan pada tab kedua akan menampilkan dialog resolusi konflik dan mencegah penimpaan data otomatis tab pertama. | Pengujian Skenario Concurrency |
| **FR-PUB-001** | **AC-PUB-001** | Publikasi buku gagal dan menampilkan pesan kesalahan pemblokir jika terdapat komponen kuis yang belum memiliki kunci jawaban yang valid. | Pengujian Validasi Wizard |
| **FR-PUB-004** | **AC-PUB-002** | Pembaruan `books.active_version_id` dieksekusi dalam satu transaksi atomik. Jika terjadi kegagalan sistem di tengah proses, status versi buku kembali ke versi sebelumnya tanpa korupsi data. | Pengujian Transaksi Database |
| **FR-RDR-001** | **AC-RDR-001** | Membuka URL `/b/:slug` menampilkan halaman pembuka dengan sampul luar, judul buku, deskripsi, dan tombol aksi tanpa melewati halaman secara acak. | Pengujian End-to-End Peramban |
| **FR-RDR-003** | **AC-RDR-002** | Pada layar desktop resolusi lebar (> 1024px), buku dengan konten proporsional dirender dalam mode dua halaman flipbook yang dapat dibalik secara interaktif. | Pengujian Tampilan Responsif |
| **FR-ACT-003** | **AC-ACT-001** | Payload respons API saat pembaca membuka halaman kuis tidak memuat atribut kunci jawaban, bobot tersembunyi, atau pembahasan soal. | Inspeksi Keamanan Jaringan |
| **FR-ACT-005** | **AC-ACT-002** | Pengujian batas waktu membuktikan bahwa batas akhir pengerjaan ditentukan oleh waktu UTC server; jawaban yang dikirimkan setelah tenggat resmi ditolak, sesi yang melewati tenggat secara logis dianggap selesai, dan finalisasi dilakukan secara idempoten (saat akses berikutnya atau via penjadwalan) berdasarkan jawaban sah terakhir sebelum tenggat tanpa penghitungan nilai ganda. | Pengujian Server-Authoritative Timer |
| **FR-LNK-002** | **AC-LNK-001** | Mengakses buku menggunakan URL slug lama berhasil mengarahkan peramban secara otomatis ke URL dengan slug baru yang sah. | Pengujian Routing HTTP Redirect |
| **FR-LNK-006** | **AC-LNK-002** | Upaya menyetel target URL QR dinamis ke domain eksternal (misal: `https://google.com`) ditolak oleh sistem validasi dengan pesan larangan mutlak. | Pengujian Validasi Form QR |
| **FR-MED-003** | **AC-MED-001** | Media gambar yang digunakan oleh snapshot versi buku yang pernah terbit tidak dapat dihapus dari antarmuka pengelola media (*restricted deletion*). | Pengujian Integritas Storage |
| **NFR-SEC-001** | **AC-SEC-001** | Pengujian terhadap data draf yang ada membuktikan bahwa peramban/klien anonim dilarang keras membaca, menambah, mengubah, atau menghapus data draf (`draft_books`, `draft_pages`, `draft_components`) dan data privat lainnya via PostgREST Data API (permintaan ditolak melalui error otorisasi HTTP 401/403 atau respons kosong tanpa kebocoran data terverifikasi sesuai kebijakan RLS default deny). | Pengujian Penetrasi RLS |
| **FR-PUB-006** | **AC-PUB-003** | Saat admin melakukan Unpublish, siswa dengan sesi aktif tetap dapat menyelesaikan hingga tenggat sesi dan nilainya tercatat, sedangkan permintaan mulai sesi baru ditolak HTTP 403/404. | Pengujian Alur Unpublish & Grace Period |
| **FR-PUB-007** | **AC-PUB-004** | Saat Emergency Revoke diaktifkan, backend langsung menolak seluruh permintaan halaman dan operasi aktivitas publik baru; hasil nilai siswa yang telah difinalisasi sebelum waktu pencabutan tetap utuh dan tidak berubah menjadi nol. | Pengujian Simulasi Emergency Revoke |
| **FR-PUB-008** | **AC-PUB-005** | Rollback versi buku berhasil mengarahkan pointer `active_version_id` kembali ke snapshot versi sebelumnya yang sah secara atomik setelah memvalidasi ketersediaan aset media terkait, dan verifikasi tampilan Reader langsung menampilkan materi versi tersebut; percobaan siswa aktif tetap terikat versi aktivitas asalnya. | Pengujian Transaksi Rollback |
| **FR-PUB-003** | **AC-PUB-006** | Uji coba penghapusan rekaman snapshot yang masih dirujuk oleh rekaman percobaan aktivitas atau audit log ditolak oleh constraint integritas relasional database (*restricted foreign key*). | Pengujian Integritas Dependensi Snapshot |
| **NFR-REL-003** | **AC-REL-001** | Prosedur pemulihan (*restore test*) dari salinan cadangan yang memuat dump database dan arsip file fisik media terbukti menghasilkan sistem yang berfungsi penuh dengan seluruh gambar dan snapshot terbit dapat diakses tanpa tautan rusak. | Pengujian Verifikasi Backup & Restore |
| **FR-LNK-003** | **AC-LNK-003** | Mengakses tautan deep link dari halaman yang telah dihapus menampilkan antarmuka penjelasan informatif dan tombol pilihan eksplisit menuju beranda buku; sistem tidak melakukan redirect diam-diam tanpa persetujuan pembaca. | Pengujian Deep Link Halaman Dihapus |
| **FR-LNK-005** | **AC-LNK-004** | Upaya mengonfigurasi rute target QR dinamis yang membentuk rantai pengalihan melingkar (*redirect loop*) dideteksi dan ditolak oleh validasi backend sebelum disimpan. | Pengujian Validasi Siklus QR |
| **FR-ACT-008** | **AC-ACT-003** | Siswa yang menggunakan kode retry sekali pakai yang sah berhasil memulai sesi percobaan baru tanpa menimpa skor percobaan sebelumnya; upaya menggunakan kode yang sama untuk kedua kalinya ditolak dengan pesan kode telah digunakan. | Pengujian Siklus Manual Retry Grant |
| **FR-EDT-007** | **AC-EDT-003** | Dua sesi admin yang mengedit draf yang sama: sesi A menyimpan revisi r1->r2; sesi B yang masih memegang r1 ditolak saat menyimpan dan disajikan perbandingan konflik visual; tidak ada data sesi A yang tertimpa secara diam-diam. | Pengujian Optimistic Locking Compare-and-Swap |
| **FR-RDR-009** | **AC-RDR-003** | Mengklik tombol "Ganti Pembaca" pada Reader menghapus seluruh token sesi pembaca dari `localStorage`/`sessionStorage` peramban dan mengarahkan tampilan kembali ke halaman pengisian identitas bersih. | Pengujian Pembersihan Sesi Perangkat Bersama |
| **FR-ACT-005** | **AC-ACT-004** | Siswa memulai kuis dengan batas waktu 10 menit; siswa menutup peramban pada menit ke-5 setelah menjawab 3 dari 5 soal; saat siswa membuka kembali tautan pada menit ke-15, backend menolak pengiriman jawaban baru dan mencatat status sesi telah difinalisasi secara deterministik berdasarkan 3 jawaban tersimpan. | Pengujian Timer Otoritatif Backend & Auto-Finalize |
| **FR-ACT-006** | **AC-ACT-005** | Klien mengirimkan payload finalisasi jawaban kuis dengan kunci idempoten yang sama sebanyak 3 kali berturut-turut dalam selang waktu 1 detik; backend hanya mengeksekusi penilaian tepat satu kali dan mengembalikan payload hasil yang identik tanpa duplikasi record nilai di database. | Pengujian Idempotensi Penyerahan Jawaban |
| **FR-ACT-001** | **AC-ACT-006** | Upaya kueri anonim langsung ke endpoint tabel pengerjaan siswa (`activity_attempts`) tanpa token sesi terotorisasi ditolak dengan kode otorisasi gagal; data nama dan kelas siswa tidak dapat di-scrape secara publik. | Pengujian Keamanan Akses Data Siswa |
| **NFR-CST-001** | **AC-CST-001** | Dashboard admin menampilkan indikator penggunaan kapasitas database dan media storage secara akurat berdasarkan metrik yang tersedia; sistem mengeluarkan indikator peringatan visual kuning saat penggunaan melampaui 80% kuota paket gratis tanpa memicu tagihan berbayar otomatis. | Pengujian Monitoring Kuota Paket Gratis |

---

## 18. Indikator Keberhasilan Produk (Product Success Metrics)

Indikator keberhasilan berikut merupakan sasaran evaluasi produk terukur yang diverifikasi melalui pengujian fungsional, simulasi beban, dan audit sistem:

1. **Metrik Integritas Tautan (Sasaran: 0 Broken Links):**
   - *Definisi & Sumber Data:* Persentase tautan cetak QR Code dan URL deep link (`/b/:slug`, `/b/:slug/p/:id`, `/q/:code`) yang mengalami galat server HTTP 500 atau halaman kosong tanpa navigasi saat diuji melalui uji regresi tautan.
   - *Target Terukur:* 0 insiden tautan mati tak tertangani; 100% permintaan menuju rute halaman yang dihapus disajikan antarmuka penjelasan informatif dengan opsi sadar pembaca.
2. **Metrik Integritas Penilaian & Determinisme Sesi (Sasaran: 100% Validasi Peladen):**
   - *Definisi & Sumber Data:* Hasil perbandingan kunci jawaban pada lalu lintas jaringan klien vs evaluasi backend di skema privat pada seluruh jenis kuis terdaftar, serta pengujian konsistensi deterministik waktu tenggat server saat sesi ditinggalkan.
   - *Target Terukur:* 100% kalkulasi nilai dieksekusi di backend tanpa kebocoran kunci jawaban pada klien; 100% kepatuhan penolakan jawaban kedaluwarsa sesuai timestamp UTC peladen.
3. **Metrik Stabilitas Publikasi & Transaksi Kritis (Sasaran: 100% Integritas & Atomisitas State):**
   - *Definisi & Sumber Data:* Tingkat keberhasilan transaksi penerbitan, penarikan publikasi, dan rollback yang dipantau melalui audit log dan status pointer `active_version_id`.
   - *Target Terukur:* 100% operasi aktivasi versi dieksekusi secara atomik dan idempoten tanpa adanya kondisi publikasi parsial (*partial publish*) atau pointer menggantung (*dangling pointer*); status non-aktif akibat tindakan Unpublish atau Emergency Revoke yang disengaja dibedakan secara tegas dari insiden kegagalan sistem tak terduga; seluruh data historis dan keterikatan versi (*version pinning*) tetap terlindungi utuh.
4. **Metrik Aksesibilitas Reader (Sasaran Pengujian: Skor Lighthouse >= 95):**
   - *Definisi & Sumber Data:* Hasil audit otomatis Google Lighthouse Accessibility pada tampilan Reader publik di lingkungan pengujian peramban desktop dan seluler.
   - *Target Terukur:* Skor aksesibilitas minimal 95/100, mencakup navigasi keyboard penuh, pemenuhan rasio kontras warna AA, dan target sentuh minimal 44x44 CSS px.
5. **Metrik Efisiensi Operasional Biaya (Sasaran: Rp0 Biaya Langganan Awal):**
   - *Definisi & Sumber Data:* Rekap tagihan infrastruktur cloud bulanan dan indikator pemantauan kuota paket gratis pada dashboard Supabase dan Cloudflare.
   - *Target Terukur:* 0 Rupiah pengeluaran operasional infrastruktur pada fase awal, dengan sistem peringatan dini yang aktif sebelum kuota kritis tercapai tanpa memicu peningkatan paket otomatis.

---

## 19. Keterlacakan Keputusan Q1–Q5 dan A1–A12 (Traceability Matrix)

Tabel berikut menunjukkan pemetaan langsung keputusan addendum yang telah dikunci ke dalam pasal-pasal persyaratan PRD ini:

| Keputusan Terkunci | Deskripsi Inti Keputusan | Pasal Representasi pada PRD Ini |
|---|---|---|
| **Q1 & A1** | Kedalaman nesting komponen dibatasi maksimal 3 tingkat. | §6.1, §7.3 (FR-EDT-005), §17 (AC-EDT-001) |
| **Q2 & A5** | Penarikan publikasi (Unpublish) default memberi grace period percobaan aktif; dilarang mulai baru; hasil historis utuh. | §6.1, §7.7 (FR-PUB-006), §9.1, §17 (AC-PUB-003) |
| **Q3 & A2** | Media hybrid (privat draf, publik terbit immutable), deduplikasi hash, retensi berbasis referensi snapshot. | §7.11 (FR-MED-001 s/d FR-MED-003), §17 (AC-MED-001) |
| **Q4 & A9** | Privacy by Design, identitas minimal self-reported, perlindungan anak, isolasi hash token, tanpa pelacak. | §4.3, §5, §7.9 (FR-ACT-001, FR-ACT-002), §10, §17 (AC-ACT-006) |
| **Q5** | Backend Hybrid (Supabase Edge Functions untuk otorisasi/scoring, PostgreSQL Functions untuk transaksi atomik). | §2, §7.9 (FR-ACT-003), §8.2 (NFR-SEC-002, NFR-SEC-007), §11 |
| **A3** | Retensi snapshot historis dipertahankan; evaluasi dependensi ketat; pemisahan retensi konten dan data nilai siswa. | §7.7 (FR-PUB-003), §10, §12, §16 (RSK-001), §17 (AC-PUB-006) |
| **A4** | Perbedaan tegas antara Unpublish, Emergency Revoke, dan Rollback; aktivasi atomik, audit lengkap, batas invalidasi cache. | §6.1, §7.7 (FR-PUB-006 s/d FR-PUB-008), §9.1, §17 (AC-PUB-004, AC-PUB-005) |
| **A6** | Perlindungan rate limiting berlapis (Cloudflare edge, Supabase Edge Functions mandiri, PostgreSQL constraints). | §8.2 (NFR-SEC-006, NFR-SEC-007), §11 |
| **A7** | Cadangan berkala (Hybrid Backup & Disaster Recovery) database relasional dan file fisik media sebenarnya. | §6.1, §8.4 (NFR-REL-003), §15.2, §16 (RSK-007), §17 (AC-REL-001) |
| **A8** | Penanganan Stable ID, alias slug lama, halaman pengganti eksplisit non-silent-redirect, anti-siklus, anti-bypass. | §7.2 (FR-BOK-002), §7.10 (FR-LNK-001 s/d FR-LNK-006), §17 (AC-LNK-001 s/d AC-LNK-004) |
| **A10** | Optimistic concurrency control pada draf berbasis nomor revisi; antarmuka resolusi konflik visual; validasi struktural. | §7.3 (FR-EDT-007), §12, §17 (AC-EDT-002, AC-EDT-003) |
| **A11** | Pemberian izin retry manual berbasis ID percobaan dan kode acak sekali pakai yang terikat waktu kedaluwarsa. | §7.9 (FR-ACT-008), §17 (AC-ACT-003) |
| **A12** | Target biaya Rp0 melalui optimasi struktur data tanpa upgrade otomatis berbayar; pemantauan kapasitas proaktif. | §2, §4.2, §8.5 (NFR-CST-001, NFR-CST-002), §16 (RSK-001), §17 (AC-CST-001), §18 |

---

## 20. Ketergantungan terhadap Dokumen Arsitektur Berikutnya

Dokumen PRD (`PRODUCT_REQUIREMENTS.md`) ini menjadi acuan tunggal hulu (*upstream specification*) bagi 11 dokumen arsitektur turunan:

1. **`docs/APP_FLOW.md`:** Menjabarkan diagram alur pengguna rinci (*user flowcharts*) untuk setiap modul yang disyaratkan di §7 (Alur Admin, Alur Pembaca, Alur Unpublish, Alur Resolusi Konflik).
2. **`docs/INFORMATION_ARCHITECTURE.md`:** Menyusun peta situs (*sitemap*), taksonomi navigasi, struktur hierarki menu admin, dan layout drawer reader berdasarkan §7.2, §7.3, dan §7.8.
3. **`docs/CORE_FEATURES.md`:** Memetakan rincian spesifikasi teknis dan pemotongan fitur MVP vs Fase Lanjutan mengacu pada §7 dan §13.
4. **`docs/UI_UX_SPEC.md`:** Menetapkan spesifikasi desain antarmuka, wireframe konseptual, sistem desain, aturan grid responsif, dan panduan WCAG AA sesuai §7.3, §7.8, dan §8.3.
5. **`docs/DATABASE_ARCHITECTURE.md`:** Mengonstruksi pola skema hybrid (`auth`, `public`, `private`), strategi snapshot JSONB, dan transaksi atomik mengacu pada §7.7, §11, dan §12.
6. **`docs/DATABASE_ERD.md`:** Merancang diagram relasi entitas fisik (~30+ tabel) yang memfasilitasi kebutuhan seluruh FR di §7.
7. **`docs/DATA_DICTIONARY.md`:** Menetapkan detail tipe data, nullability, nilai default, dan indeks untuk seluruh atribut data yang diuraikan di §7 dan §12.
8. **`docs/DATABASE_CONSTRAINTS.md`:** Mendefinisikan aturan integritas bisnis (foreign key, check constraints, invariants atomik) sesuai §7.7, §11, dan §12.
9. **`docs/RLS_SECURITY.md`:** Merancang matriks akses otorisasi, kebijakan RLS per tabel, dan spesifikasi peran data mengacu pada §8.2, §10, dan §11.
10. **`docs/DATABASE_MIGRATION_PLAN.md`:** Menentukan urutan langkah migrasi skema yang aman dan dapat direproduksi mengacu pada dependensi data di §12 dan §13.
11. **`docs/DATABASE_TEST_PLAN.md`:** Merancang skenario pengujian komprehensif untuk memverifikasi setiap kriteria penerimaan yang tercantum di §17.

---

## 21. Hal yang Masih Memerlukan Verifikasi

Meskipun fondasi arsitektur telah terdefinisi secara solid, beberapa hal teknis wajib diverifikasi secara langsung pada tahap implementasi/uji coba:
1. **Verifikasi Kuota Aktual Layanan Gratis Supabase:** Batas resmi kuota gratis Supabase (kapasitas database, batas penyimpanan storage, bandwidth keluar per bulan, dan kuota pemanggilan Edge Functions) wajib diverifikasi langsung melalui dashboard dan dokumentasi resmi mutakhir sebelum peluncuran publik.
2. **Kesesuaian Library Flipbook dengan Layar Sentuh:** Performa interaksi pustaka animasi flipbook desktop saat disentuh pada perangkat hibrida (laptop touchscreen) wajib diuji agar transisi ke scroll vertikal berjalan mulus.
3. **Efisiensi Serialisasi JSONB:** Ukuran rata-rata dokumen snapshot JSONB per buku perlu diukur untuk buku berukuran 50+ halaman guna memastikan batas latensi baca tetap di bawah 2 detik.

---

## 22. Kesimpulan dan Permintaan Persetujuan

Dokumen **Product Requirements Document (PRD)** ini telah disusun secara komprehensif, terstruktur, profesional, dan mencerminkan seluruh kesepakatan pada `FLIPBOOK_STUDIO_MASTER_PROMPT.md` serta keputusan addendum terkunci Q1–Q5 dan A1–A12.

Dokumen ini memosisikan privasi siswa sekolah dasar, integritas sistem penilaian, stabilitas materi cetak, kemudahan penyuntingan, dan efisiensi biaya operasional sebagai pilar utama produk. Dokumen ini siap digunakan sebagai acuan dasar bagi penyusunan dokumen tahap berikutnya (`docs/APP_FLOW.md`).

---

**STATUS DOKUMEN SAAT INI:**  
**APPROVED & LOCKED — DISETUJUI PEMILIK PROYEK**

*(Dokumen ini telah dikunci sebagai baseline arsitektur resmi FS-DOC-01. Penyusunan dokumen arsitektur berikutnya menunggu instruksi eksplisit dari Pemilik Proyek).*
