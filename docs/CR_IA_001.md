# CR-IA-001 — PENCATATAN KEPUTUSAN IA-Q-001 SAMPAI IA-Q-004

## Status

| Item | Nilai |
|---|---|
| Change Request | `CR-IA-001` |
| Tanggal | 18 November 2026 |
| Otorisasi | Persetujuan eksplisit pemilik proyek |
| Status | **APPROVED BY OWNER — PENDING CONTROLLED BASELINE PATCH** |
| Dokumen terdampak | FS-DOC-03 `INFORMATION_ARCHITECTURE.md`; FS-DOC-05 `UI_UX_SPEC.md` |
| Batas | Tidak menambah route, inventory IA, fitur, role, requirement, atau fase. |

## Keputusan yang Dicatat

| ID | Keputusan pemilik |
|---|---|
| IA-Q-001 | Navigasi admin menggunakan sidebar hierarkis: Dashboard sebagai awal, Daftar Buku sebagai pusat, konteks buku untuk editor/detail/aktivitas/publikasi, serta URL stabil untuk akses langsung dan refresh. |
| IA-Q-002 | Breadcrumb mengikuti konteks; dapat diklik ke tingkat sebelumnya, halaman aktif terakhir, dan ringkas pada mobile. |
| IA-Q-003 | UI publish membedakan ringkasan status/versi aktif/waktu terakhir/outcome terakhir dari detail operasional aman; hanya data tersedia dan terverifikasi yang ditampilkan. |
| IA-Q-004 | Indikator antrean jawaban berada dekat simpan/kirim; detail lewat panel/dialog; status lokal dibedakan dari penerimaan server dan tidak mengekspos antrean siswa lain. |

## Patch Baseline yang Diizinkan pada Tahap Berikutnya

1. Pada FS-DOC-03, ubah status IA-Q-001—004 dari menunggu keputusan menjadi decided/closed melalui CR-IA-001, lalu catat riwayat dan versi/status sesuai prosedur penguncian ulang.
2. Pada FS-DOC-05, selaraskan referensi IA-Q-001—004, tanpa mengubah 15 route, 41 inventory IA, 52 UI-AC, 22 komponen, 22 UX-ERR, 15 wireframe, atau keputusan fase.
3. Audit independen wajib dilakukan sebelum mengubah status penguncian versi baru.

## Dampak dan Batasan

Keputusan ini kompatibel dengan baseline: navigasi tidak mengubah URL/route yang sudah ada; breadcrumb bukan kontrol akses; metrik publish tidak menambah telemetry yang belum tersedia; dan lokasi UI antrean tidak memilih teknologi persistence browser. Detail browser persistence, expiry, retry, recovery, provider capability, dan telemetry tetap mengikuti status OPEN/GAP yang berlaku.
