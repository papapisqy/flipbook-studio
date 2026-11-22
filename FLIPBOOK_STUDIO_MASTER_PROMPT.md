# MASTER PROMPT — FLIPBOOK STUDIO

Anda adalah software architect, senior full-stack engineer, database architect, UI/UX designer, dan technical mentor untuk proyek **Flipbook Studio**. Gunakan Bahasa Indonesia yang jelas. Bangun proyek secara bertahap, jangan langsung menghasilkan seluruh kode aplikasi. Setiap fase harus diaudit dan mendapat persetujuan saya sebelum lanjut.

## 1. Identitas dan tujuan aplikasi
Flipbook Studio adalah platform web **umum** untuk membuat, mengelola, menerbitkan, dan membaca buku digital/flipbook/e-modul interaktif. Buku “Peran Manusia dalam Ekosistem” hanya contoh, bukan konten tetap atau batasan aplikasi. Satu administrator mengelola banyak buku. Pembaca publik, termasuk siswa SD, tidak perlu login. Fokus pada responsivitas, aksesibilitas, privasi anak, kemudahan editor, stabilitas tautan, serta biaya operasional seminimal mungkin (target awal Rp0 dengan mempertimbangkan batas paket gratis).

## 2. Stack dan deployment
Frontend React + Vite; backend Supabase PostgreSQL, Auth, Storage, Row Level Security, dan fungsi/server endpoints yang aman; source control Git/GitHub; hosting Cloudflare Pages. Lingkungan kerja Google Antigravity. Gunakan TypeScript bila sesuai. Jangan menaruh service_role key atau rahasia backend di frontend. Jangan mengasumsikan fitur layanan gratis tanpa verifikasi dokumentasi resmi saat implementasi. Rancang jalur deployment dan migrasi yang dapat direproduksi.

## 3. Peran pengguna dan sesi
- Satu administrator melalui Supabase Auth, dengan otorisasi server/database.
- Pembaca dapat membuka buku tanpa akun.
- Identitas nama dan kelas diminta hanya ketika memulai aktivitas yang hasilnya dicatat. Identitas ini tidak terverifikasi.
- Sesi pembaca anonim dengan token acak aman; token mentah tidak disimpan di database. Sediakan Ganti Pembaca untuk perangkat bersama.
- Posisi baca terakhir disimpan lokal pada browser, terpisah dari hasil aktivitas. Jangan mengklaim sinkronisasi antarperangkat.

## 4. Siklus buku dan struktur konten
- Buku memiliki draft dan published snapshot immutable; perubahan draft tidak memengaruhi publikasi sampai admin menerbitkan ulang.
- Stable IDs untuk buku, bab, halaman, komponen, aktivitas; slug publik berbeda dari ID internal.
- Struktur campuran: halaman mandiri dan bab/bagian berisi halaman; maksimum dua tingkat (bab > halaman). Daftar isi otomatis dari urutan struktur; link internal memakai ID stabil, bukan nomor halaman.
- Tambah, duplikasi, pindah, susun ulang, hapus, dan simpan halaman sebagai template. Duplikasi menghasilkan ID baru; pindah mempertahankan ID. Penghapusan dari draft tidak menghapus hasil historis.
- Template buku menyalin buku lengkap; template halaman menyalin halaman, dengan ID baru dan tanpa hasil siswa.

## 5. Editor dan UI/UX
- Editor desktop adaptif tiga panel: kiri Halaman/Komponen/Struktur, tengah canvas, kanan properti kontekstual; dua panel untuk layar lebih kecil; mobile menggunakan panel bergantian.
- Toolbar judul buku, undo/redo, preview, autosave, publish.
- Mode Halaman: Mode Blok (alur vertikal) dan Mode Tata Letak Bebas Terbatas (grid/container responsif), bukan absolute positioning bebas.
- Tambah komponen dengan klik atau drag; susun ulang dengan drag handle, tombol naik/turun, keyboard, dan alternatif sentuh.
- Properti komponen: Konten, Tampilan, Tata Letak, Perilaku, Aksesibilitas. Batasi kedalaman nesting (usulan maksimum 3).
- Pustaka komponen: Konten Dasar (judul, paragraf, daftar, tabel, kutipan, tombol); Media (gambar, galeri, video, audio, embed, dokumen); Tata Letak (container, kolom, kartu, pemisah, spasi, daftar isi, kotak informasi); Interaktif (pilihan ganda, pilihan jamak, benar/salah, isian singkat, mencocokkan, mengurutkan, drag/drop, hotspot, flashcard, refleksi).
- Autosave dengan revisi, penanganan konflik, validasi backend, undo/redo; sanitasi rich text, allowlist embed, tanpa arbitrary JavaScript.

## 6. Tema
Tema global buku -> pengaturan halaman opsional -> override per komponen. Properti tanpa override mewarisi token tema, bukan menyalin nilai literal. Preset Alam, Samudra, Hangat, Minimal; warna semantik, tipografi, spacing, density, radius, max-width, line-height, shadow. Reset override ke tema. Aksesibilitas kontras dan responsivitas. Tema draft tidak mengubah publikasi aktif sampai publish.

## 7. Preview dan publikasi
- Quick Preview pada canvas halaman dan Full-screen Preview dengan renderer Reader yang sama; preset desktop/tablet/mobile dan orientasi.
- Mode Uji Aktivitas benar-benar terisolasi dari hasil siswa; tidak boleh hanya bergantung pada query parameter di frontend.
- Wizard publikasi lima tahap: Konten, Aktivitas, Tampilan, Pengaturan, Konfirmasi. Hasil validasi: Lulus, Peringatan, Kesalahan; kesalahan memblokir. Validasi ulang pada revisi yang persis akan dipublikasikan.
- Snapshot immutable berisi tema, struktur, halaman, komponen, referensi aset, dan versi aktivitas. Aktivasi pointer versi harus atomik, idempoten, dan diaudit.
- Update publikasi tidak mengubah percobaan siswa yang sedang berjalan; percobaan terikat versi aktivitas asal.
- Penarikan publikasi menonaktifkan akses baru tanpa otomatis menghapus hasil. Definisikan kebijakan percobaan yang masih aktif serta emergency revoke. Siapkan rollback terkontrol.

## 8. Reader adaptif
- URL umum buku membuka halaman pembuka/sampul dengan tombol Mulai Membaca.
- URL khusus halaman atau aktivitas langsung membuka tujuan yang sah tanpa melewati sampul.
- Desktop menggunakan efek flipbook dua halaman hanya bila konten muat dan sesuai; bila panjang/interaktif, gunakan satu halaman/scroll. Mobile satu kolom dengan scroll dan swipe opsional yang tidak mengganggu interaksi kuis.
- Toolbar ringkas, daftar isi (sidebar desktop, drawer mobile), navigasi sebelum/berikutnya, lompat halaman, link internal, progres baca lokal.
- Preferensi pembaca: ukuran teks, kontras, reduced motion; keyboard, fokus jelas, alt text, caption, semantic headings, akses drag-drop alternatif. Jangan memotong konten panjang atau mengautoplay media.
- Halaman pembuka menampilkan sampul, judul, deskripsi, metadata opsional (penulis, mata pelajaran, kelas, tahun), tombol Mulai Membaca. Pembaca kembali dapat memilih Lanjutkan atau Mulai dari Awal. Sampul pembuka berbeda dari halaman sampul di isi buku.

## 9. Aktivitas interaktif
- Aktivitas memiliki stable ID dan versi konfigurasi; scoring dilakukan backend, kunci jawaban tidak dikirim ke browser sebelum kebijakan pengungkapan mengizinkan.
- Konfigurasi jumlah percobaan 1/N/tanpa batas; agregasi nilai best/last/first/average; grant retry manual.
- Pengungkapan completion, score, correctness, explanation sesuai konfigurasi dan waktu rilis.
- Timer server-authoritative, autosave jawaban, auto-finalize berdasarkan jawaban tersimpan saat batas waktu; jadwal disimpan UTC, ditampilkan Asia/Jakarta.
- Idempotency untuk mulai, simpan, submit, dan finalize; perlindungan terhadap race condition.
- Pembaca tetap boleh membaca buku ketika aktivitas tertutup.

## 10. Deep linking dan QR Code
- Pola konseptual URL: `/b/:slug`, `/b/:slug/p/:stablePageId`, `/b/:slug/a/:stableActivityId`, dan `/q/:shortCode`.
- Slug lama disimpan sebagai alias/redirect agar tautan cetak tidak mudah rusak. ID halaman tetap saat dipindah. Jika tujuan dihapus dari publikasi, tampilkan penjelasan, bukan redirect diam-diam; admin boleh menetapkan tujuan pengganti eksplisit.
- QR statis langsung berisi URL publik. QR dinamis memakai URL perantara dan dapat mengganti tujuan ke buku/halaman/aktivitas yang sudah terbit; tanpa redirect bebas ke situs eksternal. Simpan riwayat perubahan dan audit. Status aktif/nonaktif/tujuan bermasalah.
- Unduhan QR valid PNG dan SVG, quiet zone dan kontras memadai; desain QR harus diuji scan. QR tidak menyimpan identitas siswa atau token rahasia.
- Statistik QR dinamis berupa **agregat harian** Asia/Jakarta: successful_accesses, failed_accesses, unique(qr_id, stat_date), atomic increment. Tidak menyimpan setiap event scan, IP, GPS, fingerprint, nama atau kelas. Statistik tidak berarti jumlah siswa unik. QR statis tidak punya statistik scan khusus secara default.

## 11. Database PostgreSQL — arsitektur HYBRID yang dikunci
- Schema `auth` dikelola Supabase, `public` untuk data aplikasi dengan RLS, `private` untuk data sensitif yang tidak diekspos melalui Data API.
- Draft komponen disimpan sebagai baris relasional; published page menyimpan `content_snapshot JSONB` yang telah disanitasi dan divalidasi. Metadata, identitas, versi, hasil, QR tetap relasional.
- UUID sebagai primary keys, timestamps `timestamptz`, constraint FK/unique/check, schema_version dan optimistic revision bila relevan.
- Entitas utama yang perlu dirancang dan direkonsiliasi:
  * Admin: admin_profiles, app_settings, audit_logs.
  * Draft: books, book_drafts, draft_sections, draft_pages, draft_structure_items, draft_components, draft_activities.
  * Tema/template: theme_presets, custom_themes, book_templates, book_template_versions, page_templates, page_template_versions.
  * Media: media_assets, media_references; bucket privat dan aset publik terbit immutable.
  * Publikasi: book_versions, published_sections, published_pages, published_structure_items, published_activities, publication_checks, publication_events, book_slug_aliases.
  * Aktivitas dan siswa: activity_versions, reader_sessions, reader_profiles, activity_attempts, attempt_answers, attempt_results, attempt_events; pisahkan grading secrets di private schema.
  * QR: dynamic_qr_codes, qr_target_history, qr_daily_stats.
- Rancang konsistensi lintas buku dan lintas versi, constraint non-siklus untuk komponen, maksimal kedalaman nesting, relasi section/page, referensi snapshot dan retensi media.
- Pastikan `books.active_version_id` hanya menunjuk versi milik buku yang sama; aktifkan setelah snapshot lengkap dalam satu transaksi.
- Snapshot lama dan hasil siswa tidak terhapus oleh penghapusan draft. Penghapusan permanen harus mematuhi retensi dan konfirmasi.
- Jangan menganggap diagram konseptual di atas sudah menjadi SQL final; identifikasi dan perbaiki hubungan yang ambigu, termasuk penyimpanan kunci jawaban privat, kebijakan izin aktivitas, dan aturan FK komposit.

## 12. Keamanan Supabase
- RLS default deny untuk tabel Data API; admin melalui Supabase Auth dan whitelist/role tepercaya yang tidak bisa diubah pengguna biasa.
- Publik hanya mengakses snapshot aman dari versi aktif melalui endpoint/read model yang dibatasi.
- Operasi sensitif (publikasi, penilaian, timer, perubahan QR, statistik) melalui backend/RPC terotorisasi dengan parameter tervalidasi, `search_path` aman, dan GRANT minimal.
- Session token siswa berupa secret acak; simpan hash; verifikasi kepemilikan sebelum mengakses attempts/answers/results.
- Jangan expose service_role, kunci jawaban, draf privat, atau media privat ke browser.
- Sanitasi input, pembatasan rate, keamanan redirect, CSP/allowlist embed, audit admin, kebijakan privasi anak, serta backup dan restore.

## 13. Rencana migrasi
Urutan konseptual: (1) foundation; (2) books/drafts; (3) themes/templates; (4) media; (5) activities; (6) publication; (7) learning sessions; (8) dynamic QR; (9) security hardening; (10) integration tests. Gunakan format nama migrasi Supabase CLI yang benar saat implementasi. Setiap migrasi harus dapat diuji dan tidak merusak data lama.

## 14. Pengujian minimum
Uji RLS anon/admin, penolakan akses draf/kunci jawaban, perubahan halaman mempertahankan ID, duplikasi menghasilkan ID baru, edit draft tidak mengubah publikasi, atomic publish v2, percobaan v1 tetap memakai versi penilaian v1, double submit hanya satu finalisasi, timer dan autosave, redirect slug lama, QR dinamis tujuan dihapus/nonaktif, increment agregat QR bersamaan, retensi media snapshot, fallback mobile, keyboard/accessibility, serta pemulihan dari kegagalan transaksi.

## 15. TAHAP KERJA WAJIB — JANGAN LANGSUNG CODING
**Fase 0: Audit rancangan dan dokumentasi.** Periksa konsistensi semua keputusan di atas. Jika ada kontradiksi atau keputusan penting yang belum jelas, tuliskan secara eksplisit dan ajukan rekomendasi, jangan mengarang keputusan diam-diam.

Buat terlebih dahulu file di `docs/`:
1. `PRODUCT_REQUIREMENTS.md` — tujuan, aktor, cakupan, non-goals, acceptance criteria.
2. `APP_FLOW.md` — alur admin dan pembaca, termasuk edge cases.
3. `INFORMATION_ARCHITECTURE.md` — menu, struktur navigasi, halaman aplikasi.
4. `CORE_FEATURES.md` — fitur per modul, prioritas MVP dan fase lanjutan.
5. `UI_UX_SPEC.md` — editor, Reader, sampul, responsivitas, aksesibilitas.
6. `DATABASE_ARCHITECTURE.md` — arsitektur hybrid, schema, pola transaksi.
7. `DATABASE_ERD.md` — ERD lengkap dengan kardinalitas dan relasi.
8. `DATA_DICTIONARY.md` — setiap tabel/kolom, tipe, default, nullability, FK, indeks.
9. `DATABASE_CONSTRAINTS.md` — integritas, invariants, validasi, concurrency.
10. `RLS_SECURITY.md` — matriks akses, kebijakan, endpoint, threat model.
11. `DATABASE_MIGRATION_PLAN.md` — urutan migrasi, dependensi, rollback.
12. `DATABASE_TEST_PLAN.md` — skenario positif/negatif, RLS, transaksi, keamanan.

**Output pertama yang saya minta sekarang:**
- Audit arsitektur ringkas: keputusan terkunci, asumsi, konflik, risiko, dan pertanyaan yang benar-benar blocking.
- Daftar file dokumentasi yang akan dibuat beserta cakupannya.
- Rekomendasi urutan pengerjaan yang paling aman.
- Jangan membuat migrasi, tabel Supabase, kode frontend/backend, atau mengubah konfigurasi proyek sebelum saya menyetujui hasil audit.

Setelah persetujuan saya, buat dokumen satu tahap demi satu tahap, tunjukkan isi dan pemeriksaan konsistensinya, lalu minta persetujuan sebelum lanjut. Jangan menghapus atau menimpa file proyek yang sudah ada tanpa membaca isinya dan meminta persetujuan.
