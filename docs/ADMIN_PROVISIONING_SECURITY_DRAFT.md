# KONTRAK KEAMANAN PROVISIONING ADMIN — FLIPBOOK STUDIO

## APS-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Versi | `v0.1.1-draft` |
| Status | **DRAF — DEPLOY DEV TERBATAS TERVERIFIKASI** |
| Source lokal | `supabase/functions/provision-admin/index.ts` |
| Target deployment potensial | `flipbook-studio-dev` saja |

## APS-01 — Tujuan dan Batas

Function `provision-admin` menyiapkan jalur server untuk memberikan profil aplikasi `active` kepada user Auth target. Ia bukan endpoint pendaftaran publik, tidak membuat user Auth, dan tidak dipanggil oleh Reader anonim.

Function ini **tidak menyelesaikan bootstrap admin pertama**. Saat belum ada `admin_profiles.active`, semua caller user JWT ditolak. Bootstrap pertama tetap operasi operator terpisah yang memerlukan rancangan, bukti, dan persetujuan eksplisit.

## APS-02 — Kontrak Pemanggil

| Aspek | Ketentuan |
|---|---|
| Kredensial | JWT user yang sah; `withSupabase({ auth: 'user' })` memverifikasi kredensial pada batas function. |
| Otorisasi tambahan | Caller harus sudah memiliki `admin_profiles.id = JWT sub` dan `access_status = active`. |
| Input | UUID target dan display name opsional maksimum 120 karakter. |
| Metode | Hanya `POST`; metode lain ditolak. |
| Respons | Tidak menampilkan secret, token, password, atau data user target selain UUID yang diajukan. |
| Browser | Belum ada CORS/klien UI; source ini tidak boleh dianggap endpoint browser siap pakai. |

## APS-03 — Batas Privilege

`context.supabaseAdmin` dipakai hanya setelah JWT dan status profil caller diverifikasi. Client privileged itu diperlukan untuk memanggil RPC atomik yang kelak menulis profil dan audit; ia tidak pernah dibuat dari key frontend dan tidak ada key dalam source.

Kunci runtime Supabase disuntikkan oleh lingkungan Edge Function. Source tidak membaca, mencetak, menyimpan, atau mengirim service-role/secret key. Dokumentasi Supabase membedakan key publishable yang aman untuk browser dari secret key yang hanya boleh dipakai dalam batas server. [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## APS-04 — Prasyarat yang Belum Ada

| Prasyarat | Status |
|---|---|
| Migration `20261119020000_admin_read_access.sql` | Diterapkan dan diverifikasi pada dev; uji isolasi lanjut tetap pending evidence |
| RPC `admin_provision_profile` atomik | Diterapkan melalui migration `20261119030000`; belum diuji melalui Edge Function |
| Bootstrap admin pertama | BELUM DIRANCANG / memerlukan persetujuan operator |
| Deployment Edge Function | Dideploy ke `flipbook-studio-dev` saja; JWT verification aktif |
| CORS | Preflight `http://localhost:5173` diterima; origin asing ditolak |
| Uji dua admin + audit | BELUM DILAKUKAN |

## APS-05 — Kontrak RPC yang Harus Diaudit Terpisah

RPC masa depan wajib menerima `actor_admin_id`, `target_admin_id`, `display_name`, dan `correlation_id`, lalu secara atomik:

1. memverifikasi actor `active`;
2. memastikan target adalah identitas Auth yang sah;
3. menolak aktivasi ulang/suspensi tanpa workflow yang disetujui;
4. membuat profil target secara terkontrol; dan
5. menulis satu event audit aman dengan actor, target, outcome, dan correlation ID.

Tidak ada SQL/RPC fisik yang dibuat oleh dokumen ini. Tidak boleh mengganti langkah atomik dengan dua mutasi terpisah dari browser atau Edge Function.

## APS-06 — Skenario Uji Wajib Sebelum Deploy

| Skenario | Hasil PASS |
|---|---|
| Tidak ada JWT | `401`; tidak ada perubahan data. |
| JWT user tanpa profil active | `403`; tidak ada perubahan data. |
| Admin aktif + target UUID tidak sah | `400`; tidak ada audit sukses/profil baru. |
| Admin aktif + target valid | profil dan audit dibuat atomik setelah RPC tersedia. |
| Dua request bersamaan ke target sama | satu outcome deterministik; tidak ada profil/audit ganda yang tidak sah. |
| Target sudah active/suspended | hasil sesuai workflow eksplisit; tidak ada reaktivasi diam-diam. |
| Error RPC | respons aman; detail internal/secret tidak bocor; tidak ada state parsial. |

## APS-07 — Risiko Residual

Function telah dideploy dan preflight CORS diuji di dev. Pemanggilan provisioning terotentikasi, isolasi dua admin, serta audit runtime masih belum diuji. Ia tidak menutup 7 GAP dan 3 OPEN, tidak mengubah RLS foundation yang telah diterapkan, dan tidak memberi akses data buku kepada frontend.

## APS-08 — Bukti Deploy Dev

| Pemeriksaan | Hasil | Status |
|---|---|---|
| Function `provision-admin` | aktif pada proyek `flipbook-studio-dev`; JWT verification aktif | TERVERIFIKASI |
| Preflight dari `http://localhost:5173` | `204` dengan origin, header, dan metode yang dibatasi | TERVERIFIKASI |
| Preflight dari origin asing | `403 origin_not_allowed` | TERVERIFIKASI |
| Provisioning user kedua | belum dijalankan | PENDING EVIDENCE |
| Isolasi mutasi dua admin | belum diuji | PENDING EVIDENCE |
| Isolasi baca dua admin | admin kedua membuat buku; admin pertama tidak melihatnya pada panel foundation | TERVERIFIKASI TERBATAS |

## APS-09 — Riwayat Perubahan

| Versi | Perubahan |
|---|---|
| v0.1.1-draft | Mencatat deploy dev dan verifikasi CORS terbatas; tidak mengubah keputusan, RLS, atau status GAP/OPEN. |
