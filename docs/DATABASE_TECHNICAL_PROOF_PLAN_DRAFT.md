# RENCANA PEMBUKTIAN TEKNIS DATABASE — DRAF

## TP-00 — Status dan Batas

- Versi: `v0.1.0-draft`
- Status: **DRAF — PENDING EVIDENCE**
- Tanggal pemeriksaan: 19 November 2026 (Asia/Jakarta).
- Batas: bukan SQL, migrasi, konfigurasi provider, maupun bukti eksekusi.

Dokumen ini merinci bukti yang diperlukan untuk tujuh GAP dan tiga OPEN. Penulisan rencana tidak mengubah status skenario; semuanya tetap `GAP` atau `OPEN` hingga bukti eksekusi sah direview.

## TP-01 — Lingkungan Bukti Bersama

Gunakan proyek Supabase nonproduksi, bucket uji privat, akun admin/siswa uji, jam server UTC yang dapat dicatat, dan lingkungan Cloudflare uji terpisah. Simpan request/response ber-redaksi, timestamp server, ID audit, checksum artefak, dan hasil restore. Jangan gunakan data siswa nyata atau kredensial produksi.

## TP-02 — Matriks Pembuktian

| Skenario | Risiko/kegagalan | Mekanisme rekomendasi | Uji dan PASS/FAIL | Bukti minimum | Status/risko residual |
|---|---|---|---|---|---|
| `SCN-06D3-005` Publish paralel | Dua request mengaktifkan pointer berbeda. | Satu arbitrasi efektif per buku; CAS revisi/pointer dan audit kedua request. | Jalankan dua publish bersamaan untuk revisi sama/berbeda. PASS: tepat satu versi aktif dan audit keduanya; FAIL: pointer ganda/korup. | Trace server, audit, snapshot pointer sebelum/sesudah. | GAP; isolation/locking fisik belum dipilih. |
| `SCN-06D3-008` Rollback vs delete media | Target rollback kehilangan media. | Pending delete, cek dependensi ulang sebelum mutasi, rekonsiliasi mismatch Storage. | Balapkan rollback dan hapus media. PASS: rollback ditolak/ditunda aman atau target lengkap; FAIL: versi aktif merujuk objek hilang. | Mapping dependensi, log Storage, audit kompensasi. | GAP; transaksi DB–Storage tidak atomik. |
| `SCN-06D3-016` Cache stale revoke | Konten dicabut masih tersaji dari cache. | Semua respons lifecycle-aware; purge untuk konten yang tak boleh tersaji lagi. | Cache respons, emergency revoke, akses ulang API/CDN. PASS: akses baru ditolak dan bukti cache sesuai; FAIL: payload publik ter-revoke tersaji. | Header cache, ID purge, log origin/lifecycle. | GAP; perilaku plan/cache harus diverifikasi. |
| `SCN-06D3-017` URL Storage bypass | URL langsung melewati lifecycle. | Bucket privat; jalur server memeriksa lifecycle sebelum signed URL pendek atau streaming. | Coba URL sebelum/sesudah unpublish/revoke dan dari sesi lain. PASS: akses pascarevoke ditolak; FAIL: objek tetap terbaca tanpa kontrol. | Konfigurasi bucket uji, response HTTP, log otorisasi. | GAP; model akses fisik belum dipilih. |
| `SCN-06D3-027` Submit paralel key beda | Jawaban/hasil ganda atau state tak deterministik. | Arbitrasi atomik pada attempt; satu state final dan audit outcome. | Dua submit serentak dengan key berbeda. PASS: satu hasil final, jawaban sah sesuai aturan UTC; FAIL: hasil ganda/korup. | Urutan request, timestamp server, rows outcome, audit. | GAP; kontrak concurrency fisik belum dipilih. |
| `SCN-06D3-029` Auto-finalize vs submit | Deadline menghasilkan jawaban/h asil keliru. | Pemeriksaan atomik attempt, receipt sah server, deadline UTC, dan idempotensi finalisasi. | Uji empat interleaving: submit dulu; finalize dulu; keduanya sebelum deadline; request masuk sebelum deadline tetapi penerimaan sah belum pasti. PASS: satu hasil dan hanya receipt sah sebelum deadline dipakai; FAIL: hasil ganda/terlambat dinilai. | Timeline monotonic/server UTC, key idempoten, audit final. | GAP; batas isolation fisik perlu dibuktikan. |
| `SCN-06D3-043` Backup/restore | Backup DB tanpa Storage/mapping atau restore palsu. | Ekspor operasional terverifikasi; restore terisolasi DB+Storage+mapping. | Backup lalu restore ke lingkungan baru. PASS: snapshot, media, attempt, hasil, dan mapping terverifikasi; FAIL: klaim sehat dengan bagian hilang. | Manifest, checksum, log restore, sampling integritas. | GAP; cadence/provider/tooling belum final. |
| `SCN-06D3-011` Orphan Storage | Hapus spekulatif merusak aset sah. | Inventaris object↔metadata, karantina/tindak lanjut ter-audit, tanpa auto-delete sebelum bukti. | Buat orphan/pending/mapping hilang secara uji. PASS: klasifikasi dan tindak lanjut tercatat tanpa hapus salah; FAIL: object sah dihapus. | Inventaris, keputusan operator, audit dan hasil rekonsiliasi. | OPEN; jadwal/beban/metode belum dipilih. |
| `SCN-06D3-034` Antrean lokal | Data perangkat bersama bocor atau B dianggap diterima. | Persistensi minimum per sesi/attempt, expiry, clear on switch, rekonsiliasi server dengan key sama. | Reload/offline/retry/expiry/perangkat bersama. PASS: status lokal tak pernah menjadi A tanpa server dan data pengguna lain tak muncul; FAIL: disclosure atau hasil palsu. | Rekaman browser redaksi, response server, hasil recovery. | OPEN; storage browser/enkripsi/expiry belum final. |
| `SCN-06D3-044` Telemetri kuota | Metrik usang/tidak tersedia memicu keputusan biaya salah. | Sumber hibrida berlabel sumber/waktu/kepastian; warning tanpa upgrade otomatis. | Simulasikan API tidak ada, stale, dan nilai berbeda. PASS: UI/log menandai tidak pasti, tidak menganggap nol dan tak bertindak destruktif; FAIL: angka tak bersumber diperlakukan fakta. | Respons provider, timestamp, perhitungan aplikasi, log warning. | OPEN; capability/interval/ambang belum final. |

## TP-03 — Kriteria Penutupan

Skenario hanya dapat diusulkan `CLOSED` bila mekanisme telah disetujui, uji nonproduksi lulus berulang, bukti terarsip/redaksi, hasil direview independen, dan risiko residual diterima pemilik. Rencana ini sendiri adalah **PENDING EVIDENCE**.

## TP-04 — Kesiapan Desain Fisik

Desain fisik tanpa SQL dapat dilanjutkan sebagai opsi berlabel **BLOCKED/PENDING EVIDENCE** untuk setiap mekanisme di atas. SQL, migrasi, RLS sintaktis, dan implementasi tetap dilarang sampai keputusan fisik serta bukti yang relevan disetujui.
