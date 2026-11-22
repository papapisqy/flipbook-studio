# SPESIFIKASI UI/UX — FLIPBOOK STUDIO

## UX-00 — Identitas dan Tata Kelola Dokumen

- Proyek: Flipbook Studio (`FS-CORE`); dokumen: FS-DOC-05 / `docs/UI_UX_SPEC.md`.
- Versi/status/tanggal: `v0.1.0-draft` / **DRAF — MENUNGGU REVIEW DAN PERSETUJUAN PEMILIK PROYEK** / 18 November 2026.
- Baseline: FS-DOC-01 PRODUCT_REQUIREMENTS, FS-DOC-02 APP_FLOW, FS-DOC-03 INFORMATION_ARCHITECTURE `v1.0.1-approved-locked`, dan FS-DOC-04 CORE_FEATURES berstatus APPROVED & LOCKED. FS-DOC-03 dikunci kembali setelah CR-IA-005-RELOCK yang disetujui pemilik proyek.
- Tujuan: acuan implementasi antarmuka, bukan kode, prototipe, API, skema, atau desain visual final.
- Konvensi lokal: `UX-*` untuk spesifikasi, `UI-*` komponen, `UI-AC-*` kriteria UI. ID baseline tidak dibuat ulang.
- Kebijakan: usulan desain dapat direvisi; perubahan keputusan baseline memerlukan pemilik proyek. Dokumen ini belum disetujui atau dikunci.
- Keputusan terkendali: `CR-UX-001 — DESIGN SYSTEM APPROVAL` telah **APPROVED BY OWNER** untuk warna, tipografi, layout, spacing, breakpoint, dan aturan visual UX-04/UX-05; keputusan ini tidak menyetujui atau mengunci FS-DOC-05.

## UX-01 — UX Vision dan Design Principles

Pengalaman pembaca bersifat mobile-first dan content-first; pengalaman admin desktop-first, task-oriented, dengan fallback responsif. Keputusan baseline: WCAG 2.1 AA, keyboard, target sentuh 44×44 CSS px bila relevan, tidak autoplay, privacy-by-design, dan tidak ada kehilangan draf diam-diam. Usulan desain: progressive disclosure, token semantik, feedback dekat dengan tindakan, serta dialog kritis yang dapat dipulihkan. Warna bukan satu-satunya indikator; animasi tidak wajib untuk memahami informasi dan mengikuti reduced motion.

## UX-02 — User Types, Context, dan UX Goals

| Aktor | Tujuan/konteks | Tugas dan hambatan | Prinsip UX |
|---|---|---|---|
| Pembaca publik | Ponsel atau desktop, tanpa akun | Membuka buku, navigasi, preferensi | Konten dahulu, URL stabil, tidak ada data privat. |
| Siswa | Ponsel/jaringan berubah | Memulai sesi, menjawab, finalisasi | Identitas minimum, status A/B/C jujur, timer server. |
| Administrator | Desktop/editor; tablet/mobile fallback | Buku, media, publish, hasil | Navigasi task-oriented, CAS, konfirmasi kritis. |
| Sistem/backend | Bukan persona manusia | Validasi/otorisasi/status | UI tidak menyatakan sukses sebelum konfirmasi backend. |

## UX-03 — Global Information and Navigation Experience

Publik: sampul → Reader → TOC/preferensi/aktivitas; deep link membuka target atau `S-APP-007`, bukan redirect diam-diam. Admin: login → dashboard → daftar buku → metadata/struktur/editor → preview/publish/lifecycle; route admin tetap mengikuti IA-Q-001 dan tidak difinalkan di sini. Back/forward menghormati URL dan perubahan belum tersimpan: tampilkan dialog sebelum keluar dari draf lokal. Sesi habis menuju `P-ADM-001` dengan `S-APP-005`; konten revoked/tidak tersedia memakai `S-APP-008`/`S-APP-009` tanpa bocor konten.

## UX-04 — Design System Foundation

Nilai pada UX-04 adalah **DESIGN BASELINE DISETUJUI** melalui `CR-UX-001 — DESIGN SYSTEM APPROVAL` (**APPROVED BY OWNER**), bukan perubahan keputusan produk. Arah visualnya adalah *editorial learning workspace*: Reader content-first dengan chrome minimum; workspace admin task-oriented dengan navigasi dan canvas jelas. Primary blue dipakai untuk aksi; surface bersih, border halus, kartu seperlunya. Status selalu memakai teks/ikon selain warna.

| Token | Nilai desain disetujui | Penggunaan | Status |
|---|---|---|---|
| `color.primary.600/.700` | `#1D4ED8` / `#1E40AF` | aksi utama / hover-active | DISETUJUI — CR-UX-001 |
| `color.bg.canvas`, `color.surface`, `color.border` | `#F8FAFC`, `#FFFFFF`, `#CBD5E1` | latar, panel, pemisah | DISETUJUI — CR-UX-001 |
| `color.text.primary/muted` | `#111827`, `#475569` | teks utama/sekunder | DISETUJUI — CR-UX-001 |
| `color.success/warning/error/info` | `#15803D`, `#B45309`, `#B91C1C`, `#0369A1` | feedback semantik | DISETUJUI — CR-UX-001 |
| `color.focus/disabled` | `#2563EB`, `#94A3B8` | focus ring/nonaktif | DISETUJUI — CR-UX-001 |

Rasio dihitung dengan relative luminance WCAG `(L1+0.05)/(L2+0.05)`: `#111827` pada putih **17.74:1**; `#475569` pada putih **7.58:1**; putih pada `#1D4ED8` **6.70:1**; putih pada success/error/info **5.02:1 / 6.47:1 / 5.93:1**; warning `#B45309` pada putih **5.02:1**. Semua pasangan tersebut memenuhi AA untuk teks normal berdasarkan nilai hitung; penerapan aktual tetap wajib diuji. Pasangan baru yang belum dihitung berstatus **PERLU REVISI**.

**Tipografi — DISETUJUI melalui CR-UX-001:** UI memakai `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; skala 12/14/16/20/24/32 px untuk caption/label/body/heading kecil/seksi/halaman; weight 400/500/600/700; line-height body 1.5–1.6 dan heading 1.2–1.3. Tipografi konten buku mengikuti tema, terpisah dari UI. Zoom teks dan reflow tidak boleh memotong kontrol; Reader menargetkan 45–75 karakter/baris.

**Layout — DISETUJUI melalui CR-UX-001:** `space.1…8` = 4/8/12/16/20/24/32/40 px; radius 4/8/12 px; elevation: `0 1px 2px rgb(15 23 42 / .08)`, `0 4px 12px rgb(15 23 42 / .12)`, `0 12px 28px rgb(15 23 42 / .16)`; z-index base/sticky/drawer/modal/toast = 0/10/20/30/40. Reader maksimal 760 px; admin 1440 px; grid 4/8/12 kolom dan gutter 16/20/24 px; breakpoint UX-05 mengikuti keputusan yang sama.

| State | Visual/interaksi | Aksesibilitas/recovery |
|---|---|---|
| Default/hover/active | border/surface atau primary.700; hover hanya perangkat pendukung | bukan satu-satunya sinyal |
| Focus-visible/selected | ring 2 px focus; selected juga label/ikon | fokus selalu terlihat dan logis |
| Disabled/loading | opacity secukupnya; ukuran kontrol stabil; cegah submit ulang | alasan bila penting; status diumumkan |
| Success/warning/error | token semantik, ikon, teks, aksi recovery | error dekat konteks; toast bukan satu-satunya media kritis |

**Motion — DISETUJUI melalui CR-UX-001:** micro-interaction 150 ms; panel/dialog 200–250 ms; easing standar `cubic-bezier(.2,0,0,1)`. Reduced motion menghapus transisi non-esensial; flipbook selalu memiliki fallback scroll. Tidak ada autoplay atau animasi sebagai satu-satunya pembawa informasi.

| Komponen | Token/state khusus | Fokus, responsif, error/recovery |
|---|---|---|
| UI-011–015 | primary, semantic, focus | keyboard native; label/error terhubung; full-width bila mobile |
| UI-016–020 | surface/border/selected/loading/empty | Arrow/Escape sesuai pola; drawer/kartu pada mobile; recovery inline |
| UI-021–025 | progress, referenced, selected, saving/conflict | status polite; keyboard alternative; pertahankan alasan gagal dan draf lokal |
| UI-026–028 | primary, warning/error, reduced motion | step saat ini/QR/nav berlabel; drawer/scroll fallback mobile |
| UI-029–032 | success/warning/error, timer/status | teks+ikon; status A/B/C jujur; disclosure tidak bocor ke payload publik |

## UX-05 — Responsive Layout Specification

### Prinsip dan breakpoint

Breakpoint **DISETUJUI melalui CR-UX-001**: mobile `<640`, tablet `640–1023`, desktop `1024–1439`, wide `≥1440` CSS px. Reader bersifat mobile-first; admin desktop-first dengan fallback responsif. Reflow tidak boleh menghilangkan tindakan atau perubahan lokal; orientasi, safe-area, zoom teks, keyboard virtual, dan konten panjang harus diperlakukan sebagai kondisi layout. Satu area memiliki satu scroll owner; sticky hanya untuk kontrol yang tidak menutup konten.

### Matriks responsif per area

| Area | Mobile | Tablet | Desktop/wide |
|---|---|---|---|
| Sampul/Reader | satu kolom, kontrol berlabel, scroll | TOC sheet dan fallback scroll | dua halaman hanya bila konten cocok; fallback scroll tetap tersedia |
| TOC/A11y | drawer/bottom sheet, fokus kembali pemicu | drawer | panel/drawer; preferensi tetap keyboard-friendly |
| Aktivitas | timer/status ringkas, tombol tetap 44 px | grid soal terbatas | navigasi soal dan status lebih lebar |
| Login/dashboard | form/kartu satu kolom, menu collapse | dua kolom bila muat | sidebar, grid ringkasan dan kuota |
| Buku/metadata/struktur | daftar kartu, reorder tombol | daftar+detail konteks | tabel/struktur dan detail berdampingan |
| Editor | editing dasar; inspector sheet | panel konteks bergantian | tiga panel: struktur, canvas, inspector |
| Media/inspector | picker sheet, preview vertikal | panel konteks | library/panel sejajar canvas |
| Preview/publish | fullscreen dan wizard vertikal | stepper adaptif | viewport pilihan dan stepper horizontal |
| QR/hasil/pengaturan/kuota | kartu, filter sheet | kartu/tabel adaptif | tabel, filter, detail samping |
| Dialog/drawer/toast/form | sheet bila aman; tidak tertutup keyboard | modal terkendali | modal terpusat; drawer samping |

### Kontrak editor responsif

Desktop menggunakan tiga panel; tablet mengganti panel struktur/pustaka dan inspector secara kontekstual tanpa kehilangan seleksi; mobile memberi editing dasar, tambah komponen, inspector, undo/redo, dan status autosave. Operasi kompleks dapat diberi arahan ke desktop, tetapi tidak menghapus fungsi dasar. Perubahan viewport tidak menghilangkan seleksi, perubahan lokal, atau konteks konflik. Drag-and-drop tidak pernah menjadi satu-satunya reordering: tombol pindah dan keyboard tetap tersedia.

### Interaksi dan aksesibilitas responsif

Kontrol sentuh minimal 44×44 CSS px bila relevan; navigasi tidak bergantung hover. Keyboard memiliki focus visible dan urutan logis; screen reader menerima nama, state, dan error melalui pola UX-04/UX-06. Drawer/dialog memindahkan dan mengembalikan fokus; keyboard virtual tidak boleh menutup primary action atau error. Reduced motion mematikan transisi non-esensial; Reader memakai fallback scroll dan tidak autoplay.

### Matriks verifikasi responsif

| Kondisi | Cakupan | Hasil yang diharapkan | Status |
|---|---|---|---|
| Viewport/Orientasi | Reader, aktivitas, admin, editor | reflow tanpa aksi/konten hilang | Spesifikasi, belum diuji |
| Zoom/reflow | form, Reader, tabel | teks diperbesar tidak memotong kontrol kritis | Spesifikasi, belum diuji |
| Keyboard/SR | drawer, dialog, editor, aktivitas | fokus, label, Escape/return-focus benar | Spesifikasi, belum diuji |
| Touch/hover | nav, reorder, flip, form | tanpa hover-only; target sentuh memadai | Spesifikasi, belum diuji |
| Loading/error/recovery | publish, autosave, media, aktivitas | status jujur dan recovery tersedia | Spesifikasi, belum diuji |
| Keyboard virtual/safe-area | form mobile, sheet, activity | tombol finalisasi/recovery tetap terlihat | Spesifikasi, belum diuji |

## UX-06 — UI Component Library

### Kategori Komponen — Bukan Register Individual

| ID/komponen | Varian/state/interaksi | Keyboard, SR, responsif/error | Feature |
|---|---|---|---|
| UI-001 Button/Icon Button | primary/secondary/danger; loading/disabled | Enter/Space; nama aksesibel; label teks untuk aksi ambigu | CF-001…014 |
| UI-002 Input/textarea/select/search/autocomplete | default/focus/error/disabled | label eksplisit, deskripsi error terhubung; tidak menghapus input | CF-001,003,012 |
| UI-003 Checkbox/radio/switch | checked/mixed/disabled | Space; group/legend; target sentuh | CF-002,008,012 |
| UI-004 Tabs/accordion/dropdown/breadcrumb | selected/open | Arrow sesuai pola; fokus logis | CF-004,005,010 |
| UI-005 Sidebar/topbar/drawer/bottom sheet | expanded/collapsed | Escape tutup, fokus kembali pemicu | CF-002,004,010 |
| UI-006 Card/table/pagination/badge | loading/empty/error | header tabel/sort label; kartu pada mobile | CF-002,003,012 |
| UI-007 Alert/toast/modal/confirmation | info/success/warn/error | error kritis tetap inline/dialog; modal trap fokus | CF-008,009,013 |
| UI-008 Stepper/progress/skeleton/empty/error | active/complete/loading | status diumumkan; recovery action | CF-007,008,014 |
| UI-009 Upload/media picker/toolbar/drag handle/tree/inspector | uploading/invalid/referenced | alternatif tombol dan keyboard; alasan penolakan | CF-004,005 |
| UI-010 Autosave/conflict/QR/flipbook/activity/timer/result | local/saving/saved/pending/conflict | live region secukupnya; timer tidak hanya warna | CF-006,010,011,012 |

### Register Komponen Individual Kanonis

UI-011 sampai UI-032 merupakan komponen individual kanonis. UI-001 sampai UI-010 tetap hanya kelompok kategori, bukan tambahan komponen individual.

| ID | Komponen/tujuan | Varian, properti, state | Mouse/touch; keyboard | SR/responsif/error | Feature/fase |
|---|---|---|---|---|---|
| UI-011 | Button | primary/secondary/danger; disabled/loading | click/tap; Enter/Space | nama aksi; full width mobile; error inline | Semua/MVP |
| UI-012 | Icon Button | icon+tooltip, label wajib bila ambigu | click/tap; Enter/Space | `aria-label`; target 44px | Semua/MVP |
| UI-013 | Text Input/Textarea | value, label, help, error | edit; standard form keys | label/error-describedby; reflow | CF-001/003/MVP |
| UI-014 | Select/Autocomplete | option, loading, no result | pilih; Arrow/Enter/Escape | combobox semantics; fallback mobile | CF-002/012/MVP |
| UI-015 | Checkbox/Radio/Switch | checked/mixed/disabled | tap; Space | fieldset/legend; error text | CF-002/008/MVP |
| UI-016 | Tabs/Accordion | selected/open/disabled | click; Arrow/Home/End | tab roles; stack mobile | CF-004/005/MVP |
| UI-017 | Sidebar/Topbar/Drawer | expanded/collapsed | menu/tap; Escape | focus return; drawer mobile | CF-002/010/MVP |
| UI-018 | Modal/Confirm Dialog | default/critical/loading | confirm/cancel; Escape safe only | trap focus, title/description | CF-008/009/MVP |
| UI-019 | Alert/Toast | info/success/warning/error | dismiss; keyboard reachable | live region; never sole critical error | CF-004/008/MVP |
| UI-020 | Table/Card/Pagination | loading/empty/error | sort/page; keyboard controls | headers; cards mobile | CF-002/012/MVP |
| UI-021 | File Upload/Media Picker | idle/uploading/invalid/referenced | choose/drop; keyboard choose | progress/status; retain failure reason | CF-005/MVP |
| UI-022 | Tree View/Drag Handle | selected/expanded/dragging | drag/touch; Arrow, move up/down buttons | tree roles; no drag-only reorder | CF-003/004/MVP |
| UI-023 | Inspector Panel | five tabs, selection/empty | tab/click; Arrow tabs | labelled region; drawer tablet/mobile | CF-004/MVP |
| UI-024 | Autosave Indicator | local/saving/saved/failed/offline | noninteractive status | polite announcement; no false saved | CF-004/MVP |
| UI-025 | Conflict Resolution Dialog | local/server/structural | choose/cancel; keyboard | compare labelled; no silent overwrite | CF-004/MVP |
| UI-026 | Publish Stepper | 1–5, pass/warning/error | next/back; keyboard | current step announced; error focus | CF-008/MVP |
| UI-027 | QR Preview | satu area P-ADM-013: statis PNG/SVG MVP, dinamis Fase 2 | download/copy; keyboard | dua mode tetap aksesibel/responsif; target invalid memberi error/recovery | CF-011/MVP/F2 |
| UI-028 | Flipbook Navigation | previous/next/TOC/fallback | tap; Arrow only when focus context | labelled controls; single column mobile | CF-010/MVP |
| UI-029 | Activity Question | answer/validation/locked | choose/type; radio keys | question number/status announced | CF-006/MVP |
| UI-030 | Activity Timer | normal/warning/deadline | noninteractive | periodic nonintrusive announcement | CF-006/MVP |
| UI-031 | Answer Sync Status | A/B/C/pending/rejected | retry tap/key where allowed | text+icon, not color only | CF-006/MVP |
| UI-032 | Results Disclosure | open/closed/partial | view retry; keyboard | hidden content not in DOM/payload | CF-012/MVP/F2 |


### Kontrak operasional lanjutan (Revision 02C-3B)

| ID | Properti/state | Interaksi, fokus, responsif | Error/recovery | Feature/fase |
|---|---|---|---|---|
| UI-011 Button | submit/reset/destructive; default/loading/disabled | click/tap/Enter/Space; focus visible; 44px touch | loading lock mencegah double submit; alasan disabled | Semua/MVP |
| UI-012 Icon Button | icon, label, tooltip | click/tap/Enter/Space; `aria-label`; teks bila ambigu | N/A; gunakan UI-019 untuk error | Semua/MVP |
| UI-013 Text Input/Textarea | value/label/helper/error; blur/submit validation | keyboard native; error association; reflow | retensi nilai; error backend di konteks | CF-001/003/MVP |
| UI-014 Select/Autocomplete | options/loading/no-result | Arrow/Enter/Escape; combobox; fallback mobile | pilihan invalid tetap dijelaskan | CF-002/012/MVP |
| UI-015 Checkbox/Radio/Switch | checked/mixed/disabled | tap/Space; fieldset/legend | alasan disabled/error text | CF-002/008/MVP |
| UI-016 Tabs/Accordion | selected/open/disabled | tabs: Arrow/Home/End; accordion: Enter/Space | focus panel; stack mobile | CF-004/005/MVP |
| UI-017 Sidebar/Topbar/Drawer | expanded/collapsed | Escape, focus return, scroll owner/safe-area | jangan sembunyikan aksi kritis; drawer mobile | CF-002/010/MVP |
| UI-018 Modal/Confirm | critical/loading/backdrop policy | trap focus; Escape hanya aman; return focus | destructive loading lock; cancel/recovery jelas | CF-008/009/MVP |
| UI-019 Alert/Toast | info/success/warning/error | dismiss keyboard; live region | toast sementara; alert/dialog untuk error kritis | CF-004/008/MVP |
| UI-020 Table/Card/Pagination | loading/empty/error/sort/filter/page | headers/controls keyboard; card mobile | retry dan empty action inline | CF-002/012/MVP |
| UI-021 File Upload/Media Picker | idle/uploading/invalid/referenced | choose/drop; keyboard choose | tipe lalu ukuran lalu referensi; batas numerik N/A; hapus aset referensi ditolak | CF-005/MVP |
| UI-022 Tree/Drag Handle | selected/expanded/dragging | Arrow; tombol pindah sebagai alternatif drag | umumkan posisi baru; target/reorder gagal dipulihkan | CF-003/004/MVP |
| UI-023 Inspector Panel | five tabs/selection/empty | tab keyboard; drawer tablet/mobile | empty selection dijelaskan; seleksi tetap saat viewport berubah | CF-004/MVP |
| UI-024 Autosave Indicator | local/saving/saved/failed/offline/retry | status polite, noninteraktif | saved hanya pasca konfirmasi backend; lokal dipertahankan | CF-004/MVP |
| UI-025 Conflict Dialog | local/server/conflict/resolution | compare/cancel keyboard; focus trap | CAS; tidak silent overwrite; struktur perlu aksi eksplisit | CF-004/MVP |
| UI-026 Publish Stepper | 5 tahap/pass-warning-error/invalidated | next/back keyboard; fokus ke masalah | Error blokir; revision berubah revalidate; sukses pasca pointer aktif; gagal pointer lama | CF-008/MVP |
| UI-027 QR Preview | satu area P-ADM-013: statis MVP/dinamis Fase 2/target invalid | copy link/download keyboard; tab/segmented control hanya USULAN DESAIN | target eksternal/siklus/status tidak aktif ditolak; lokasi/presentasi Opsi A DECIDED/CLOSED melalui CR-IA-005 | CF-011/MVP/F2 |
| UI-028 Flipbook Navigation | previous/next/TOC/fallback | labelled keyboard controls; fokus heading baru | scroll fallback konten panjang; reduced motion/no autoplay | CF-010/MVP |
| UI-029 Activity Question | answer/validation/locked | radio/type keyboard; touch | kunci/bobot N/A publik; input ditolak jelas | CF-006/MVP |
| UI-030 Activity Timer | normal/warning/deadline | noninteraktif; status SR hemat | server menentukan deadline; reload memakai status server | CF-006/MVP |
| UI-031 Answer Sync Status | A/B/C/pending/offline | teks+ikon, bukan warna | A pasca backend; B tidak final; C penolakan; retry bila sah | CF-006/MVP |
| UI-032 Results Disclosure | open/closed/partial/retry F2 | keyboard view/retry; content SR aman | hasil/kunci privat tidak terkirim; grant tidak timpa hasil; antrean lokal N/A | CF-012/MVP/F2 |


## UX-07 — Public Experience: Cover and Reader

`P-PUB-001` menampilkan sampul, metadata, progres lokal, Mulai/Lanjutkan/Ganti Pembaca. `P-PUB-002` menyediakan TOC `D-PUB-001`, preferensi `D-PUB-002`, navigasi halaman, deep link, dan fallback scroll. Media hanya mulai dari aksi pengguna; halaman hilang `S-APP-007`, unavailable/revoke `S-APP-008/009`.

```text
Desktop: [Header buku][TOC] [←][ halaman A | halaman B / scroll ][→] [A11y]
Mobile : [← Sampul][Judul][TOC][A11y] / konten satu kolom / [Sebelum][Berikut]
```

Fokus drawer berpindah ke judulnya dan kembali ke pemicu saat tutup. Flip dua halaman hanya desktop dan konten cocok; mobile tidak memaksakan flip.

## UX-08 — Activity and Assessment Experience

`P-PUB-006` meminta nama/kelas minimum hanya saat perlu lalu menjelaskan privasi. `P-PUB-007` memiliki instruksi, timer server, nomor soal, status jawaban, simpan, dan finalisasi `M-PUB-001`; `P-PUB-008` hanya mengungkap hasil sesuai disclosure policy. A=backend mengonfirmasi, B=volatile/pending/offline, C=ditolak; UI tidak menyebut tersimpan sebelum A. Deadline menonaktifkan input (`S-APP-012`); reload menampilkan status server terakhir. Retry grant Fase 2 saja. Penyimpanan antrean lokal: **BELUM DIPUTUSKAN** (IA-Q-004); tidak menetapkan IndexedDB.

```text
[Kembali][Timer][Status A/B/C]  Soal 2/8
Instruksi | pertanyaan | pilihan berlabel
[Sebelum] [Simpan] [Kirim jawaban] → konfirmasi → hasil yang diizinkan
```

## UX-09 — Administrator Authentication and Dashboard

`P-ADM-001`: email, kata sandi, tombol masuk, loading, pesan aman pada gagal; tidak ada pendaftaran publik. Sesi habis memakai `S-APP-005`, logout membersihkan sesi. `P-ADM-002`: ringkasan buku, publikasi, kuota, pintasan, empty/error; pengaturan `P-ADM-016` tervalidasi.

```text
Desktop: [Logo][akun] / [nav] [ringkasan][kuota][buku terbaru][aksi]
Mobile : [Menu][Dashboard] / kartu vertikal / tombol aksi berlabel
```

## UX-10 — Book and Structure Management UI

`P-ADM-003/004/005` mencakup daftar/cari/filter, buat buku, metadata, slug/alias, cover, struktur, duplicate, archive/delete. Reorder drag disertai tombol pindah atas/bawah dan keyboard; UUID tidak ditampilkan sebagai nomor urut dan tetap stabil. Form menahan nilai pada slug/struktur invalid; aksi destruktif memakai dialog sebab-akibat dan tidak menghapus snapshot/hasil.

## UX-11 — Visual Editor UI

`P-ADM-006` desktop: struktur/pustaka | canvas terpilih | inspector lima tab, toolbar dengan undo/redo, preview, status autosave. Tablet menukar panel secara konteks tanpa kehilangan seleksi; mobile memberi editing terbatas dan mengarahkan operasi struktur kompleks ke desktop tanpa memblokir konten dasar. Mode Blok MVP; grid responsif terbatas Fase 2; nesting maksimal tiga.

Autosave: belum berubah → lokal → menyimpan → tersimpan; gagal/menunggu koneksi mempertahankan draf; konflik membuka `M-ADM-001`/`S-APP-011`. Dialog membedakan perubahan struktural dan nonstruktural, menyediakan muat versi server/simpan perubahan aman bila tersedia, dan tidak pernah silent overwrite.

```text
Desktop [Toolbar: Undo Redo Preview Publish]
[Tree/Library] | [Canvas: selected block] | [Inspector: Content|Style|Layout|Behavior|A11y]
Tablet  [Toolbar] [Canvas] [panel konteks sebagai drawer]
Mobile  [Back][judul][status] / canvas / [Tambah][Inspector] sheet
```

## UX-12 — Components, Theme, and Media UI

Library menambah komponen sesuai PRD; inspector mengubah properti dan alt/ARIA. Tema mewaris Buku→Halaman→Komponen, preset MVP Minimal/Alam; grid/preset tambahan Fase 2. `P-ADM-007` menampilkan upload/progress, reuse, validasi dan alasan penolakan; batas ukuran/tipe kuantitatif **BELUM DIPUTUSKAN**. Embed allowlist, sanitasi, dan status media direferensikan melindungi hapus aset snapshot/sesi.

## UX-13 — Preview, Publish, and Version Lifecycle UI

Quick/fullscreen preview `P-ADM-009` menawarkan viewport desktop/tablet/mobile dan test mode terisolasi. `W-ADM-001` memiliki lima step: konten, aktivitas, tampilan/tema, pengaturan, konfirmasi; Error memblokir, Warning dijelaskan, draf berubah memicu revalidasi. Tombol publish disabled/loading mencegah double click; sukses hanya setelah backend mengaktifkan pointer, gagal `S-APP-010` mempertahankan pointer lama.

`P-ADM-011` riwayat versi menampilkan rollback terverifikasi. `M-ADM-002` membedakan unpublish grace, immediate block, emergency revoke dengan dampak/audit; tidak menyatakan nilai siswa menjadi nol.

## UX-14 — QR, Deep Link, and Analytics UI

`P-ADM-013` adalah satu area pengelolaan QR dengan dua mode sesuai pilihan pemilik: QR statis MVP untuk salin tautan serta ekspor PNG/SVG menuju target publikasi sah; QR dinamis Fase 2 untuk target internal aktif, penolakan target eksternal/siklus, resolusi short code yang tetap memeriksa status publikasi, dan analitik agregat harian Asia/Jakarta non-PII. Tidak ada route baru dan mode dinamis tidak boleh ditampilkan seolah sudah berfungsi pada MVP. Tab atau segmented control hanyalah **USULAN DESAIN**; IA-Q-005 telah DECIDED/CLOSED melalui CR-IA-005 dan FS-DOC-03 `v1.0.1-approved-locked` telah APPROVED & LOCKED setelah CR-IA-005-RELOCK.

## UX-15 — Results and Reporting UI

`P-ADM-014` menampilkan filter, daftar hasil, detail percobaan, status finalisasi, loading/empty/error untuk admin berotorisasi. `P-PUB-008` membatasi hasil/kunci sesuai disclosure; data siswa tidak di URL publik. `M-ADM-003` retry grant Fase 2, sekali pakai, dan tidak menimpa hasil lama.

## UX-16 — Feedback, States, and Error Handling

| State | Trigger/tampilan/recovery | Aksesibilitas/feature |
|---|---|---|
| Default/hover/focus/active/selected/disabled | state kontrol konsisten; focus terlihat | keyboard; UI-001…006 |
| Loading/saving/saved | skeleton/status dekat operasi; tidak sukses prematur | live region hemat; CF-004/008 |
| Pending/offline | Status B dan retry; data lokal tidak diklaim final | teks+ikon; CF-006 |
| Warning/error/conflict | inline dekat konteks + dialog bila kritis | fokus ke error; CF-004/005/008 |
| Empty/expired/unavailable/revoked | action relevan, pesan aman | tidak bocor data; CF-001/009/010 |

Toast bukan satu-satunya error kritis; `S-APP-001…012` mengikuti alur APP_FLOW.

### Register state/error individual APP_FLOW (Revision 01)

| State ID | Trigger/kondisi awal | Perubahan UI/pesan | Aksi/recovery | Aksesibilitas | Flow |
|---|---|---|---|---|---|
| UX-ERR-001 | Kredensial salah | Pesan aman tanpa enumerasi akun | Masukkan ulang kredensial | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-001, AF-03-001 |
| UX-ERR-002 | JWT tidak valid/kedaluwarsa | Tolak akses; minta login ulang | Autentikasi ulang | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-027, AF-03-001 |
| UX-ERR-003 | Klien anon mencoba membaca/menulis data privat | 401/403 atau respons tanpa data | Tidak ada; gunakan jalur berotorisasi | Error diumumkan dekat konteks; fokus ke recovery. | AF-03-002, AF-03-024 |
| UX-ERR-004 | Tidak ada versi aktif | Halaman informatif; tidak bocorkan draf | Admin terbitkan bila berwenang | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-001, AF-01-017 |
| UX-ERR-005 | Stable ID tidak ada pada snapshot aktif | Halaman pengganti dengan pilihan eksplisit | Reader memilih beranda/TOC | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-004, AF-01-016 |
| UX-ERR-006 | Alias slug cocok | Redirect aman ke slug sah | Lanjutkan ke URL baru | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-001, AF-03-010 |
| UX-ERR-007 | Short code tidak ada, eksternal, siklus, atau target tidak aktif | Halaman QR tidak tersedia; tidak redirect eksternal | Admin perbaiki/nonaktifkan QR | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-006, AF-03-022 |
| UX-ERR-008 | Expected revision tidak cocok | Dialog perbandingan; API menolak overwrite | Resolusi manual untuk struktur; merge aman hanya non-struktural | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-010, AF-03-003 |
| UX-ERR-009 | File/validasi/hash/media publik gagal | Tampilkan kegagalan per berkas; publish diblokir bila dependensi belum siap | Unggah ulang/perbaiki aset lalu verifikasi ulang | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-011, AF-03-005, AF-03-006 |
| UX-ERR-010 | Error Tahap 1–4 | Error pemblokir dan daftar perbaikan | Perbaiki draf, jalankan ulang validasi | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-014, AF-03-007 |
| UX-ERR-011 | Revision saat publish berbeda | Publish ditolak; wizard minta validasi ulang | Simpan/selesaikan konflik lalu validasi ulang | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-010, AF-02-015, AF-03-007 |
| UX-ERR-012 | Media/DB/commit gagal | Status gagal; tidak ada sukses parsial | Perbaiki penyebab dan ulangi publish | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-015, AF-03-008, AF-03-009 |
| UX-ERR-013 | Jaringan putus sebelum konfirmasi | Status B: belum tersimpan di server | Kirim ulang sebelum deadline; tanpa janji offline penuh | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-010, AF-03-012 |
| UX-ERR-014 | Waktu UTC server melewati deadline | Status C; API menolak jawaban baru | Finalisasi idempoten | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-012, AF-03-013, AF-03-014 |
| UX-ERR-015 | Retry jaringan atau double click | Kembalikan hasil/konfirmasi identik | Klien gunakan respons yang sama | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-011, AF-03-012, AF-03-014 |
| UX-ERR-016 | Klien berhenti sebelum finalisasi | Saat akses berikutnya, status sesi ditampilkan | Buka lagi sebelum deadline atau lihat hasil | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-012, AF-03-013 |
| UX-ERR-017 | Admin memilih immediate block | Reader/API segera tidak tersedia | Terbitkan ulang sesuai kewenangan | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-017, AF-03-019 |
| UX-ERR-018 | Admin revoke darurat | Semua rute/operasi publik diblokir | Audit lalu terbitkan ulang bila disetujui | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-018, AF-03-020 |
| UX-ERR-019 | Kode salah, kedaluwarsa, atau consumed | Tolak tanpa membuat sesi baru | Minta grant baru dari admin (Fase 2) | Error diumumkan dekat konteks; fokus ke recovery. | AF-01-014, AF-02-023, AF-03-017 |
| UX-ERR-020 | Dependensi snapshot target gagal diverifikasi | Modal rollback dibatalkan | Pulihkan/verifikasi media lalu ulangi | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-019, AF-03-021 |
| UX-ERR-021 | Batas kuota/ambang kritis tercapai | Peringatan dashboard atau tolak unggah dengan alasan | Bersihkan hanya aset tanpa dependensi atau minta keputusan biaya | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-025, AF-03-028 |
| UX-ERR-022 | Arsip DB/media atau uji restore tidak lengkap | Peringatan kegagalan dan status tidak siap | Perbaiki arsip, ulangi backup dan restore test | Error diumumkan dekat konteks; fokus ke recovery. | AF-02-026, AF-03-027 |

## UX-17 — Accessibility Specification

Baseline WCAG 2.1 AA: semantic HTML, urutan fokus logis, focus visible, label/form error, kontras, resize/reflow, keyboard, target sentuh, dialog trap/return focus, dan reduced motion. Reader memakai TOC/flip yang dapat dioperasikan keyboard, fallback scroll, caption/transkrip bila media menyediakannya, tanpa autoplay. Editor/tree/drag memiliki alternatif keyboard/tombol; assessment/timer menyampaikan status dengan teks dan tidak bergantung warna.

| Uji | Metode | Cakupan |
|---|---|---|
| Keyboard/fokus | Tab, Shift+Tab, Escape, Enter/Space | drawer, dialog, editor, aktivitas |
| Kontras/reflow | pemeriksa AA + zoom | Reader, form, status |
| SR | nama/peran/status | timer, autosave, error, publish |
| Motion/media | reduced motion, tanpa aksi pengguna | flip, transisi, media |

## UX-18 — Privacy, Security, and Trust UX

UI login/sesi habis memberi pesan aman, tetapi tidak menggantikan RLS/otorisasi backend. Aktivitas menjelaskan data minimum, tidak mengekspos token/kunci/bobot, dan disclosure membatasi hasil. Operasi publish/revoke/delete memakai konfirmasi dampak dan feedback audit. QR analytics non-invasif; Ganti Pembaca menjelaskan pembersihan konteks lokal. Error publik tidak membeberkan data privat.

## UX-19 — UI/UX Acceptance Criteria

| ID | Cakupan | Fase | Feature | Referensi Baseline | Given–When–Then | Metode Verifikasi |
|---|---|---|---|---|---|---|
| UI-AC-001 | Login | MVP | CF-001 | AC-ADM-001 | Given sesi salah, when privat dibuka, then data ditolak dan login aman tampil. | keyboard + respons server |
| UI-AC-002 | Struktur | MVP | CF-003 | AC-BOK-001 | Given reorder, when simpan, then UUID tidak berubah. | inspeksi respons |
| UI-AC-003 | Autosave | MVP | CF-004 | CF-AC-006 | Given revisi stale, when save, then dialog konflik tanpa overwrite. | dua sesi |
| UI-AC-004 | Media | MVP | CF-005 | AC-MED-001 | Given aset direferensikan, when hapus, then alasan penolakan tampil. | validasi |
| UI-AC-005 | Aktivitas/timer | MVP | CF-006 | CF-AC-010/011 | Given telat/ulang kirim, when backend proses, then C/satu hasil jujur tampil. | UTC/idempotensi |
| UI-AC-006 | Publish | MVP | CF-008 | CF-AC-014/015 | Given Error/gagal, when publish, then blok/pointer lama terjaga. | simulasi backend |
| UI-AC-007 | Lifecycle | MVP | CF-009 | CF-AC-017/018 | Given revoke/rollback, when konfirmasi, then dampak benar dan terverifikasi. | alur kritis |
| UI-AC-008 | Reader | MVP | CF-010 | CF-AC-019/020 | Given mobile/keyboard, when Reader digunakan, then scroll/fokus/no-autoplay berlaku. | viewport + keyboard |
| UI-AC-009 | Link/QR | MVP/Fase 2 | CF-011 | CF-AC-021/022 | Given target hilang/invalid, when dibuka/simpan, then pilihan/penolakan jelas. | deep link |
| UI-AC-010 | Hasil/privacy | MVP/Fase 2 | CF-012, CF-013 | CF-AC-023/024 | Given hasil tertutup/anon, when akses, then data privat tak tampil. | otorisasi |
| UI-AC-011 | Recovery | MVP/Fase 2 | CF-014 | CF-AC-025/026 | Given backup/kuota bermasalah, when status muncul, then recovery tanpa biaya otomatis. | simulasi |
| UI-AC-012 | Login gagal | MVP | CF-001 | AC-ADM-001 | Given kredensial salah, when masuk, then pesan aman tanpa detail akun. | respons UI |
| UI-AC-013 | Sesi habis | MVP | CF-001 | FR-ADM-002 | Given sesi habis, when aksi privat, then login ulang tanpa data privat. | simulasi expiry |
| UI-AC-014 | Dashboard loading | MVP | CF-002 | FR-ADM-003 | Given data memuat, when buka dashboard, then skeleton/status tampil. | throttle |
| UI-AC-015 | Dashboard error | MVP | CF-002 | FR-ADM-003 | Given gagal muat, when respons gagal, then retry dan pesan aman tampil. | error response |
| UI-AC-016 | Autosave sukses | MVP | CF-004 | NFR-PERF-002 | Given perubahan valid, when backend mengonfirmasi, then status Tersimpan tampil. | response |
| UI-AC-017 | Autosave gagal | MVP | CF-004 | AC-EDT-003 | Given koneksi gagal, when save, then perubahan lokal dan recovery jelas. | offline |
| UI-AC-018 | Upload media | MVP | CF-005 | FR-MED-001 | Given media invalid, when upload, then alasan dan retry tampil. | invalid file |
| UI-AC-019 | Reader desktop | MVP | CF-010 | AC-RDR-002 | Given konten cocok, when desktop, then dua halaman/fallback benar. | viewport |
| UI-AC-020 | Reader mobile | MVP | CF-010 | FR-RDR-004 | Given mobile, when Reader, then satu kolom tanpa hover/flip wajib. | viewport |
| UI-AC-021 | Keyboard Reader | MVP | CF-010 | NFR-ACC-002 | Given keyboard, when TOC/kontrol, then fokus dan aksi dapat dipakai. | keyboard |
| UI-AC-022 | Status A/B/C | MVP | CF-006 | FR-ACT-005 | Given respons server/pending/ditolak, when simpan, then label A/B/C tepat. | network |
| UI-AC-023 | Offline aktivitas | MVP | CF-006 | FR-ACT-006 | Given offline, when jawab, then tidak ada klaim tersimpan final. | offline |
| UI-AC-024 | Deadline | MVP | CF-006 | AC-ACT-002 | Given lewat UTC, when kirim, then input terkunci/status C. | clock |
| UI-AC-025 | Finalisasi | MVP | CF-006 | AC-ACT-005 | Given klik ulang, when finalisasi, then satu hasil dan tombol terkunci. | repeat |
| UI-AC-026 | Publish sukses | MVP | CF-008 | FR-PUB-004 | Given backend aktifkan pointer, when sukses, then status aktif baru tampil. | response |
| UI-AC-027 | Rollback | MVP | CF-009 | AC-PUB-005 | Given target valid, when konfirmasi, then pointer berganti atomik. | lifecycle |
| UI-AC-028 | Unpublish | MVP | CF-009 | AC-PUB-003 | Given grace, when unpublish, then dampak sesi dijelaskan. | lifecycle |
| UI-AC-029 | Revoke | MVP | CF-009 | AC-PUB-004 | Given revoke, when konfirmasi, then akses diblok tanpa nilai nol. | lifecycle |
| UI-AC-030 | Ganti Pembaca | MVP | CF-010 | AC-RDR-003 | Given konfirmasi, when ganti pembaca, then konteks lokal dibersihkan. | local state |
| UI-AC-031 | Privacy hasil | MVP | CF-012 | AC-ACT-001 | Given disclosure tertutup, when hasil dibuka, then kunci tidak terkirim. | payload |
| UI-AC-032 | Recovery | MVP | CF-014 | AC-REL-001 | Given restore gagal, when status tampil, then recovery aman tersedia. | failure |
| UI-AC-033 | Sampul/progres | MVP | CF-010 | FR-RDR-001, FR-RDR-002, FR-RDR-006; CF-AC-019 | Given progres lokal tersedia, when sampul dibuka, then Lanjutkan ditampilkan tanpa akun. | local-state test |
| UI-AC-034 | Identitas minimum | MVP | CF-006 | FR-ACT-001, FR-ACT-002; CF-AC-012 | Given aktivitas membutuhkan identitas, when mulai, then hanya nama/kelas minimum diminta dan privasi dijelaskan. | form/payload |
| UI-AC-035 | Kode retry siswa | Fase 2 | CF-012 | FR-ACT-008, AC-ACT-003; CF-AC-023 | Given kode valid sekali pakai, when dikonsumsi, then sesi baru dibuat tanpa menimpa nilai lama. | backend lifecycle |
| UI-AC-036 | Daftar/cari/filter buku | MVP | CF-003 | FR-BOK-001; CF-AC-004 | Given koleksi berisi atau kosong, when cari/filter digunakan, then hasil atau empty state benar ditampilkan. | list-state test |
| UI-AC-037 | Arsip buku | MVP | CF-003 | FR-BOK-001; CF-AC-004 | Given admin memilih arsip, when konfirmasi, then buku diarsip tanpa menghapus snapshot/hasil historis. | confirmation/lifecycle |
| UI-AC-038 | Metadata/slug/alias | MVP | CF-003 | FR-BOK-003, FR-LNK-002; CF-AC-005 | Given slug diubah, when validasi selesai, then UUID tetap dan alias/error dijelaskan. | backend response |
| UI-AC-039 | Konfigurasi aktivitas MVP | MVP | CF-006 | FR-ACT-003, FR-ACT-004; CF-AC-012 | Given admin menyimpan konfigurasi MVP, when valid, then properti yang didukung tersimpan tanpa mengirim kunci/bobot publik. | payload inspection |
| UI-AC-040 | Konfigurasi aktivitas Fase 2 | Fase 2 | CF-006 | FR-ACT-004; CF-AC-012 | Given kemampuan multi-attempt/agregasi/retry tersedia, when disimpan, then konfigurasi tervalidasi dan tetap privat. | phase-gated test |
| UI-AC-041 | Preview/test mode | MVP | CF-007 | FR-PRV-001, FR-PRV-002, FR-PRV-003; CF-AC-013 | Given test mode, when submit simulasi, then hasil produksi tidak berubah. | isolated test |
| UI-AC-042 | QR statis | MVP | CF-011 | FR-LNK-004, FR-LNK-007; CF-AC-021 | Given buku terbit, when QR diekspor, then PNG/SVG dan copy link menuju buku sah. | download/link |
| UI-AC-043 | QR dinamis — target, simpan, resolusi | Fase 2 | CF-011 | FR-LNK-005, FR-LNK-006, AC-LNK-002, AC-LNK-004, CF-AC-022 | Given admin memilih target internal, when konfigurasi QR dinamis disimpan atau short code diresolusikan, then target eksternal, siklus, atau target tidak aktif ditolak dan resolusi tidak melewati status publikasi. | Validation + resolution test |
| UI-AC-044 | Analitik QR agregat non-PII | Fase 2 | CF-011 | FR-LNK-008 | Given QR dinamis sah diresolusikan, when administrator berotorisasi membuka metrik, then hanya data agregat non-PII harian Asia/Jakarta ditampilkan tanpa mengekspos identitas siswa atau pengenal perangkat. | Authorization + data/payload inspection |
| UI-AC-045 | Hasil admin | MVP | CF-012 | FR-ACT-007; CF-AC-023 | Given admin sah, when memfilter/membuka detail, then hasil dan status finalisasi sesuai otorisasi tampil. | auth/filter test |
| UI-AC-046 | Hasil admin state | MVP | CF-012 | FR-ACT-007; CF-AC-023 | Given hasil loading, kosong, atau gagal, when area dibuka, then state dan recovery relevan tampil. | response-state test |
| UI-AC-047 | Retry grant admin | Fase 2 | CF-012 | FR-ACT-008, AC-ACT-003; CF-AC-023 | Given hasil tertentu, when grant diterbitkan, then kode sekali pakai dapat disalin tanpa mengubah nilai lama. | lifecycle |
| UI-AC-048 | Pengaturan aplikasi | MVP | CF-002 | FR-ADM-005; CF-AC-003 | Given pengaturan invalid, when disimpan, then error kontekstual tampil dan nilai sebelumnya dipertahankan. | validation |
| UI-AC-049 | Kuota/backup | MVP | CF-014 | NFR-CST-001, NFR-CST-002, NFR-REL-003; CF-AC-025, CF-AC-026 | Given kuota kritis atau backup gagal, when status diterima, then warning/recovery tampil tanpa biaya otomatis. | simulated status |
| UI-AC-050 | Loading generik | MVP | CF-014 | NFR-REL-001; CF-AC-015 | Given backend belum merespons, when operasi memuat, then UI tidak menyatakan sukses dan mencegah aksi ganda. | delayed response |
| UI-AC-051 | Empty state | MVP | CF-002 | FR-ADM-003; CF-AC-003 | Given data tidak ada, when area dibuka, then empty state memberi tindakan relevan. | empty response |
| UI-AC-052 | Unauthorized | MVP | CF-013 | NFR-SEC-001, AC-SEC-001; CF-AC-024 | Given akses privat ditolak, when respons diterima, then pesan aman tampil tanpa data privat. | authorization |


## UX-20 — Traceability Matrix

Register kanonis UX-20 terdiri dari empat kelompok individual di bawah ini. Konsolidasi ini tidak mengubah nilai sel pada register individual.

**Ringkasan konsolidasi (berdasarkan register aktual):** 41 IA ID unik tercakup: 11 publik, 18 administrator, dan 12 state sistem non-halaman. Status: 41 VALID, 0 PARTIAL, 0 UNMAPPED, 0 CONFLICT. Tersedia 22 komponen individual kanonis, 52 UI-AC, 15 wireframe tekstual, dan 22 UX-ERR. VALID menyatakan kelengkapan spesifikasi traceability, bukan bukti implementasi atau pengujian aplikasi.

**Catatan audit lokasi UX:** `P-PUB-009` mempertahankan UX-08/UX-15; `M-PUB-002` mempertahankan UX-07/UX-08, dengan relevansi UX-08 bersifat kontekstual dan tidak menetapkan lokasi modal final; `P-ADM-017` menggunakan UX-09, UX-16, UX-18.

### Register traceability individual — inventory publik (Revision 02B-2A)

| IA ID/Jenis/Nama | UX | UI Component | Feature | Flow | Requirement | CF-AC | UI-AC | Fase | Status/Catatan |
|---|---|---|---|---|---|---|---|---|---|
| P-PUB-001 / Halaman / Sampul, metadata, progres | UX-07 | UI-011, UI-017, UI-028 | CF-010 | AF-01-001 | FR-RDR-001, FR-RDR-002, FR-RDR-006, AC-RDR-001 | CF-AC-019, CF-AC-020 | UI-AC-019, UI-AC-020, UI-AC-033 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| P-PUB-002 / Halaman / Reader snapshot | UX-07 | UI-017, UI-028 | CF-010 | AF-01-002, AF-01-003, AF-01-007 | FR-RDR-003, FR-RDR-004, FR-RDR-005, AC-RDR-002 | CF-AC-019, CF-AC-020 | UI-AC-008, UI-AC-019, UI-AC-020, UI-AC-021 | MVP | VALID |
| P-PUB-004 / Halaman / Tujuan deep link | UX-14 | UI-011, UI-019 | CF-011 | AF-01-004 | FR-LNK-001, FR-LNK-003, AC-LNK-003 | CF-AC-021 | UI-AC-009 | MVP | VALID |
| P-PUB-006 / Halaman / Identitas minimal | UX-08 | UI-013, UI-011, UI-019 | CF-006 | AF-01-009 | FR-ACT-001, FR-ACT-002, AC-ACT-006 | CF-AC-012 | UI-AC-022, UI-AC-034 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| P-PUB-007 / Halaman / Soal, timer, status simpan | UX-08 | UI-029, UI-030, UI-031 | CF-006 | AF-01-010, AF-01-012 | FR-ACT-005, FR-ACT-006, AC-ACT-002, AC-ACT-004 | CF-AC-010, CF-AC-011 | UI-AC-005, UI-AC-022, UI-AC-023, UI-AC-024, UI-AC-025 | MVP | VALID |
| P-PUB-008 / Halaman / Hasil yang diizinkan | UX-08, UX-15 | UI-032, UI-019 | CF-012 | AF-01-013 | FR-ACT-007, AC-ACT-001 | CF-AC-023 | UI-AC-031 | MVP | VALID |
| P-PUB-009 / Halaman / Masukkan kode retry | UX-08, UX-15 | UI-013, UI-011, UI-032 | CF-012 | AF-01-014 | FR-ACT-008, AC-ACT-003 | CF-AC-023 | UI-AC-035 | Fase 2 | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| D-PUB-001 / Drawer / TOC terstruktur | UX-07 | UI-017, UI-028 | CF-010 | AF-01-003 | FR-BOK-006, FR-RDR-005 | CF-AC-020 | UI-AC-021 | MVP | VALID |
| D-PUB-002 / Panel / Preferensi aksesibilitas | UX-07, UX-17 | UI-017, UI-016 | CF-010 | AF-01-008 | FR-RDR-007, NFR-ACC-001, NFR-ACC-002 | CF-AC-020 | UI-AC-020, UI-AC-021 | MVP | VALID |
| M-PUB-001 / Modal / Konfirmasi kirim jawaban | UX-08 | UI-018, UI-011 | CF-006 | AF-01-011 | NFR-REL-002, AC-ACT-005 | CF-AC-011 | UI-AC-005, UI-AC-025 | MVP | VALID |
| M-PUB-002 / Modal / Konfirmasi Ganti Pembaca | UX-07, UX-08 | UI-018, UI-011 | CF-010 | AF-01-015 | FR-RDR-009, AC-RDR-003 | CF-AC-020 | UI-AC-030 | MVP | VALID |

### Register traceability individual — administrator kelompok 1 (Revision 02B-2B)

| IA ID/Jenis/Nama | UX | UI Component | Feature | Flow | Requirement | CF-AC | UI-AC | Fase | Status/Catatan |
|---|---|---|---|---|---|---|---|---|---|
| P-ADM-001 / Halaman / Login | UX-09 | UI-011, UI-013, UI-019 | CF-001 | AF-02-001, AF-02-027 | FR-ADM-001, FR-ADM-002, AC-ADM-001 | CF-AC-001, CF-AC-002 | UI-AC-001, UI-AC-012, UI-AC-013 | MVP | VALID — tanpa pendaftaran publik. |
| P-ADM-002 / Halaman / Dashboard dan kuota | UX-09 | UI-017, UI-020, UI-019 | CF-002 | AF-02-002, AF-02-025 | FR-ADM-003, NFR-CST-001, AC-CST-001 | CF-AC-003 | UI-AC-014, UI-AC-015 | MVP | VALID |
| P-ADM-003 / Halaman / Koleksi buku dan tindakan | UX-10 | UI-011, UI-014, UI-020, UI-018 | CF-003 | AF-02-003, AF-02-028 | FR-BOK-001 | CF-AC-004 | UI-AC-036, UI-AC-037 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| P-ADM-004 / Halaman / Metadata dan slug | UX-10 | UI-013, UI-011, UI-019 | CF-003 | AF-02-004 | FR-BOK-001, FR-BOK-003, FR-LNK-002, AC-LNK-001 | CF-AC-005 | UI-AC-038 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| P-ADM-005 / Halaman / Struktur bab dan halaman | UX-10 | UI-022, UI-011, UI-018, UI-019 | CF-003 | AF-02-005, AF-02-006 | FR-BOK-002, FR-BOK-004, FR-BOK-005, AC-BOK-001 | CF-AC-004 | UI-AC-002 | MVP | VALID — drag memiliki alternatif keyboard/tombol. |
| P-ADM-006 / Halaman / Editor tiga panel | UX-11 | UI-016, UI-022, UI-023, UI-024, UI-025 | CF-004 | AF-02-007, AF-02-008, AF-02-009, AF-02-010 | FR-EDT-001, FR-EDT-005, FR-EDT-006, FR-EDT-007, FR-EDT-008, AC-EDT-001, AC-EDT-002, AC-EDT-003 | CF-AC-006, CF-AC-007 | UI-AC-003, UI-AC-016, UI-AC-017 | MVP | VALID — autosave memakai kontrol revisi. |
| M-ADM-001 / Modal / Perbandingan konflik revisi | UX-11 | UI-018, UI-025, UI-011 | CF-004 | AF-02-010 | FR-EDT-007, AC-EDT-002, AC-EDT-003 | CF-AC-006, CF-AC-007 | UI-AC-003, UI-AC-017 | MVP | VALID — tidak ada silent overwrite. |
| P-ADM-007 / Halaman/panel / Media dan dependensi | UX-12 | UI-021, UI-020, UI-018, UI-019 | CF-005 | AF-02-011, AF-02-028 | FR-MED-001, FR-MED-002, FR-MED-003, AC-MED-001 | CF-AC-008, CF-AC-009 | UI-AC-004, UI-AC-018 | MVP | VALID — aset snapshot/sesi terlindungi. |
| P-ADM-008 / Halaman/panel / Aktivitas, kunci dan bobot privat | UX-12 | UI-013, UI-015, UI-016, UI-019 | CF-006 | AF-02-012 | FR-ACT-003, FR-ACT-004, AC-ACT-001 | CF-AC-012 | UI-AC-039, UI-AC-040 | MVP/Fase 2 | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |

### Register traceability individual — administrator kelompok 2 (Revision 02B-2C)

| IA ID/Jenis/Nama | UX | UI Component | Feature | Flow | Requirement | CF-AC | UI-AC | Fase | Status/Catatan |
|---|---|---|---|---|---|---|---|---|---|
| P-ADM-009 / Modal/halaman / Preview dan test mode | UX-13 | UI-011, UI-016, UI-028, UI-019 | CF-007 | AF-02-013 | FR-PRV-001, FR-PRV-002, FR-PRV-003 | CF-AC-013 | UI-AC-041 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| W-ADM-001 / Wizard / Lima tahap publish | UX-13 | UI-026, UI-011, UI-019, UI-018 | CF-008 | AF-02-014, AF-02-015 | FR-PUB-001, FR-PUB-002, FR-PUB-003, FR-PUB-004, AC-PUB-001, AC-PUB-002 | CF-AC-014, CF-AC-015 | UI-AC-006, UI-AC-026 | MVP | VALID — Error memblokir, aktivasi menunggu backend. |
| P-ADM-011 / Halaman / Riwayat snapshot | UX-13 | UI-020, UI-018, UI-011, UI-019 | CF-009 | AF-02-019 | FR-PUB-008, AC-PUB-005 | CF-AC-018 | UI-AC-007, UI-AC-027 | MVP | VALID — rollback setelah verifikasi target. |
| M-ADM-002 / Modal / Unpublish/revoke | UX-13 | UI-018, UI-011, UI-019 | CF-009 | AF-02-017, AF-02-018 | FR-PUB-006, FR-PUB-007, AC-PUB-003, AC-PUB-004 | CF-AC-017 | UI-AC-007, UI-AC-028, UI-AC-029 | MVP | VALID — grace, immediate, dan revoke dibedakan. |
| P-ADM-013 / Halaman / Ekspor dan kelola QR | UX-14 | UI-027, UI-011, UI-013, UI-019 | CF-011 | AF-02-020, AF-02-021 | FR-LNK-004, FR-LNK-005, FR-LNK-006, FR-LNK-007, FR-LNK-008, AC-LNK-002, AC-LNK-004 | CF-AC-021, CF-AC-022 | UI-AC-009, UI-AC-042, UI-AC-043, UI-AC-044 | MVP/Fase 2 | VALID — QR statis adalah MVP; QR dinamis dan analitik adalah Fase 2. IA-Q-005 DECIDED/CLOSED melalui CR-IA-005; VALID bukan bukti implementasi atau pengujian. |
| P-ADM-014 / Halaman / Hasil aktivitas | UX-15 | UI-020, UI-014, UI-032, UI-019 | CF-012 | AF-02-022 | FR-ACT-007, NFR-SEC-004 | CF-AC-023 | UI-AC-010, UI-AC-031, UI-AC-045, UI-AC-046 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| M-ADM-003 / Modal / Retry grant | UX-15 | UI-018, UI-013, UI-011, UI-019 | CF-012 | AF-02-023 | FR-ACT-008, AC-ACT-003 | CF-AC-023 | UI-AC-047 | Fase 2 | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| P-ADM-016 / Halaman / Pengaturan aplikasi | UX-09 | UI-013, UI-015, UI-011, UI-019 | CF-002 | AF-02-024 | FR-ADM-005 | CF-AC-003 | UI-AC-048 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| P-ADM-017 / Halaman / Kuota dan backup | UX-09, UX-16, UX-18 | UI-020, UI-019, UI-011, UI-018 | CF-014 | AF-02-025, AF-02-026 | NFR-CST-001, NFR-CST-002, NFR-REL-003, AC-CST-001, AC-REL-001 | CF-AC-025, CF-AC-026 | UI-AC-011, UI-AC-032, UI-AC-049 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |

### Register traceability individual — state sistem (Revision 02B-2D)

| IA ID/Jenis/Nama | UX | UI Component | Feature | Flow | Requirement | CF-AC | UI-AC | Fase | Status/Catatan |
|---|---|---|---|---|---|---|---|---|---|
| S-APP-001 / State / Loading | UX-16 | UI-020, UI-019 | CF-014 | AF-01-001, AF-02-015 | NFR-REL-001 | CF-AC-015 | UI-AC-014, UI-AC-050 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| S-APP-002 / State / Empty | UX-16 | UI-020, UI-011 | CF-002 | AF-02-002, AF-02-022 | FR-ADM-003 | CF-AC-003 | UI-AC-051 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| S-APP-003 / State / Validation error | UX-16 | UI-019, UI-026, UI-013 | CF-008 | AF-02-014, AF-03-007 | FR-PUB-002, AC-PUB-001 | CF-AC-014 | UI-AC-006 | MVP | VALID — state non-halaman; Error publish memblokir. |
| S-APP-004 / State / Network error | UX-16 | UI-019, UI-031, UI-011 | CF-006 | AF-01-010, AF-01-012 | FR-ACT-005, FR-ACT-006 | CF-AC-010, CF-AC-011 | UI-AC-022, UI-AC-023 | MVP | VALID — state non-halaman; tidak mengklaim tersimpan final. |
| S-APP-005 / State / Sesi admin berakhir | UX-09, UX-16 | UI-019, UI-011, UI-013 | CF-001 | AF-02-027, AF-03-001 | FR-ADM-002, AC-ADM-001 | CF-AC-002 | UI-AC-013 | MVP | VALID — state non-halaman; login ulang tanpa data privat. |
| S-APP-006 / State / Unauthorized/Forbidden | UX-16, UX-18 | UI-019, UI-011 | CF-013 | AF-03-001, AF-03-002, AF-03-024 | NFR-SEC-001, AC-SEC-001 | CF-AC-024 | UI-AC-010, UI-AC-052 | MVP | VALID — pemetaan UI-AC kini tersedia; belum membuktikan implementasi. |
| S-APP-007 / State / Halaman/deep link hilang | UX-07, UX-14, UX-16 | UI-019, UI-011 | CF-011 | AF-01-016 | FR-LNK-003, AC-LNK-003 | CF-AC-021 | UI-AC-009, UI-AC-021 | MVP | VALID — state non-halaman; pilihan eksplisit tanpa redirect diam-diam. |
| S-APP-008 / State / Unpublish/revoke | UX-13, UX-16 | UI-019, UI-011 | CF-009 | AF-01-017 | FR-PUB-006, FR-PUB-007 | CF-AC-017 | UI-AC-028, UI-AC-029 | MVP | VALID — state non-halaman; tidak membuka konten. |
| S-APP-009 / State / Emergency revoke | UX-13, UX-16 | UI-019, UI-018 | CF-009 | AF-01-017, AF-03-020 | FR-PUB-007, AC-PUB-004 | CF-AC-017 | UI-AC-029 | MVP | VALID — state non-halaman; tanpa nilai nol otomatis. |
| S-APP-010 / State / Publish gagal | UX-13, UX-16 | UI-019, UI-026, UI-011 | CF-008 | AF-02-015, AF-03-009 | FR-PUB-004, AC-PUB-002 | CF-AC-015 | UI-AC-006 | MVP | VALID — state non-halaman; pointer lama utuh. |
| S-APP-011 / State / Konflik autosave | UX-11, UX-16 | UI-024, UI-025, UI-019 | CF-004 | AF-02-010, AF-03-003 | FR-EDT-007, AC-EDT-002, AC-EDT-003 | CF-AC-006, CF-AC-007 | UI-AC-003, UI-AC-017 | MVP | VALID — state non-halaman; tanpa silent overwrite. |
| S-APP-012 / State / Tenggat aktivitas | UX-08, UX-16 | UI-030, UI-031, UI-019 | CF-006 | AF-01-012, AF-03-013, AF-03-014 | FR-ACT-005, AC-ACT-002, AC-ACT-004 | CF-AC-010 | UI-AC-024 | MVP | VALID — state non-halaman; input terkunci/status C. |

### Katalog wireframe tekstual

#### 01 — Sampul buku (`P-PUB-001`)

```text
DESKTOP/TABLET
+--------------------------------------------------------------+
| Header buku: logo | judul singkat | [Ganti Pembaca]          |
+--------------------------------------------------------------+
| [Sampul]             | Judul, deskripsi, metadata publik    |
|                       | progres lokal bila tersedia           |
|                       | [Mulai]  [Lanjutkan]                  |
+--------------------------------------------------------------+
MOBILE: sampul → judul/meta → progres → aksi vertikal; satu kolom.
STATE: loading memakai skeleton metadata; tidak tersedia → S-APP-008;
       progres gagal dibaca tidak menghalangi Mulai.
A11Y: fokus logo/judul → Mulai/Lanjutkan → Ganti Pembaca; tiap aksi berlabel.
```

#### 02 — Reader desktop (`P-PUB-002`, `D-PUB-001`, `D-PUB-002`)

```text
DESKTOP
+-------------+------------------------------------------------+
| TOC drawer  | Header: judul | [TOC] [A11y] [Kembali Sampul] |
| bab/halaman | Konten snapshot atau fallback scroll           |
| aktif       |                                                |
|             | [Sebelum]                         [Berikut]    |
+-------------+------------------------------------------------+
TABLET: TOC menjadi drawer; MOBILE: satu kolom dan fallback scroll utama.
STATE: loading snapshot; target hilang → S-APP-007; kontrol nonaktif di batas.
A11Y: fokus header → konten → navigasi; TOC/A11y dapat Escape dan mengembalikan
      fokus; motion reduksi memaksa scroll, tanpa autoplay.
```

#### 03 — Reader mobile (`P-PUB-002`)

```text
MOBILE
+------------------------------------------------+
| [TOC] Judul halaman                 [A11y]     |
+------------------------------------------------+
| Konten snapshot satu kolom / fallback scroll   |
| Media memiliki kontrol eksplisit                |
+------------------------------------------------+
| [Sebelum]                         [Berikut]    |
+------------------------------------------------+
DESKTOP/TABLET: mengikuti Reader desktop bila lebar konten sesuai.
STATE: skeleton tidak mengubah posisi baca; pesan target hilang memberi pilihan
       eksplisit, tanpa redirect diam-diam.
A11Y: urutan fokus header → konten → navigasi; tombol 44 px; swipe bukan satu-
      satunya cara berpindah; reduced motion mempertahankan scroll.
```

#### 04 — Aktivitas siswa (`P-PUB-006`, `P-PUB-007`, `M-PUB-001`)

```text
DESKTOP/TABLET
+--------------------------------------------------------------+
| Header aktivitas: [Timer server] [Status A/B/C] [Nomor soal] |
+--------------------------------------------------------------+
| Instruksi | Pertanyaan dan pilihan/jawaban | navigasi soal    |
|           | [Simpan]                       | status per soal  |
+--------------------------------------------------------------+
| [Kembali]                                  [Finalisasi]      |
+--------------------------------------------------------------+
MOBILE: header ringkas, pertanyaan satu kolom, aksi akhir tetap terlihat.
STATE: B=pending/offline, C=ditolak/terlambat; deadline mengunci input;
       finalisasi membuka konfirmasi, error memberi recovery tanpa klaim tersimpan.
A11Y: fokus instruksi → jawaban → simpan/finalisasi; timer diumumkan hemat;
      status memakai teks+ikon, bukan warna saja.
```

#### 05 — Login administrator (`P-ADM-001`, `S-APP-005`)

```text
DESKTOP/TABLET/MOBILE
+----------------------------------------------+
| Identitas aplikasi                            |
| Masuk administrator                           |
| Email:        [________________]              |
| Kata sandi:  [________________]              |
| Pesan aman / error inline                     |
| [Masuk]                                       |
+----------------------------------------------+
STATE: loading mengunci submit ganda; kredensial salah tetap di konteks;
       sesi berakhir → pesan aman dan login ulang tanpa data privat.
A11Y: label eksplisit, error terhubung ke field, Enter mengirim; fokus ke error
      pertama atau dashboard setelah autentikasi berhasil.
```

#### 06 — Dashboard desktop (`P-ADM-002`)

```text
DESKTOP
+----------------+---------------------------------------------+
| Navigasi admin | Header / akun                               |
| Dashboard      +---------------------------------------------+
| Buku           | Ringkasan | Kuota | Aktivitas terbaru        |
| Pengaturan     +---------------------------------------------+
| Operasional    | Daftar buku ringkas | [Buka] [Buat buku]    |
+----------------+---------------------------------------------+
TABLET: navigasi ringkas; MOBILE memakai menu dan kartu vertikal.
STATE: skeleton ringkasan; empty buku menawarkan Buat Buku; error aman+Coba lagi.
A11Y: fokus nav → ringkasan → daftar → pintasan; kartu tidak menggantikan label
      tindakan; data hanya yang diizinkan administrator.
```

#### 07 — Dashboard mobile (`P-ADM-002`)

```text
MOBILE
+----------------------------------------------+
| [Menu] Dashboard                    [Akun]   |
+----------------------------------------------+
| Ringkasan                                     |
| Kuota                                         |
| Buku terbaru                                  |
| [Buka Buku]  [Buat Buku]                      |
+----------------------------------------------+
DESKTOP/TABLET: mengikuti dashboard dengan sidebar atau navigasi ringkas.
STATE: empty buku memberi aksi buat; loading/error memakai skeleton/pesan inline.
A11Y: menu memberi fokus kembali saat ditutup; urutan fokus header → ringkasan →
      kuota → daftar → aksi; tidak ada aksi penting tersembunyi hanya pada hover.
```

#### 08 — Daftar buku (`P-ADM-003`)

```text
DESKTOP
+--------------------------------------------------------------+
| Judul Koleksi Buku                         [Buat Buku]       |
| [Cari________________] [Filter] [Reset]                      |
+--------------------------------------------------------------+
| Tabel: judul | status | pembaruan | [Buka] [Arsip]           |
+--------------------------------------------------------------+
MOBILE: pencarian/filter di atas, setiap buku menjadi kartu dengan aksi berlabel.
STATE: loading tabel/kartu; empty menawarkan Buat Buku; arsip memakai dialog
       konfirmasi; gagal arsip mempertahankan daftar dan memberi recovery.
A11Y: filter dan tabel berlabel; aksi Arsip fokus ke dialog lalu kembali; keyboard
      dapat mengakses semua aksi tanpa hover.
```

#### 09 — Editor desktop (`P-ADM-006`, `M-ADM-001`)

```text
DESKTOP
+---------------+--------------------------+------------------+
| Struktur/      | Toolbar: undo redo       | Inspector         |
| pustaka        | [Preview] [Publish]      | Konten/Tampilan/  |
| [Tree]         +--------------------------+ Tata Letak/       |
| [Tambah]       | Canvas blok terpilih     | Perilaku/A11y     |
| urut/tombol    |                          |                  |
+---------------+--------------------------+------------------+
| Status autosave: lokal / menyimpan / tersimpan / konflik     |
+--------------------------------------------------------------+
TABLET: panel konteks bergantian; MOBILE: canvas + Tambah + inspector sheet.
STATE: CAS gagal membuka dialog konflik, bukan silent overwrite; save pending
       tidak menyatakan tersimpan; drag selalu punya tombol pindah/keyboard.
A11Y: fokus toolbar → tree → canvas → inspector; seleksi tidak hilang saat reflow;
      reduced motion tidak mengurangi akses ke konten.
```

#### 10 — Editor tablet (`P-ADM-006`)

```text
TABLET
+--------------------------------------------------------------+
| Toolbar: [Struktur] [Canvas] [Inspector] [Preview] [Publish] |
+--------------------------------------------------------------+
| Panel konteks aktif (Struktur atau Inspector)                 |
| Canvas blok dan seleksi tetap terlihat                        |
+--------------------------------------------------------------+
| Status autosave / konflik / recovery                          |
+--------------------------------------------------------------+
DESKTOP menampilkan tiga panel; MOBILE menggunakan inspector sheet dan editing dasar.
STATE: pergantian panel tidak membuang seleksi/perubahan lokal; konflik membuka
       perbandingan; error blok terlihat dekat aksi.
A11Y: tab panel memakai keyboard; struktur memiliki tombol pindah non-drag;
      fokus kembali ke pemicu setelah panel ditutup.
```

#### 11 — Editor mobile (`P-ADM-006`)

```text
MOBILE
+----------------------------------------------+
| [Kembali] Judul/status autosave [Menu]        |
+----------------------------------------------+
| Canvas blok terpilih                          |
| [Tambah Komponen] [Undo] [Redo]               |
| [Inspector] [Preview]                         |
+----------------------------------------------+
| Inspector sheet / struktur sheet saat dipilih  |
+----------------------------------------------+
STATE: kemampuan kompleks dapat memberi arahan desktop, tetapi tambah, edit dasar,
       inspector, undo/redo, dan status autosave tetap tersedia; konflik eksplisit.
A11Y: sheet trap/return focus; tombol berlabel dan 44 px; reorder memakai tombol,
      bukan drag saja; perubahan viewport tidak membuang draf lokal.
```

#### 12 — Wizard publish (`W-ADM-001`, `S-APP-003`, `S-APP-010`)

```text
DESKTOP/TABLET
+--------------------------------------------------------------+
| Publish: [1]—[2]—[3]—[4]—[5]                                |
+--------------------------------------------------------------+
| Hasil validasi: Pass / Warning / Error                        |
| Detail masalah dan tautan kembali ke konteks perbaikan         |
+--------------------------------------------------------------+
| [Kembali] [Simpan draf]                       [Lanjut/Publish]|
+--------------------------------------------------------------+
MOBILE: stepper vertikal, satu langkah aktif, aksi tetap terlihat.
STATE: Error memblokir publish; loading mencegah kirim ganda; gagal mempertahankan
       pointer versi aktif lama dan memberi kembali ke wizard; sukses hanya pasca
       konfirmasi backend/aktivasi atomik.
A11Y: langkah aktif diumumkan; fokus menuju Error pertama; keyboard next/back;
      warna Pass/Warning/Error selalu disertai teks/ikon.
```

#### 13 — Riwayat versi (`P-ADM-011`)

```text
DESKTOP
+--------------------------------------------------------------+
| Riwayat versi / status aktif                                 |
| [Filter/status]                                              |
+----------------------+---------------------------------------+
| Daftar snapshot      | Detail snapshot / dependensi           |
| versi aktif ditandai | [Rollback]                             |
+----------------------+---------------------------------------+
TABLET/MOBILE: daftar lalu detail sebagai panel/kartu berurutan.
STATE: loading daftar; empty riwayat dijelaskan; snapshot/dependensi invalid
       memblokir rollback dan menampilkan alasan/recovery; konfirmasi sebelum aksi.
A11Y: fokus daftar → detail → Rollback; dialog kritis trap fokus dan kembali;
      status versi tidak hanya disampaikan warna.
```

#### 14 — Manajemen QR (`P-ADM-013`)

```text
DESKTOP/TABLET
+--------------------------------------------------------------+
| QR buku: satu area pengelolaan                               |
| Mode/presentasi (USULAN DESAIN; bukan route baru)             |
+--------------------------+-----------------------------------+
| QR statis — MVP          | preview / target publik sah        |
| [Salin tautan]           | [Ekspor PNG] [Ekspor SVG]          |
+--------------------------+-----------------------------------+
| QR dinamis — Fase 2: target internal aktif, resolusi, analitik|
| Ditandai Fase 2 dan tidak tampil sebagai fungsi MVP aktif.    |
+--------------------------------------------------------------+
MOBILE: kartu vertikal; preview, aksi ekspor, lalu validasi target.
STATE: target eksternal/siklus/tidak aktif ditolak dengan alasan; target publikasi
       tidak tersedia tidak melewati unpublish/revoke; error memberi perbaikan.
A11Y: salin/ekspor/validasi berlabel; mode dapat dioperasikan keyboard; visual QR
      memiliki nama/teks alternatif; tab/segmented control tetap USULAN DESAIN.
```

#### 15 — Hasil aktivitas (`P-ADM-014`, `M-ADM-003`)

```text
DESKTOP
+--------------------------------------------------------------+
| Hasil aktivitas: [Filter] [Pencarian]                         |
+--------------------------------------------------------------+
| Tabel/kartu hasil yang diizinkan                              |
| peserta tersaring | status final | [Buka detail]              |
+--------------------------------------------------------------+
| Detail hasil sesuai otorisasi | [Buat retry grant — Fase 2]  |
+--------------------------------------------------------------+
TABLET/MOBILE: filter menjadi sheet; tabel berubah kartu; detail mengikuti daftar.
STATE: loading/empty/error diberi pesan dan coba lagi; retry grant Fase 2 tidak
       menimpa hasil sebelumnya dan tidak muncul sebagai fungsi MVP aktif.
A11Y: header/filter/tabel/detail memiliki urutan fokus; data privat dan kunci tidak
      bocor; dialog retry berlabel, keyboard-accessible, dan mengembalikan fokus.
```

## UX-21 — Open Questions, Assumptions, and Decisions Pending

| ID | Masalah/dampak | Alternatif/rekomendasi sementara | Status/dokumen |
|---|---|---|---|
| IA-Q-001 | Route admin memengaruhi navigasi | gunakan label navigasi, jangan finalkan URL | BELUM DIPUTUSKAN / IA |
| IA-Q-002 | Breadcrumb admin | sediakan pola komponen, aktivasi setelah keputusan | BELUM DIPUTUSKAN / IA |
| IA-Q-003 | Instrumentasi publish | hanya placeholder feedback lokal | BELUM DIPUTUSKAN / IA |
| IA-Q-004 | Antrean jawaban offline | tampilkan Status B; jangan memilih teknologi penyimpanan | BELUM DIPUTUSKAN / IA |
| IA-Q-005 | Lokasi/presentasi QR dinamis | **Opsi A formal melalui CR-IA-005:** satu area P-ADM-013 dengan QR statis MVP dan QR dinamis Fase 2; tanpa route baru; tab/segmented control tetap USULAN DESAIN | **DECIDED/CLOSED — CR-IA-005; FS-DOC-03 `v1.0.1-approved-locked` telah APPROVED & LOCKED setelah CR-IA-005-RELOCK. FS-DOC-05 tetap DRAF dan belum disetujui pemilik.** |
| UX-Q-001 | Warna, tipografi, layout, spacing, breakpoint, dan aturan visual UX-04/05 | Keputusan tercatat melalui `CR-UX-001 — DESIGN SYSTEM APPROVAL` | **DECIDED/CLOSED — APPROVED BY OWNER** |

## UX-22 — Review Checklist and Document Status

- [x] Empat baseline dibaca; UX-00—UX-22 tersedia.
- [x] Fitur, halaman inventory, state, desktop/tablet/mobile, aksesibilitas, privasi, dan traceability dibahas.
- [x] Tidak ada role, route final, fase, atau keputusan produk baru.
- [x] Tidak ada klaim implementasi atau pengujian nyata.
- [x] `CR-UX-001 — DESIGN SYSTEM APPROVAL` dicatat: warna, tipografi, layout, spacing, breakpoint, dan aturan visual UX-04/05 telah **APPROVED BY OWNER**.

**STATUS DOKUMEN SAAT INI: DRAF — MENUNGGU REVIEW DAN PERSETUJUAN PEMILIK PROYEK**

Dokumen ini belum disetujui dan belum dikunci. Keputusan desain yang dicakup `CR-UX-001` telah disetujui pemilik; pengujian implementasi dan aksesibilitas aktual tetap belum dilakukan.
