# Bukti Uji Timeout dan Retry — SCN-06D3-027

Tanggal uji: 2026-11-19  
Lingkungan: Supabase nonproduksi `flipbook-studio-dev` (`sdkyikgwbobciwfzqfwx`)  
Data: attempt sintetis; tidak ada data produksi atau data siswa nyata.

## Probe

Klien memulai submit dengan satu idempotency key, lalu koneksi klien dibatalkan segera setelah permintaan dimulai (timeout-style/client-abort). Klien kemudian melakukan retry dengan key dan payload yang sama.

## Hasil teramati

- Retry diterima dengan HTTP 200.
- Status attempt akhir: `finalized`.
- Jumlah jawaban akhir: 1.
- Jumlah hasil akhir: 1.
- Jumlah record idempotensi akhir: 1.
- Tidak ditemukan duplikasi penerimaan atau hasil yang bertentangan.

## Klasifikasi bukti

**TERVERIFIKASI TERBATAS.** Bukti menunjukkan retry tidak menggandakan penerimaan setelah probe client-abort. Namun, harness ini tidak membuktikan apakah request pertama sudah diterima dan diproses server sebelum koneksi dibatalkan. Karena itu, ini bukan bukti penuh untuk semua urutan timeout jaringan atau kegagalan koneksi.

## Keamanan dan keterbatasan

Log tidak memuat token mentah, API key, kunci jawaban, atau data attempt pengguna lain. Timestamp server dan kondisi akhir diverifikasi melalui query audit setelah retry; urutan penerimaan request pertama tidak dapat diamati secara independen pada probe ini. Status resmi `SCN-06D3-027` tetap `GAP / PENDING EVIDENCE` sampai audit independen.
