# PROSEDUR BOOTSTRAP ADMIN PERTAMA — FLIPBOOK STUDIO

## FAB-00 — Identitas dan Status

| Item | Nilai |
|---|---|
| Versi | `v0.1.1-draft` |
| Status | **DRAF — BOOTSTRAP DEV TERVERIFIKASI; TIDAK BERLAKU SEBAGAI PROSEDUR PRODUKSI** |
| Lingkungan | `flipbook-studio-dev` saja |
| Tujuan | Membuat tepat satu `admin_profiles.active` secara terkontrol agar jalur server provisioning dapat mulai digunakan. |

## FAB-01 — Mengapa Bootstrap Tidak Melalui Browser

Tidak ada policy yang membolehkan user Auth membuat `admin_profiles` sendiri. Tanpa pembatasan ini, setiap user yang berhasil login dapat menaikkan dirinya menjadi administrator. Edge Function `provision-admin` juga sengaja mensyaratkan caller yang sudah active, sehingga ia tidak dapat menjadi jalan pintas bootstrap pertama.

## FAB-02 — Prasyarat Keras

1. Target dashboard/reference ID diverifikasi sebagai `flipbook-studio-dev`.
2. User Auth target sudah mengonfirmasi email dan UUID diperoleh **lokal oleh operator**, tidak dikirim ke chat atau dicantumkan dalam dokumentasi.
3. `20261119020000_admin_read_access.sql` dan `20261119030000_admin_provisioning_rpc.sql` telah lolos audit statis, tetapi belum diterapkan.
4. Bukti bahwa belum ada `admin_profiles.active` dikumpulkan melalui query hanya-baca operator.
5. Persetujuan eksekusi terpisah mencantumkan target dev, satu UUID target, correlation ID baru, dan larangan data produksi.

## FAB-03 — Kontrak Operasi Operator

| Langkah | Ketentuan wajib |
|---|---|
| Verifikasi target | Cocokkan nama dan reference ID CLI/dashboard sebelum setiap perintah mutatif. |
| Verifikasi kekosongan | Hanya lanjut bila jumlah profil `active` adalah nol. Jika tidak, berhenti. |
| Verifikasi target | Pastikan UUID merujuk satu user Auth yang telah dikonfirmasi. |
| Tulis profil | Satu insert profile `active` dengan display name minimal; tidak ada role tambahan. |
| Tulis audit | Satu event audit aman berisi actor/operator yang disetujui, target UUID, outcome, dan correlation ID; tanpa token/password/email mentah. |
| Bukti | Simpan timestamp, target reference ID, jumlah profil sebelum/sesudah, dan hasil audit yang sudah disamarkan. |
| Pemulihan | Bila salah target/partial state, berhenti dan audit; jangan menghapus audit secara diam-diam. |

Mekanisme SQL fisik untuk operasi operator ini belum dibuat. Ia memerlukan review tersendiri karena actor pertama belum memiliki `admin_profiles` dan tidak boleh dipalsukan sebagai actor aplikasi biasa.

## FAB-04 — Keterlacakan

| Kontrak | Dukungan |
|---|---|
| ENT-001 / DB-REQ-001 | profil admin berasal dari identitas Auth yang sah |
| ENT-018 / DB-REQ-021 | outcome provisioning harus diaudit aman |
| INV-012 | default deny; bukan Auth saja yang memberi akses aplikasi |
| RLS_SECURITY RS-01/02/06 | scope dan trust boundary wajib tervalidasi |
| AAMA-02 | provisioning bukan self-service browser |

## FAB-05 — Gerbang Tahap Berikutnya

Setelah bootstrap pertama dibuktikan secara sah, operator dapat mengajukan eksekusi migration akses baca dan RPC provisioning, lalu menguji dua admin dummy. Tidak ada migration atau operasi bootstrap yang diizinkan oleh dokumen ini.

## FAB-06 — Bukti Eksekusi Dev

Pada 19 November 2026, preflight hanya-baca mengonfirmasi tepat satu target Auth yang terkonfirmasi untuk operasi operator dan nol profil admin aktif. Bootstrap atomik kemudian membuat tepat satu `admin_profiles.active` dan tepat satu event audit `bootstrap_first_profile` ber-outcome `accepted`.

Alamat email dan UUID target dipakai hanya dalam query operator lokal yang tidak disimpan sebagai artefak proyek. File SQL sementara telah dihapus setelah verifikasi. Operasi ini tidak membuat jalur self-service, tidak mendeploy Edge Function, dan tidak menjadi prosedur produksi yang disetujui.
