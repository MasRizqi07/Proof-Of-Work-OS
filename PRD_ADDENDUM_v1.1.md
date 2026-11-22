# PRD ADDENDUM v1.1 — Proof of Work OS

| Field    | Nilai                                                                                                                                                   |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Versi    | 1.1 (LOCKED)                                                                                                                                            |
| Tanggal  | 2026-11-22                                                                                                                                              |
| Hubungan | Menambah dan mengoreksi `docs/PRD.md` v1.0. Bila bertentangan, addendum ini menang untuk butir yang disebut di bawah. Butir lain di v1.0 tetap berlaku. |
| Dasar    | Audit Phase 6 pada branch `feat/proof-foundation`, HEAD `386812b`, 2026-11-22. Temuan lengkap ada di `docs/ANTIGRAVITY_MASTER_PROMPT_V2.md` bagian 0.   |

Penanda bukti sama seperti v1.0: **[VERIFIED]** diukur langsung, **[CLAIM]** belum terbukti, **[DECISION]** keputusan terkunci.

---

## 1. Koreksi atas v1.0

| ID   | Koreksi                                                                                                                                                                                                                                                                                       | Alasan                                                                                                                                                                                                                                                                                                                  |
| :--- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | **E-03 tetap berlaku seperti tertulis.** `GET /api/tasks/:taskId/evidence` mengembalikan `{ items, page, limit, total, pages }`, urut terbaru dulu. Server yang harus menyesuaikan.                                                                                                           | **[VERIFIED]** Server mengembalikan array telanjang dan urut terlama dulu. Klien membaca `.items`. Dalam uji ad-hoc, respons berisi 2 bukti ditampilkan sebagai "0 / 20" dan daftar kosong. Uji integrasi server (baris 202 `evidence.int.js`) menegaskan bentuk array, jadi ia mengunci kesalahan, bukan menangkapnya. |
| C-02 | **T-02 diperjelas.** `PATCH` dari panel detail mengirim hanya field yang berubah. Teks "Saved." muncul hanya setelah server menjawab sukses. Bila gagal, nilai kembali dan pesan error inline muncul (`role="alert"`).                                                                        | **[VERIFIED]** Panel mengirim semua field dan menampilkan "Saved." sebelum ada jawaban server. `useTasks.updateTask` tidak punya `onError`.                                                                                                                                                                             |
| C-03 | **A-03 diperluas.** Build produksi dengan `VITE_API_URL` kosong menampilkan layar "Configuration required" dan tidak memanggil localhost.                                                                                                                                                     | Perubahan ini ada di master prompt v1.0 tetapi tidak sampai ke `PRD.md` di repo. **[VERIFIED]** `PRD.md` di repo adalah versi sebelum koreksi.                                                                                                                                                                          |
| C-04 | **NFR performa** memakai dataset 5.000 task milik user uji dan 50.000 task milik user lain.                                                                                                                                                                                                   | Pada dataset satu user, planner wajar memilih sequential scan.                                                                                                                                                                                                                                                          |
| C-05 | **Aturan SQL mentah**: `$queryRaw` dengan `Prisma.sql` hanya di `server/src/services/`. `$executeRawUnsafe` boleh dipakai di `server/integration/` dengan string statis, hanya untuk membuktikan CHECK constraint dan membersihkan tabel. Nilai yang disisipkan harus konstanta, bukan input. | Aturan v1.0 melarang `executeRawUnsafe` di seluruh `server/`. Menguji CHECK constraint memang membutuhkannya. Ini kesalahan spesifikasi, bukan kesalahan agent.                                                                                                                                                         |
| C-06 | **`console.log` diizinkan di `server/integration/`** untuk mencetak bukti mentah (teks error PostgreSQL, hasil `count(*)`). Di `server/src/` tetap hanya satu baris startup.                                                                                                                  | Sama seperti C-05.                                                                                                                                                                                                                                                                                                      |
| C-07 | **Lokasi dokumen**: `PRD.md`, `DESIGN.md`, dan addendum berada di `docs/`. Pemilik produk menyalin versi terbaru. Agent tidak mengedit isi PRD.                                                                                                                                               | **[VERIFIED]** Repo menyimpan keduanya di root dan dalam versi lama.                                                                                                                                                                                                                                                    |

## 2. Scope v1.1

Prioritas: **P0** = penghalang rilis atau penghalang peluncuran publik. **P1** = penting. **P2** = pembeda produk. Butir v1.0 yang sebelumnya **Defer** dan sekarang **Build** ditandai.

| ID      | Fitur                                                              |    Prioritas    |           Verdict            | Catatan                                                |
| :------ | :----------------------------------------------------------------- | :-------------: | :--------------------------: | :----------------------------------------------------- |
| R       | Perbaikan temuan audit Phase 6                                     |       P0        |            Build             | Fase 6R                                                |
| V       | Bukti browser nyata: E2E dan axe                                   |       P0        |            Build             | Fase 8                                                 |
| DR      | Hak data: ekspor dan hapus akun                                    | P0 untuk publik |      Build (dari Defer)      | Fase 9                                                 |
| PP      | Profil bukti publik                                                |       P2        |      Build (dari Defer)      | Fase 10                                                |
| GH      | Lencana "Merged on GitHub"                                         |       P2        | Build (dari Defer, dibatasi) | Fase 11                                                |
| K, S, O | Palette, pintasan, pencarian, pembaruan optimistis                 |       P1        |            Build             | Fase 12                                                |
| H, RP   | Heatmap bukti, laporan cetak                                       |       P2        |            Build             | Fase 13                                                |
| DP      | Deploy dan operasi                                                 |       P1        |            Build             | Fase 14, perlu keputusan pemilik                       |
| —       | PWA dan service worker                                             |        —        |            Defer             | Risiko cache lama tanpa kebutuhan nyata                |
| —       | Gambar OG dinamis, indexing mesin pencari                          |        —        |            Defer             | Butuh render server atau library gambar                |
| —       | Error tracking pihak ketiga (Sentry dan sejenisnya)                |        —        |            Defer             | Dependensi baru, belum ada kebutuhan                   |
| —       | Menautkan identitas GitHub lewat OAuth                             |        —        |            Defer             | Satu-satunya cara membuktikan kepemilikan PR. Ditunda. |
| —       | AI coach, team, role, notifikasi email, realtime, i18n, TypeScript |        —        |            Defer             | Tidak berubah dari v1.0                                |

Urutan yang disarankan: 6R, 7, 8, lalu 12 dan 13 (risiko rendah, terlihat), lalu 9, 10, 11, dan terakhir 14. Fase 10 mensyaratkan fase 9. Fase 14 mensyaratkan 6R, 7, 8, dan 9.

## 3. Perubahan model data

**Profile** tambah: `displayName` (text, null, 1–60), `handle` (text, null, unik tanpa peka huruf), `isPublic` (boolean, default false).

- CHECK: `handle` null atau cocok `^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$` (3–30 karakter, huruf kecil, angka, strip, tanpa strip di ujung).
- CHECK: `NOT "isPublic" OR "handle" IS NOT NULL`.
- Handle disimpan huruf kecil. Daftar handle terlarang (ditolak di API): `admin`, `api`, `app`, `auth`, `help`, `login`, `logout`, `me`, `privacy`, `report`, `root`, `settings`, `signin`, `signup`, `support`, `terms`, `u`, `user`, `users`, `www`.

**Task** tambah: `showcase` (boolean, default false).

- CHECK: `NOT "showcase" OR "status" = 'done'`.
- Aturan aplikasi: showcase hanya boleh untuk task `done` yang `hasProof`. Maksimal 6 per user. Keluar dari `done` atau menghapus bukti terakhir otomatis menurunkan `showcase` ke false dalam transaksi yang sama.

**Evidence** tambah: `verifiedProvider` (text, null, nilai `github`), `verifiedStatus` (text, null, `merged` / `open` / `closed`), `verifiedMeta` (jsonb, null), `verifiedAt` (timestamp, null).

- CHECK: keempat kolom semuanya null atau semuanya terisi, dan hanya untuk `kind = 'url'`.

**DeletedUser** tabel baru: `id` (uuid, PK), `deletedAt` (timestamp, default now). Tanpa data pribadi. Tujuan: token JWT milik akun yang sudah dihapus tidak boleh memunculkan kembali baris `User` kosong lewat provisioning otomatis.

**[VERIFIED] Penting untuk privasi:** `User.name` jatuh ke email saat nama lengkap tidak ada (kode provisioning). Karena itu halaman publik tidak boleh membaca `User.name`. Nama tampilan publik hanya `Profile.displayName`, dengan fallback `@handle`.

## 4. Acceptance criteria baru

### R — Perbaikan (Fase 6R)

**R-01** (E-03, C-01) Given user punya task dengan 2 bukti, When `GET /api/tasks/:taskId/evidence`, Then respons `{ items: [2 elemen], page: 1, limit: 20, total: 2, pages: 1 }` dengan item terbaru lebih dulu. Dialog detail menampilkan 2 item dan "2 / 20".

**R-02** Given dialog detail terbuka dan fokus ada di input "Label", When komponen induk dirender ulang (misalnya setelah daftar task di-refetch), Then fokus tetap di input "Label".

**R-03** (C-02) Given server menolak `PATCH` (4xx atau 5xx), Then dialog tidak menampilkan "Saved.", tidak menampilkan nilai baru, dan menampilkan pesan error dengan `role="alert"`. Given server menerima, Then "Saved." tampil setelah jawaban. Given hanya `title` yang diubah, Then body `PATCH` hanya berisi `title`.

**R-04** Given server berjalan dengan `TZ=America/New_York` atau `TZ=Pacific/Auckland`, When `computeStreaks` diberi minggu `2026-03-02`, `2026-03-09`, `2026-03-16` (melintasi awal DST AS), Then `longestWeeks = 3`. Hal yang sama untuk `2026-10-26` dan `2026-11-02` (melintasi akhir DST AS). **[VERIFIED]** Kode saat ini menghasilkan 2 pada `America/New_York`.

**R-05** (M-01, spesifikasi 4.8 v1.0) Given 5.000 task milik user uji dan 50.000 milik user lain, Then `GET /api/metrics/summary` mengagregasi per minggu di SQL, tidak membaca seluruh baris task ke memori Node, dan menghasilkan JSON yang identik dengan implementasi lama untuk dataset yang sama (golden test).

**R-06** (F-01) Given `npm audit --audit-level=high`, Then exit code 0. **[VERIFIED]** Saat ini gagal: `effect <=3.22.0` (ReDoS, GHSA-7589-6fvf-x4pw) terbawa lewat `prisma` → `@prisma/config` yang mengunci `effect@3.21.0`. Perbaikan yang dipilih: `overrides` di `package.json` akar ke `effect` versi ≥ 3.22.1. Saran `npm audit fix --force` (turun ke `prisma@6.12.0`) ditolak karena melakukan downgrade mayor pada CLI migrasi.

**R-07** Given `GET /api/ping` atau `GET /api/ready` dipanggil lebih dari `RATE_LIMIT_MAX` kali dalam jendela, Then tetap `200` (dikecualikan dari rate limiter).

**R-08** Given `GET /api/projects?search[a]=1` atau `search` lebih dari 100 karakter, Then `400 VALIDATION_ERROR` (bukan `500`).

**R-09** Given kode produksi di `server/src/routes/projects.js`, Then tidak ada percabangan yang hanya ada demi test double (`typeof db.task?.groupBy === 'function'`) dan tidak ada nilai cadangan `done: 0`. Fake database di test yang menyediakan `groupBy`.

**R-10** Given evidence `url` dengan protokol selain `http` atau `https` ada di data, Then klien merender teksnya tanpa tautan (`safeHref`).

**R-11 (kontrak lintas batas)** Given setiap endpoint yang dikonsumsi klien (`GET /api/tasks`, `GET /api/tasks/:id/evidence`, `GET /api/metrics/summary`, `GET /api/projects`), Then uji integrasi mencatat struktur kunci respons (nama kunci dan tipe, tanpa nilai) ke `server/integration/contracts/*.json` dan gagal bila struktur berubah tanpa `CONTRACT_UPDATE=1`. Uji klien memuat berkas yang sama dan menegaskan bahwa fixture mock `api` memiliki struktur kunci identik.

### V — Bukti browser (Fase 8)

**V-01** Given project Supabase uji dan satu user uji (kredensial hanya lewat variabel lingkungan, tidak pernah di repo), When suite E2E dijalankan, Then alur ini lolos di browser nyata: sign in, buat task, tandai `done` (muncul "No proof yet"), tambah bukti link (daftar menampilkan 1 item, lencana berubah jadi "With proof · 1"), tambah bukti catatan, hapus satu bukti, ganti tema dan reload (pilihan bertahan), buka dan tutup panel dengan keyboard saja (fokus kembali ke pemicu), hapus task lewat dialog konfirmasi.

**V-02** Given halaman utama pada tema terang dan gelap, Then pemindaian axe-core tidak menemukan pelanggaran tingkat `serious` atau `critical` pada dashboard, panel detail terbuka, dan dialog konfirmasi.

**V-03** Given lebar 320, 480, 768, 1024, 1440, 1920 px di kedua tema, Then `document.documentElement.scrollWidth <= clientWidth` bernilai true dan tangkapan layar tersimpan.

### DR — Hak data (Fase 9)

**DR-01** Given `GET /api/user/export`, Then `200` JSON `{ exportedAt, user: { id, email, name, createdAt }, profile, projects, tasks (dengan evidence bersarang), activities }` hanya berisi data user itu, `Content-Disposition: attachment; filename="proof-of-work-export-YYYY-MM-DD.json"`, `Cache-Control: no-store`. Aktivitas dibatasi 10.000 terbaru. Batas laju 5 per jam per user, melewatinya `429 RATE_LIMITED`.

**DR-02** Given `DELETE /api/user` dengan body `{ "confirm": "DELETE" }` dan token yang diterbitkan kurang dari 5 menit lalu, Then `204`, semua baris milik user terhapus (cascade), akun Supabase dihapus lewat Admin API, dan `DeletedUser` memuat id-nya. Given token lebih tua dari 5 menit, Then `403 REAUTH_REQUIRED` dan tidak ada data berubah. Given body tanpa `confirm` yang tepat, Then `400`.

**DR-03** Given akun sudah dihapus dan token lama masih valid, When request apa pun masuk, Then `401 AUTH_INVALID` dan tidak ada baris `User` yang dibuat ulang.

**DR-04** Given `NODE_ENV=production`, Then `SUPABASE_SERVICE_ROLE_KEY` wajib ada saat startup. Nilainya tidak pernah muncul di log, respons, atau pesan error.

**DR-05** Given penghapusan akun di Supabase gagal, Then respons `502 AUTH_DELETE_FAILED`, baris database tetap terhapus bersama tombstone, dan pengulangan permintaan idempoten (tidak error).

### PP — Profil publik (Fase 10)

**PP-01** Given `PATCH /api/user/profile` dengan `handle`, `displayName`, `isPublic`, Then handle disimpan huruf kecil. Handle yang sudah dipakai user lain atau masuk daftar terlarang menghasilkan `409 HANDLE_UNAVAILABLE`. `isPublic: true` tanpa handle menghasilkan `400`.

**PP-02** Given `GET /api/public/:handle` tanpa autentikasi dan profil publik, Then `200` dengan `{ handle, displayName, bio, focus, metrics: { totals, streak, weekly }, showcase: [{ title, completedAt, evidence: [{ kind, label, url, verification }] }] }`, header `Cache-Control: no-cache` dan `X-Robots-Tag: noindex`.

**PP-03** Given handle tidak ada atau profil privat, Then `404` dengan body persis sama di kedua kasus.

**PP-04 (privasi)** Given user dengan `User.name` berisi email, email di akun, dan task tanpa showcase, Then respons publik tidak memuat email itu di mana pun, tidak memuat task non-showcase, tidak memuat `body` bukti `note` (hanya label dan `url: null`), dan tidak memuat ID internal (user, task, evidence). Diuji dengan pencarian string pada seluruh body respons.

**PP-05** Given `PATCH /api/tasks/:id` dengan `showcase: true`, Then `409 SHOWCASE_REQUIRES_PROOF` bila task bukan `done` atau tanpa bukti, dan `409 SHOWCASE_LIMIT_REACHED` bila sudah ada 6. Task milik user lain: `404`.

**PP-06** Given task showcase, When task dibuka kembali atau bukti terakhirnya dihapus, Then `showcase` menjadi false dan profil publik tidak lagi menampilkannya pada permintaan berikutnya.

**PP-07** Given user mematikan `isPublic`, Then permintaan publik berikutnya langsung `404` (tanpa cache yang menahan).

**PP-08** Given batas laju khusus endpoint publik: 60 permintaan per menit per IP, melewatinya `429 RATE_LIMITED`.

### GH — Lencana GitHub (Fase 11)

**GH-01** Given `POST` evidence `url` yang cocok persis pola `https://github.com/{owner}/{repo}/pull/{n}`, Then server memeriksa PR lewat API publik GitHub dan menyimpan hasilnya. Kegagalan pemeriksaan (jaringan, batas laju, repo privat, waktu habis) tidak menggagalkan penyimpanan: bukti tetap `201` dengan `verification: null`.

**GH-02** Given PR berstatus merged, Then `verification = { provider: "github", status: "merged", owner, repo, number, author, mergedAt, checkedAt }`. PR terbuka menghasilkan `status: "open"`. PR ditutup tanpa merge menghasilkan `status: "closed"`. Hanya `merged` yang dihitung sebagai "Merged PR".

**GH-03 (SSRF)** Given masukan berikut, Then server tidak melakukan permintaan keluar sama sekali: `https://github.com.evil.com/a/b/pull/1`, `https://evil.com/github.com/a/b/pull/1`, `https://user@github.com/a/b/pull/1`, `https://github.com:8443/a/b/pull/1`, `http://github.com/a/b/pull/1`, `https://github.com/a/b/pull/1/files`, `https://github.com/a/../b/pull/1`. Permintaan keluar selalu ke host tetap `api.github.com`, `redirect` ditolak, waktu habis 5 detik, ukuran respons dibatasi 256 KB, dan hanya field yang terdaftar yang dipakai.

**GH-04** Given `POST /api/tasks/:taskId/evidence/:evidenceId/verify`, Then pemeriksaan ulang berjalan. Batas laju 10 per jam per user. Milik user lain: `404`.

**GH-05** Lencana tampil sesuai `docs/DESIGN_ADDENDUM_v1.1.md` bagian 10, dan `title`-nya menyatakan bahwa pemeriksaan ini tidak membuktikan identitas pemilik.

**GH-06** Given `GET /api/metrics/summary`, Then `totals` bertambah satu field aditif `withMergedPr`. Field v1.0 tidak berubah.

**Keterbatasan yang dinyatakan terang:** siapa pun bisa menautkan PR merged milik orang lain. Lencana menampilkan login penulis PR agar pembaca bisa menilai. Sistem tidak mengklaim bahwa pemilik akun adalah penulis PR. Verifikasi kepemilikan lewat OAuth GitHub ditunda.

### K, S, O — Interaksi (Fase 12)

**K-01** Given `Ctrl+K` atau `Cmd+K`, Then palette terbuka dengan fokus di input. Esc menutup dan mengembalikan fokus ke elemen sebelumnya. Pola ARIA combobox/listbox sesuai addendum desain bagian 4.1.

**K-02** Given fokus di `input`, `textarea`, atau `select`, When user mengetik `n`, `/`, `t`, atau `?`, Then pintasan tidak aktif. Di luar field, masing-masing menjalankan aksi di addendum desain bagian 4.2.

**K-03** Setiap pintasan punya padanan tombol terlihat. Dialog bantuan (`?`) mendaftar semuanya.

**S-01** Given `GET /api/tasks?q=...` dengan 1 sampai 100 karakter, Then hasil adalah task milik user yang judul atau deskripsinya mengandung teks itu tanpa peka huruf. `q` kosong atau lebih dari 100 karakter: `400`. `q=%` atau `q=_` tidak mencocokkan semua baris (diuji).

**O-01** Given perubahan status cepat atau tambah/hapus bukti, Then UI berubah sebelum server menjawab dan kembali ke nilai awal dengan pesan error inline bila server menolak (diuji dengan penolakan tersimulasi).

### H, RP — Wawasan (Fase 13)

**H-01** Given `GET /api/metrics/heatmap?weeks=26` (nilai 4–52, default 26), Then `{ timezone, from, to, days: [{ date, withProof, withoutProof }] }` berisi tepat `weeks × 7` hari (diisi nol), hari dihitung menurut `APP_TIMEZONE`, agregasi di SQL. Batas hari diuji dengan pasangan `16:59:59Z` dan `17:30:00Z` seperti M-01.

**RP-01** Given `GET /api/report?days=30|90|365`, Then task `done` dalam rentang itu beserta bukti lengkap (termasuk isi catatan milik user sendiri), urut terbaru dulu. Nilai `days` lain: `400`. Tampilan cetak mengikuti addendum desain bagian 11.

### DP — Deploy (Fase 14)

**DP-01** Given `DEPLOY.md`, Then memuat tabel variabel lingkungan lengkap, urutan deploy, langkah migrasi, probe `/api/ready`, rencana rollback, dan daftar yang hanya bisa diperiksa pemilik (cadangan database, domain, kunci rahasia).

**DP-02** Given skrip `scripts/smoke.mjs` dijalankan terhadap URL yang di-deploy, Then ia memeriksa: `/api/ping` 200, `/api/ready` 200, `/api/tasks` tanpa token 401 dengan struktur error, preflight CORS dari origin yang diizinkan lolos dan dari origin acak ditolak, header keamanan helmet ada, respons 404 tidak memuat stack. Exit code non-nol bila satu pun gagal.

**DP-03** Given Prisma berjalan lewat pooler koneksi (PgBouncer mode transaksi), Then `schema.prisma` memakai `directUrl` untuk migrasi dan `DATABASE_URL` memuat `pgbouncer=true`. Bila database tanpa pooler, `directUrl` tetap diisi nilai yang sama. **[VERIFIED]** `schema.prisma` saat ini tidak punya `directUrl`.

## 5. Kontrak API tambahan

| Method   | Route                                            | Autentikasi | Fase |
| :------- | :----------------------------------------------- | :---------- | :--: |
| `GET`    | `/api/tasks?q=`                                  | ya          |  12  |
| `GET`    | `/api/tasks/:taskId/evidence` (bentuk dikoreksi) | ya          |  6R  |
| `POST`   | `/api/tasks/:taskId/evidence/:evidenceId/verify` | ya          |  11  |
| `GET`    | `/api/metrics/heatmap`                           | ya          |  13  |
| `GET`    | `/api/report`                                    | ya          |  13  |
| `GET`    | `/api/user/export`                               | ya          |  9   |
| `DELETE` | `/api/user`                                      | ya          |  9   |
| `GET`    | `/api/public/:handle`                            | **tidak**   |  10  |

Kode error baru: `REAUTH_REQUIRED` (403), `AUTH_DELETE_FAILED` (502), `HANDLE_UNAVAILABLE` (409), `SHOWCASE_REQUIRES_PROOF` (409), `SHOWCASE_LIMIT_REACHED` (409).

## 6. NFR tambahan

| Kategori                   | Persyaratan                                                                                                                                                                                                                                                  |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keamanan endpoint publik   | Tanpa autentikasi, batas laju terpisah, respons 404 identik untuk profil privat dan tidak ada, whitelist field di sisi server (field baru tidak otomatis publik), tanpa ID internal, tanpa email, `X-Robots-Tag: noindex`.                                   |
| Keamanan permintaan keluar | Hanya ke `api.github.com`. Regex ketat sebelum permintaan. Tanpa redirect. Waktu habis dan batas ukuran. Token GitHub (opsional) hanya di sisi server dan tidak pernah dicatat.                                                                              |
| Rahasia                    | `SUPABASE_SERVICE_ROLE_KEY` dan `GITHUB_TOKEN` hanya di variabel lingkungan server. Tidak ada di klien, repo, log, atau pesan error.                                                                                                                         |
| Aksesibilitas              | Sama seperti v1.0, ditambah checklist di `docs/DESIGN_ADDENDUM_v1.1.md` bagian 12. Heatmap level 0 dan 1 tidak memenuhi 3:1 dan itu dinyatakan sebagai keterbatasan.                                                                                         |
| Bundel                     | JS gzip maksimal 150 kB (v1.0: 120 kB; saat ini 79.95 kB). Font di luar hitungan.                                                                                                                                                                            |
| Privasi                    | Bukti catatan tidak pernah keluar di endpoint publik. Hapus akun menghapus semua baris user. Tombstone tidak memuat data pribadi. Konsultasikan kewajiban UU No. 27 Tahun 2022 dan teks kebijakan privasi dengan ahli hukum. Agent tidak menulis teks hukum. |

## 7. Release gate tambahan

| Gate | Kriteria           | Bukti yang diminta                                                                                       |
| :--- | :----------------- | :------------------------------------------------------------------------------------------------------- |
| R-17 | R-01 sampai R-11   | nama test dan output mentah, ditambah uji ad-hoc audit yang gagal sebelum perbaikan dan lolos sesudahnya |
| R-18 | V-01 sampai V-03   | output suite E2E, laporan axe, tangkapan layar 6 lebar × 2 tema                                          |
| R-19 | DR-01 sampai DR-05 | output integrasi, bukti cascade (`count(*)` semua tabel = 0 untuk user), bukti tombstone                 |
| R-20 | PP-01 sampai PP-08 | output integrasi, uji pencarian string untuk email dan isi catatan                                       |
| R-21 | GH-01 sampai GH-06 | output unit dengan `fetch` palsu, tujuh vektor SSRF, tanpa permintaan keluar                             |
| R-22 | K, S, O            | output uji komponen, hasil keyboard-only                                                                 |
| R-23 | H-01, RP-01        | output integrasi batas hari, pratinjau cetak                                                             |
| R-24 | DP-01 sampai DP-03 | output `smoke.mjs` terhadap lingkungan nyata, URL run CI hijau                                           |

## 8. Keputusan yang hanya bisa diambil pemilik

| ID   | Keputusan                                                                                   | Default yang disarankan                                                                     | Dampak bila tidak diputuskan                     |
| :--- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------ | :----------------------------------------------- |
| D-01 | Siapa yang menyediakan `SUPABASE_SERVICE_ROLE_KEY` dan di mana disimpan                     | Pemilik membuatnya di dashboard Supabase dan menaruhnya hanya di variabel lingkungan server | Fase 9 berhenti di G13                           |
| D-02 | Host database: Supabase Postgres atau Postgres di platform deploy                           | Supabase Postgres dengan pooler dan `directUrl`                                             | Fase 14 berhenti di G16                          |
| D-03 | Host klien: Vercel, Cloudflare Pages, Netlify, atau statis di Railway                       | Cloudflare Pages atau Vercel (rewrite SPA gratis)                                           | Fase 14 berhenti di G16                          |
| D-04 | `GITHUB_TOKEN` read-only untuk repo publik, atau batas laju tanpa token (60 per jam per IP) | Token fine-grained read-only                                                                | Fase 11 berhenti di G14                          |
| D-05 | Teks kebijakan privasi dan syarat                                                           | Ditulis atau ditinjau pemilik dan ahli hukum                                                | Fase 10 dan 14 tidak boleh publik tanpa teks itu |
| D-06 | Persona A1 dari v1.0                                                                        | Tetap                                                                                       | Prioritas bisa bergeser                          |
| D-07 | Apakah fase 11 (GitHub) dikerjakan                                                          | Opsional, setelah 9 dan 10                                                                  | Fase dilewati                                    |
