# RUNBOOK PENYIAPAN LINGKUNGAN NONPRODUKSI — DRAF

## NPT-00 — Status dan Batas

- Versi: `v0.1.0-draft`
- Status: **DRAF — MENUNGGU PENYEDIAAN LINGKUNGAN NONPRODUKSI**
- Tanggal: 19 November 2026 (Asia/Jakarta).
- Ruang lingkup: prasyarat aman untuk pembuktian `SCN-06D3-005`, `008`, `011`, `016`, `017`, `027`, `029`, `034`, `043`, dan `044`.

Dokumen ini bukan SQL, migrasi, konfigurasi provider, kebijakan RLS sintaktis, atau bukti pengujian. Tidak ada kredensial, token, API key, data siswa asli, atau data produksi yang boleh disimpan dalam workspace maupun bukti.

## NPT-01 — Gerbang Sebelum Penyediaan

| Gerbang | Bukti minimum | Kondisi lanjut |
|---|---|---|
| Isolasi | Nama proyek/akun/zona nonproduksi, pemilik, dan pernyataan tidak terhubung ke produksi | Wajib PASS |
| Biaya | Paket, kuota, dan kemungkinan biaya disampaikan kepada pemilik proyek | Persetujuan eksplisit bila pembuatan proyek atau biaya diperlukan |
| Rahasia | Kanal aman untuk kredensial sementara; tidak ada rahasia di file, log, screenshot, atau Git | Wajib PASS |
| Data | Dataset sintetis dan akun dummy admin/siswa; tanpa data pribadi | Wajib PASS |
| Bukti | Lokasi penyimpanan terbatas akses, standar redaksi, dan retensi bukti | Wajib PASS |

Kegagalan satu gerbang berarti seluruh uji provider berstatus `BLOCKED`, bukan `FAIL`.

## NPT-02 — Inventaris Lingkungan Minimum

| Komponen | Kebutuhan | Tujuan | Larangan |
|---|---|---|---|
| Supabase nonproduksi | Proyek terpisah; URL dan akses proyek hanya melalui kanal aman | Database, Auth, Storage, RLS, RPC/Edge uji | Jangan memakai proyek atau kredensial produksi |
| PostgreSQL nonproduksi | Akses administrasi terbatas untuk inspeksi bukti yang diizinkan | Mengamati transaksi, audit, dan hasil restore | Jangan menganggap akses ini izin menjalankan migrasi produksi |
| Storage uji | Bucket privat terpisah dengan objek media sintetis | Uji dependensi media, signed URL, orphan, dan restore | Jangan memakai bucket publik/produksi |
| Identitas dummy | Minimal admin uji dan siswa uji, tanpa identitas nyata | Uji scope, sesi, dan attempt | Jangan menyimpan token mentah dalam bukti |
| Cloudflare uji | Project Pages/zone/domain uji terpisah atau endpoint cache lain yang disetujui | Uji cache, header, dan purge lifecycle | Jangan melakukan purge zona produksi |
| Aplikasi/harness uji | Artefak minimal yang secara sengaja mengimplementasikan kontrak uji | Menghasilkan request, audit, dan respons nyata | Tidak boleh dibuat sebelum otorisasi implementasi tersendiri |

## NPT-03 — Konfigurasi Aman yang Harus Dikumpulkan (Tanpa Nilai Rahasia)

Catat hanya identitas dan status berikut pada bukti pelaksanaan:

1. ID/nama lingkungan nonproduksi ber-redaksi dan pemiliknya.
2. Paket/plan provider, kuota yang terlihat, serta waktu pemeriksaan.
3. Nama bucket uji dan status privatnya (tanpa URL bertanda tangan aktif).
4. Nama zona/project Cloudflare uji dan mekanisme cache/purge yang diizinkan.
5. Versi aplikasi atau hash harness pengujian.
6. Offset waktu server/UTC dan cara pencatatannya.
7. Mekanisme audit test run serta lokasi artefak berakses terbatas.

Simpan `SUPABASE_SERVICE_ROLE_KEY`, token Cloudflare, password, URL bertanda tangan, dan token sesi hanya pada secret manager/konsol yang disetujui. Nilainya tidak boleh disalin ke dokumen, environment file yang dibagikan, log, atau screenshot.

## NPT-04 — Dataset Sintetis dan Fixture Konseptual

| Fixture | Dipakai oleh | Karakteristik bukti |
|---|---|---|
| Buku/draf/revisi sintetis | 005, 008 | Dua revisi dan media yang dapat diverifikasi checksum-nya |
| Snapshot/proyeksi publik sintetis | 005, 016, 017 | Tidak memuat kunci jawaban atau bobot rahasia |
| Media uji privat | 008, 011, 017, 043 | Satu masih direferensikan, satu orphan terkontrol, satu pending delete |
| Aktivitas dan attempt sintetis | 027, 029, 034 | Deadline UTC eksplisit, attempt tunggal, jawaban tidak sensitif |
| Objek cache uji | 016 | Header cache dan lifecycle dapat direkam |
| Manifest backup uji | 043 | Memisahkan database, Storage, dan mapping; checksum dan waktu |
| Respons/metrik tiruan yang diberi label | 044 | Hanya untuk jalur gagal; bukan bukti capability provider |

## NPT-05 — Urutan Eksekusi yang Diizinkan Setelah Gerbang Lulus

1. Rekam baseline lingkungan dan paket provider dengan timestamp UTC.
2. Verifikasi bucket privat, identitas dummy, serta tidak adanya jalur ke produksi.
3. Jalankan kemampuan provider yang tidak membutuhkan perubahan rancangan aplikasi: inspeksi plan, header, izin, dan fasilitas backup yang tersedia.
4. Setelah ada harness/aplikasi uji yang diotorisasi, jalankan skenario 005, 008, 016, 017, 027, 029, dan 043.
5. Jalankan skenario OPEN 011, 034, dan 044 hanya untuk mengumpulkan bukti; status resminya tetap OPEN sampai ditinjau.
6. Untuk setiap run, simpan bukti ber-redaksi, hash artefak, timestamp server UTC, hasil PASS/FAIL/BLOCKED/NOT EXECUTED, serta risiko residual.
7. Audit independen menilai bukti sebelum ada usul penutupan status.

## NPT-06 — Struktur Bukti yang Direkomendasikan

Saat lokasi bukti privat telah disetujui, gunakan struktur konseptual berikut tanpa memasukkan rahasia:

```text
docs/evidence/fs-doc-06/<tanggal-utc>/<scenario-id>/
  run-summary.md
  redacted-server-timeline.txt
  redacted-http-headers.txt
  audit-reference.txt
  manifest-checksums.txt
```

Folder ini **belum dibuat** karena belum ada lingkungan, bukti, ataupun kebijakan akses bukti yang disetujui. Artefak browser harus disamarkan; semua URL bertanda tangan, cookie, token, dan identitas akun harus dihapus.

## NPT-07 — Kondisi BLOCKED Saat Ini

Pada pemeriksaan lokal 19 November 2026: tidak ada URL/kredensial nonproduksi; `supabase`, `wrangler`, `psql`, dan `docker` tidak tersedia; tidak ada source application atau harness di workspace. Maka 10 skenario tidak dapat dieksekusi nyata tanpa (a) penyediaan lingkungan nonproduksi, dan (b) otorisasi terpisah untuk artefak implementasi/harness yang diperlukan.

