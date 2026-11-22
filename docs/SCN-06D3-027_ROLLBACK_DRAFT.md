# ROLLBACK SCN-06D3-027 — DRAF

Status: belum dieksekusi; hanya berlaku untuk lingkungan nonproduksi `flipbook-studio-dev`.

## Urutan kompensasi

1. Hentikan pemanggilan Edge Function dan tandai deployment kandidat tidak aktif.
2. Pastikan tidak ada pengujian yang sedang berjalan dan ekspor bukti audit yang telah disamarkan.
3. Jalankan rollback migration hanya setelah persetujuan eksekusi terpisah: hapus fungsi RPC kandidat, lalu tabel kandidat dalam urutan dependensi terbalik.
4. Verifikasi bahwa objek foundation SCN-06D3-027 tidak tersisa dan objek foundation sebelumnya tetap utuh.
5. Catat timestamp server, operator, hasil tiap langkah, serta kegagalan parsial untuk rekonsiliasi.

Rollback tidak boleh menghapus data produksi, data siswa asli, atau objek di luar migration kandidat. Karena operasi Storage/database tidak terdistribusi atomik, setiap kegagalan parsial harus dihentikan dan diaudit; tidak ada cleanup otomatis.
