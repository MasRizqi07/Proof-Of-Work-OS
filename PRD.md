# PRD — Proof of Work OS

| Field              | Nilai                                                                                                            |
| :----------------- | :--------------------------------------------------------------------------------------------------------------- |
| Versi              | 1.0 (LOCKED)                                                                                                     |
| Tanggal            | 2026-11-19                                                                                                       |
| Pemilik            | Pacoel (MasRizqi07)                                                                                              |
| Repo               | `MasRizqi07/Proof-Of-Work-OS`, branch `main`, HEAD `463c21b`                                                     |
| Authority          | Dokumen ini mengalahkan `README.md`, `AGENT_PROMPT.md`, dan `PROJECT_AUDIT_REPORT.md` kalau isinya bertentangan. |
| Dokumen pendamping | `docs/DESIGN.md` (token dan visual), `docs/ANTIGRAVITY_MASTER_PROMPT.md` (eksekusi per fase)                     |

Aturan baca: kalimat bertanda **[VERIFIED]** sudah diukur langsung di repo pada 2026-11-19. Kalimat bertanda **[CLAIM]** belum terbukti. Kalimat bertanda **[DECISION]** adalah keputusan produk yang sudah dikunci.

---

## 1. Problem

Developer Indonesia level junior sampai mid, termasuk mahasiswa Informatika, sulit membuktikan bahwa pekerjaan mereka benar-benar selesai. Task tracker biasa hanya menyimpan status. Status bisa diubah tanpa bukti. Hasilnya, riwayat kerja mereka tidak bisa dipercaya oleh diri sendiri, mentor, maupun recruiter.

Proof of Work OS menyimpan satu hal yang tidak dilakukan task tracker lain: **bukti di samping setiap klaim "selesai"**.

## 2. Target user

Persona utama: **Rizqi**, 21–24 tahun, mahasiswa Informatika di Surabaya, developer indie solo. Dia mengerjakan 5–8 proyek paralel. Sebagian implementasi didelegasikan ke AI coding agent, jadi dia butuh catatan kerja yang menolak klaim tanpa bukti.

Persona sekunder: developer junior yang sedang membangun portofolio untuk melamar kerja dan ingin riwayat kerja yang bisa diperiksa.

**[DECISION A1]** Persona ini adalah asumsi. README menyebut "developer performance tracking" tanpa menyebut siapa user-nya. Kalau persona salah, ubah PRD ini dulu sebelum fitur baru dibangun.

## 3. Prinsip produk

1. **Bukti, bukan klaim.** Task berstatus `done` tanpa bukti tetap boleh. Sistem menandainya "No proof" dan tidak menghitungnya ke Proof Rate.
2. **Jujur soal makna "proof".** Bukti di versi ini adalah tautan atau catatan yang user lampirkan sendiri (self-attested). Sistem tidak memverifikasi isinya ke pihak ketiga. Karena itu nama field adalah `hasProof`, bukan `verified`. Copy UI tidak boleh memakai kata "verified".
3. **Tanpa friksi paksa.** Sistem tidak memblokir penyelesaian task. Sistem hanya membuat ketiadaan bukti terlihat.
4. **Semua angka dihitung dari data tersimpan.** Tidak ada angka hard-coded.

## 4. Status implementasi saat ini

| Area                                          |           Status            | Bukti                                                                                                               |
| :-------------------------------------------- | :-------------------------: | :------------------------------------------------------------------------------------------------------------------ |
| Auth Supabase JWT (JWKS, issuer, audience)    |   [VERIFIED] ada di kode    | `server/src/middleware/auth.js`                                                                                     |
| CRUD task dan project, scoped ke user         |   [VERIFIED] ada di kode    | `server/src/routes/*.js` memakai `userId: req.user.id`                                                              |
| Activity events transaksional                 |   [VERIFIED] ada di kode    | `server/src/utils/events.js`                                                                                        |
| Build frontend                                |      [VERIFIED] lolos       | Vite 8.3.5, 118 modul, JS 279.98 kB (gzip 86.14 kB)                                                                 |
| Test frontend                                 |      [VERIFIED] lolos       | vitest 5.0.5, 1 file, 6 test                                                                                        |
| Lint                                          |    [VERIFIED] **gagal**     | 1 error: `client/src/lib/api.js:68` `URLSearchParams` `no-undef`                                                    |
| Format check                                  |    [VERIFIED] **gagal**     | 11 file tidak lolos Prettier                                                                                        |
| `npm audit --audit-level=high`                |    [VERIFIED] **gagal**     | 5 temuan: 2 high (`body-parser`, `zod`), 3 moderate                                                                 |
| Test backend                                  | [CLAIM] belum terverifikasi | Sandbox audit tidak bisa menjalankan `prisma generate` (jaringan). Wajib dijalankan ulang di mesin dengan jaringan. |
| Migrasi di PostgreSQL nyata                   | [CLAIM] belum terverifikasi | Tidak ada PostgreSQL di sandbox audit.                                                                              |
| Alur login dan CRUD terautentikasi di browser | [CLAIM] belum terverifikasi | Butuh project Supabase nyata.                                                                                       |
| Fitur AI, streak, poin                        |        **Tidak ada**        | README sendiri mengakuinya.                                                                                         |

`PROJECT_AUDIT_REPORT.md` bagian 2A menyatakan format, lint, dan audit lolos. Pada HEAD saat ini ketiganya gagal. Advisory baru bisa terbit setelah 2026-09-25, jadi selisih audit mungkin wajar. Selisih lint dan format tidak punya penjelasan itu.

## 5. Scope

Prioritas: **P0** = wajib agar produk bisa disebut beta. **P1** = penting, dikerjakan setelah P0. **Defer** = kode boleh disiapkan nanti, tidak dibangun sekarang. **Cut** = tidak akan dibangun.

| ID  | Fitur                                                                          | Prioritas | Verdict |
| :-- | :----------------------------------------------------------------------------- | :-------: | :-----: |
| F   | Fondasi: gate CI hijau, auth benar, validasi query, readiness, config produksi |    P0     |  Build  |
| A   | Isolasi data antar user terbukti di PostgreSQL nyata                           |    P0     |  Build  |
| T   | Task lifecycle yang benar (completedAt tidak berubah, progress konsisten)      |    P0     |  Build  |
| E   | Evidence: tautan dan catatan per task                                          |    P0     |  Build  |
| M   | Metrik Proof: Proof Rate, weekly streak, grafik 8 minggu                       |    P1     |  Build  |
| UX  | Dark mode, responsif 320–1440+, aksesibilitas AA, state loading/empty/error    |    P1     |  Build  |
| P   | Ringkasan task per project                                                     |    P1     |  Build  |
| D   | `README.md` akurat, `DEPLOY.md`, `CHANGELOG.md`                                |    P1     |  Build  |
| —   | Fitur AI coach                                                                 |     —     |  Defer  |
| —   | Integrasi GitHub (verifikasi PR/commit ke pihak ketiga)                        |     —     |  Defer  |
| —   | Upload file bukti (screenshot)                                                 |     —     |  Defer  |
| —   | Halaman profil publik yang bisa dibagikan                                      |     —     |  Defer  |
| —   | Team, organisasi, role                                                         |     —     |  Defer  |
| —   | Notifikasi email, realtime                                                     |     —     |  Defer  |
| —   | i18n (UI tetap Inggris)                                                        |     —     |  Defer  |
| —   | Migrasi TypeScript                                                             |     —     |  Defer  |
| —   | Demo mode (login palsu)                                                        |     —     | **Cut** |
| —   | Pembayaran (Midtrans)                                                          |     —     | **Cut** |

**Peringatan launch.** Sebelum produk dibuka ke publik, wajib ada fitur hapus akun dan ekspor data, plus kebijakan privasi. Konsultasikan kewajiban UU No. 27 Tahun 2022 (Pelindungan Data Pribadi) dengan ahli hukum. Ini bukan bagian dari rilis ini. Ini penghalang peluncuran publik.

## 6. Model domain

### 6.1 Entitas

Entitas yang sudah ada: `User`, `Profile`, `Project`, `Task`, `ActivityEvent`. Entitas baru: `Evidence`.

`Evidence`:

| Field       | Tipe                | Aturan                                                                                        |
| :---------- | :------------------ | :-------------------------------------------------------------------------------------------- |
| `id`        | UUID                | PK                                                                                            |
| `userId`    | UUID                | FK `User`, cascade delete. Diisi dari `req.user.id`, tidak pernah dari body.                  |
| `taskId`    | UUID                | FK `Task`, cascade delete                                                                     |
| `kind`      | enum `url` / `note` |                                                                                               |
| `label`     | text                | wajib, 1–120 karakter setelah trim                                                            |
| `url`       | text                | wajib jika `kind = url`, null jika `note`. Hanya `http` atau `https`. Maksimal 2048 karakter. |
| `body`      | text                | wajib jika `kind = note`, null jika `url`. Maksimal 2000 karakter.                            |
| `createdAt` | timestamp           | default now                                                                                   |

Batas: maksimal **20 evidence per task**.

### 6.2 State machine task

```
todo ──► in-progress ──► done
  │            │           │
  └────────────┴───────────┴──► cancelled
done ──► todo | in-progress   (reopen)
```

Aturan:

1. `completedAt` diisi **hanya saat transisi masuk ke `done`**. PATCH `done` pada task yang sudah `done` tidak mengubah `completedAt`.
2. `completedAt` di-null-kan saat task keluar dari `done`.
3. Saat masuk `done`, server mengatur `progress = 100`.
4. Database menjaga dua invarian dengan CHECK constraint: `progress` di antara 0 dan 100, dan `(status = 'done') = (completedAt IS NOT NULL)`.

### 6.3 Field turunan (tidak disimpan)

| Field        | Definisi                                             |
| :----------- | :--------------------------------------------------- |
| `proofCount` | Jumlah evidence pada task                            |
| `hasProof`   | `proofCount >= 1`                                    |
| `overdue`    | `dueDate < now` dan status `todo` atau `in-progress` |

Task "completed with proof" = `status = done` dan `hasProof = true`, dinilai **saat query**. Menghapus evidence terakhir mengubah task itu menjadi "No proof".

### 6.4 Definisi metrik

- **Proof Rate** = `withProof / completed`. Bernilai `null` kalau `completed = 0`.
- **Minggu** = Senin 00:00 sampai Minggu 23:59:59 menurut zona waktu `APP_TIMEZONE` (default `Asia/Jakarta`, UTC+7, tanpa DST). Task masuk ke minggu berdasarkan `completedAt`.
- **Minggu berbukti** = minggu dengan minimal 1 task completed with proof.
- **Current streak** = jumlah minggu berbukti berurutan yang berakhir di minggu ini. Kalau minggu ini belum punya bukti, hitungan berakhir di minggu lalu (minggu berjalan belum dianggap putus).
- **Longest streak** = deret minggu berbukti berurutan terpanjang sepanjang riwayat.

Vektor uji (hari ini = Senin 2026-11-16, semua tanggal adalah Senin awal minggu):

| Minggu berbukti     | Current | Longest |
| :------------------ | :-----: | :-----: |
| (kosong)            |    0    |    0    |
| 11-09, 11-16        |    2    |    2    |
| 11-02, 11-09        |    2    |    2    |
| 10-26, 11-09        |    1    |    1    |
| 10-19, 10-26, 11-02 |    0    |    3    |

Vektor batas zona waktu: `completedAt = 2026-11-15T16:59:59Z` jatuh di minggu `2026-11-09`. `completedAt = 2026-11-15T17:30:00Z` jatuh di minggu `2026-11-16`.

## 7. User stories dan acceptance criteria

Setiap kriteria harus bisa ditulis sebagai satu test. Kriteria yang tidak bisa diuji dianggap belum selesai ditulis.

### F — Fondasi

**F-01** Sebagai maintainer, saya ingin gate CI hijau, agar regresi terdeteksi sebelum merge.

- Given HEAD branch kerja, When `npm run format:check`, `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=high` dijalankan, Then kelimanya exit code 0.
- Given PostgreSQL 16 kosong bernama `proof_of_work_os_test`, When `npm run db:migrate:deploy` lalu `npm run db:migrate:status` dijalankan, Then migrasi diterapkan tanpa error dan status bersih.
- Given CI berjalan, When tahap integration test dieksekusi, Then test berjalan terhadap PostgreSQL nyata, bukan fake.

**F-02** Sebagai user, saya tidak ingin ter-logout karena database sedang bermasalah.

- Given token valid dan `provisionUser` melempar error database, When request masuk, Then respons `503` dengan `error.code = SERVICE_UNAVAILABLE`, bukan `401`.
- Given header `Authorization` tidak ada, Then `401 AUTH_REQUIRED`.
- Given token tidak valid atau kedaluwarsa, Then `401 AUTH_INVALID`.
- Given user sudah ada dan `email` serta `name` tidak berubah, When request terautentikasi masuk, Then tidak ada operasi tulis ke tabel `User`.
- Given `email` dari token sudah dimiliki `User` lain (unique violation), When provisioning berjalan, Then login tidak gagal, email tidak diubah, dan kejadian dicatat di log tanpa token.

**F-03** Sebagai klien API, saya ingin query tidak valid ditolak dengan jelas.

- Given `GET /api/tasks?page=abc`, Then `400 VALIDATION_ERROR` dengan `details[].path` menunjuk `page`.
- Given `limit=0`, `limit=101`, atau `page=0`, Then `400 VALIDATION_ERROR`.
- Given `GET /api/activities?page=abc`, Then perilaku sama (satu implementasi pagination dipakai bersama).

**F-04** Sebagai operator, saya ingin rate limit bekerja di belakang proxy.

- Given `TRUST_PROXY=1` dan header `X-Forwarded-For` berbeda per request, Then rate limit menghitung per IP klien.
- Given `TRUST_PROXY` tidak diset, Then nilai default `0` (tidak percaya proxy) dan `X-Forwarded-For` diabaikan.
- Given limit terlampaui, Then `429` dengan body `{ error: { code: "RATE_LIMITED", message }, requestId }`.

**F-05** Sebagai operator, saya ingin endpoint readiness.

- Given database aktif, When `GET /api/ready`, Then `200 { status: "ready", requestId }` tanpa autentikasi.
- Given database tidak terjangkau, Then `503 SERVICE_UNAVAILABLE`.
- Respons tidak boleh memuat `DATABASE_URL`, hostname database, atau pesan error mentah.

**F-06** Sebagai operator, saya ingin salah konfigurasi produksi gagal saat startup.

- Given `NODE_ENV=production` dan `CORS_ORIGIN` tidak diset eksplisit, Then proses menolak start dengan pesan yang menyebut `CORS_ORIGIN`.
- Given `NODE_ENV=production` tanpa `DATABASE_URL` atau `SUPABASE_URL`, Then proses menolak start (perilaku ini sudah ada, wajib tetap).
- Given `APP_TIMEZONE` bukan zona IANA yang valid, Then proses menolak start.

### A — Isolasi dan autentikasi

**A-01** Sebagai user, saya ingin data saya tidak bisa diakses user lain.

- Given user A memiliki task, project, dan evidence, When user B melakukan `GET`, `PATCH`, atau `DELETE` pada ID milik A, Then respons `404` (bukan `403`, agar keberadaan data tidak bocor).
- Given user B memanggil `GET /api/tasks`, `GET /api/projects`, `GET /api/activities`, Then daftar tidak memuat satu pun data milik A.
- Test ini berjalan terhadap PostgreSQL nyata dengan dua user berbeda, bukan terhadap fake database.

**A-02** Sebagai user, saya ingin sesi kedaluwarsa ditangani dengan benar.

- Given API mengembalikan `401`, When klien menerimanya, Then klien mencoba `supabase.auth.refreshSession()` satu kali dan mengulang request satu kali.
- Given refresh gagal, Then klien melakukan sign out dan menampilkan "Your session expired. Please sign in again."

**A-03** Sebagai developer, saya tidak ingin login palsu.

- Given variabel `VITE_SUPABASE_URL` atau `VITE_SUPABASE_ANON_KEY` kosong, When aplikasi dibuka, Then layar "Configuration required" tampil dengan nama variabel yang kurang, dan klien tidak memanggil API sama sekali.

### T — Task

**T-01** Sebagai user, saya ingin membuat task dengan validasi.

- Given `POST /api/tasks` dengan `{}`, Then `400 VALIDATION_ERROR`.
- Given field tidak dikenal di body, Then `400` (skema `strict`).
- Given `projectId` milik user lain atau project yang diarsipkan, Then `404 PROJECT_NOT_FOUND`.

**T-02** Sebagai user, saya ingin mengedit task di panel detail.

- Given task milik saya, When saya mengubah title, description, priority, dueDate, progress, atau project lewat panel detail, Then `PATCH` terkirim hanya dengan field yang berubah dan UI menampilkan nilai baru.

**T-03** Sebagai user, saya ingin riwayat penyelesaian akurat.

- Given task `done` dengan `completedAt = X`, When `PATCH { status: "done" }` dikirim lagi, Then `completedAt` tetap `X`.
- Given task `done`, When status diubah ke `in-progress`, Then `completedAt = null` dan event `task.reopened` tercatat.
- Given task `in-progress`, When status diubah ke `done`, Then `completedAt` terisi, `progress = 100`, dan event `task.completed` tercatat.
- Given insert atau update langsung ke database yang melanggar invarian (`progress = 150`, atau `status = done` dengan `completedAt = NULL`), Then database menolak lewat CHECK constraint.

**T-04** Sebagai user, saya ingin memfilter task.

- Given `GET /api/tasks?hasProof=false&status=done`, Then hanya task `done` tanpa evidence yang muncul.
- Given `hasProof=maybe`, Then `400 VALIDATION_ERROR`.

**T-05** Sebagai user, saya ingin tahu task mana yang terlambat.

- Given task `todo` dengan `dueDate` kemarin, Then respons memuat `overdue: true` dan UI menampilkan penanda teks "Overdue" (bukan warna saja).
- Given task `done` dengan `dueDate` kemarin, Then `overdue: false`.

**T-06** Sebagai user, saya ingin konfirmasi sebelum menghapus.

- Given saya menekan Delete, Then dialog konfirmasi (elemen `dialog`) muncul dengan fokus di tombol "Cancel". Task baru terhapus setelah "Delete task" dikonfirmasi.

### E — Evidence

**E-01** Sebagai user, saya ingin melampirkan tautan sebagai bukti.

- Given `POST /api/tasks/:taskId/evidence` dengan `{ kind: "url", label: "PR #12", url: "https://github.com/a/b/pull/12" }`, Then `201` dan respons memuat `id`, `kind`, `label`, `url`, `createdAt`.
- Given `url` berskema `javascript:`, `data:`, `ftp:`, `file:`, atau tanpa skema, Then `400 VALIDATION_ERROR`.
- Alasan: `z.string().url()` di zod 3.25.76 meloloskan `javascript:alert(1)`, `data:text/html,x`, dan `ftp://x.y` **[VERIFIED]**. Validasi wajib memeriksa protokol secara eksplisit.

**E-02** Sebagai user, saya ingin melampirkan catatan teks (misalnya potongan log test).

- Given `{ kind: "note", label: "Test output", body: "42 passed" }`, Then `201`.
- Given `kind = note` dan `url` ikut dikirim, Then `400`. Begitu pula `kind = url` dengan `body`.
- Given `body` lebih dari 2000 karakter, Then `400`.

**E-03** Sebagai user, saya ingin melihat dan menghapus evidence saya sendiri.

- Given `GET /api/tasks/:taskId/evidence`, Then daftar berpaginasi `{ items, page, limit, total, pages }`, urut terbaru dulu.
- Given `DELETE /api/tasks/:taskId/evidence/:evidenceId` milik saya, Then `204` dan event `evidence.removed` tercatat.
- Given task atau evidence milik user lain, Then `404 EVIDENCE_NOT_FOUND` atau `404 TASK_NOT_FOUND`.
- Given `evidenceId` milik task lain, Then `404 EVIDENCE_NOT_FOUND`.

**E-04** Sebagai operator, saya ingin penyalahgunaan dibatasi.

- Given task sudah punya 20 evidence, When evidence ke-21 dikirim, Then `409 EVIDENCE_LIMIT_REACHED`.

**E-05** Sebagai user, saya ingin tautan bukti aman dibuka.

- Given evidence `url`, Then UI merender `a` dengan `target="_blank"` dan `rel="noopener noreferrer"`, menampilkan hostname, dan memakai huruf monospace.
- Given evidence `note`, Then UI merender sebagai teks biasa (bukan HTML) dalam blok `pre`.

**E-06** Sebagai user, saya ingin diingatkan menambah bukti tanpa dipaksa.

- Given saya menandai task `done` dan task belum punya evidence, Then task tetap tersimpan `done`, dan UI menampilkan lencana "No proof yet" bersama tombol "Add proof".

**E-07** Sebagai user, saya ingin status bukti selalu mengikuti data.

- Given task `done` punya tepat 1 evidence, When evidence itu dihapus, Then `hasProof` menjadi `false` dan task ikut keluar dari hitungan "with proof" di metrik.
- Given task dihapus, Then evidence-nya ikut terhapus (cascade), dibuktikan dengan query langsung ke tabel `Evidence`.

### M — Metrik

**M-01** Sebagai user, saya ingin ringkasan Proof saya.

- Given `GET /api/metrics/summary`, Then respons berbentuk:

```json
{
  "timezone": "Asia/Jakarta",
  "generatedAt": "2026-11-19T03:00:00.000Z",
  "totals": {
    "completed": 12,
    "withProof": 9,
    "withoutProof": 3,
    "proofRate": 0.75,
    "overdueOpen": 2
  },
  "streak": { "currentWeeks": 3, "longestWeeks": 5 },
  "weekly": [{ "weekStart": "2026-09-28", "withProof": 0, "withoutProof": 0 }]
}
```

- `weekly` selalu berisi tepat 8 elemen, urut dari terlama, diisi nol untuk minggu kosong, elemen terakhir adalah minggu berjalan.
- Given user tanpa task, Then `proofRate = null`, semua hitungan 0, `weekly` tetap 8 elemen.
- Given dua user dengan data berbeda, Then masing-masing hanya melihat angkanya sendiri.
- Fungsi hitung streak adalah fungsi murni dan lolos seluruh vektor uji di bagian 6.4.
- Query SQL memakai parameter terikat (`Prisma.sql`). Tidak ada penggabungan string.

**M-02** Sebagai user, saya ingin angka itu tampil di dashboard.

- Given dashboard terbuka, Then empat kartu tampil: "Proof rate", "Current streak", "Completed with proof", "Completed without proof", ditambah grafik 8 minggu.
- Given user baru tanpa data, Then kartu menampilkan "—" dan grafik menampilkan state kosong bertulis.
- Grafik punya alternatif teks: tabel data dalam elemen `details`.

**M-03** Sebagai klien lama, saya tidak ingin `GET /api/user` berubah.

- Given `GET /api/user`, Then field `metrics.completedTasks`, `metrics.projectsCompleted`, `metrics.weeklyActivityEvents` tetap ada dengan arti yang sama.

### P — Project

**P-01** Sebagai user, saya ingin melihat kemajuan tiap project.

- Given `GET /api/projects`, Then setiap item memuat `taskCounts: { total, done }`, dan UI menampilkan "3 of 8 done".
- Given project diarsipkan, Then project hilang dari daftar dan dropdown, dan task-nya tidak ikut terhapus.

### UX — Antarmuka

**UX-01** Responsif.

- Given viewport 320, 480, 768, 1024, 1440, dan 1920 px lebar, Then tidak ada scroll horizontal pada `body` dan tidak ada teks atau tombol terpotong.

**UX-02** Tema.

- Given sistem operasi memakai dark mode dan user belum memilih, Then aplikasi tampil dark tanpa kilatan terang saat load.
- Given user menekan toggle tema, Then pilihan tersimpan dan bertahan setelah reload.
- Aturan lengkap ada di `docs/DESIGN.md`.

**UX-03** Aksesibilitas (target WCAG 2.2 AA).

- Semua kontrol bisa dioperasikan dengan keyboard saja. Fokus selalu terlihat. Ada skip link ke konten utama. Status tidak pernah dibedakan hanya oleh warna. Error form diumumkan lewat `role="alert"`. Animasi menghormati `prefers-reduced-motion`.
- Pasangan warna di `docs/DESIGN.md` memenuhi rasio kontras yang tertulis di sana.

**UX-04** State.

- Setiap daftar dan panel punya state loading (skeleton), empty (dengan ajakan tindakan), dan error (dengan tombol Retry). Saat offline, banner persisten muncul.

## 8. Kontrak API (perubahan dan tambahan)

Perubahan bersifat **additive**. Field dan route yang sudah ada tidak boleh berubah nama atau arti.

| Method         | Route                                     | Status       | Catatan                                                                  |
| :------------- | :---------------------------------------- | :----------- | :----------------------------------------------------------------------- |
| `GET`          | `/api/ready`                              | baru, publik | F-05                                                                     |
| `GET`          | `/api/tasks`                              | diubah       | tambah query `hasProof`; item memuat `proofCount`, `hasProof`, `overdue` |
| `GET`, `PATCH` | `/api/tasks/:taskId`                      | diubah       | tambah tiga field turunan yang sama                                      |
| `GET`, `POST`  | `/api/tasks/:taskId/evidence`             | baru         | E-01, E-02, E-03                                                         |
| `DELETE`       | `/api/tasks/:taskId/evidence/:evidenceId` | baru         | E-03                                                                     |
| `GET`          | `/api/metrics/summary`                    | baru         | M-01                                                                     |
| `GET`          | `/api/projects`                           | diubah       | tambah `taskCounts`                                                      |

Format error tetap: `{ "error": { "code", "message", "details?" }, "requestId" }`.

| Kode                     | HTTP | Kapan                                      |
| :----------------------- | :--: | :----------------------------------------- |
| `AUTH_REQUIRED`          | 401  | tidak ada token                            |
| `AUTH_INVALID`           | 401  | token tidak valid                          |
| `VALIDATION_ERROR`       | 400  | body atau query tidak lolos skema          |
| `TASK_NOT_FOUND`         | 404  |                                            |
| `PROJECT_NOT_FOUND`      | 404  |                                            |
| `EVIDENCE_NOT_FOUND`     | 404  |                                            |
| `EVIDENCE_LIMIT_REACHED` | 409  | evidence ke-21                             |
| `RATE_LIMITED`           | 429  |                                            |
| `SERVICE_UNAVAILABLE`    | 503  | database tidak tersedia                    |
| `INTERNAL_ERROR`         | 500  | error tak terduga, tanpa stack di produksi |

Tipe event baru: `evidence.added`, `evidence.removed` (metadata hanya `{ kind }`; URL dan isi catatan tidak masuk log aktivitas).

## 9. Non-functional requirements

| Kategori          | Persyaratan                                                                                                                                                                                                        | Cara membuktikan                                                            |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| Keamanan          | Identitas hanya dari JWT. Skema `strict` pada semua body. Protokol URL diperiksa eksplisit. Query SQL mentah hanya lewat parameter terikat. Header `Authorization`, URL evidence, dan isi catatan tidak masuk log. | Test A-01, E-01; `git grep` pola terlarang (didefinisikan di master prompt) |
| Performa (target) | `GET /api/metrics/summary` di bawah 100 ms pada 5.000 task lokal PostgreSQL 16. Query daftar task memakai index, bukan sequential scan pada `Task`.                                                                | `EXPLAIN (ANALYZE, BUFFERS)` mentah dilampirkan                             |
| Ukuran bundle     | JS gzip maksimal 120 kB (saat ini 86.14 kB). Font di luar hitungan itu.                                                                                                                                            | output `npm run build` mentah                                               |
| Keandalan         | Shutdown bersih saat SIGTERM (sudah ada). Error database tidak menjadi `401`.                                                                                                                                      | F-02                                                                        |
| Observabilitas    | Setiap respons membawa `x-request-id` (sudah ada). Log error memuat `requestId`.                                                                                                                                   | test yang sudah ada tetap lolos                                             |
| Aksesibilitas     | WCAG 2.2 AA sebagai target. Tidak ada klaim sertifikasi.                                                                                                                                                           | checklist manual di `docs/DESIGN.md` bagian 11                              |
| Dependensi        | Tidak ada dependensi runtime baru di server. Dependensi baru di klien hanya yang tercantum di master prompt bagian 1 (keputusan 12).                                                                               | `git diff` pada `package.json`                                              |

## 10. Out of scope (rilis ini)

Daftar ini juga berlaku sebagai batasan untuk AI agent. Membangun salah satunya adalah pelanggaran scope.

- Pemanggilan provider AI apa pun, termasuk "AI career coach".
- Integrasi API GitHub atau layanan pihak ketiga lain.
- Upload file, storage, atau bucket.
- Halaman profil publik, tautan berbagi, SEO.
- Team, organisasi, role, invite.
- Email, push notification, websocket, realtime.
- OpenAPI atau Swagger.
- i18n. Seluruh teks UI berbahasa Inggris dan `lang="en"`.
- Migrasi TypeScript. Server tetap CommonJS, klien tetap JSX.
- Dockerfile dan proses deploy nyata. `DEPLOY.md` hanya dokumentasi.
- Framework UI (Tailwind, shadcn, MUI), library state (Zustand, Redux), library chart, library tanggal, router.
- Mengubah migrasi `0001_init` dan `0002_harden_task_lifecycle`.

## 11. Success metric

**Satu angka:** Proof Rate 30 hari milik pemilik produk di workspace-nya sendiri ≥ **70%** setelah 4 minggu pemakaian rutin.

Rumus: task `done` dengan ≥ 1 evidence dibagi semua task `done` dalam 30 hari terakhir, dibaca dari `GET /api/metrics/summary`.

Kalau angka ini tidak naik meski fitur sudah lengkap, masalahnya ada di alur menambah bukti, bukan di fitur.

## 12. Asumsi dan keputusan terbuka

| ID  | Asumsi                                                                                                | Dampak kalau salah                                                                                                             |
| :-- | :---------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| A1  | Persona di bagian 2 benar                                                                             | Semua prioritas bergeser. Revisi PRD dulu.                                                                                     |
| A2  | Zona waktu default `Asia/Jakarta` cukup                                                               | Streak salah untuk user di WITA/WIT. Tambah `timezone` per user di rilis berikutnya.                                           |
| A3  | Project Supabase untuk pengujian tersedia                                                             | Alur browser terautentikasi tidak bisa dibuktikan. Master prompt mewajibkan agent melaporkan "NOT VERIFIED", bukan memalsukan. |
| A4  | PostgreSQL 16 lokal atau Docker tersedia di mesin agent                                               | Test integrasi tidak bisa dijalankan lokal. CI tetap menjalankannya.                                                           |
| A5  | Upgrade zod ke versi mayor yang ditambal tidak merusak lebih dari `validation.js`, `env.js`, dan test | Kalau lebih luas, agent berhenti di STOP gate G3.                                                                              |

## 13. Release gate (checklist bukti)

Tidak ada kotak yang boleh dicentang tanpa bukti mentah terlampir di laporan fase. Pemilik produk yang mencentang, bukan agent.

| Gate | Kriteria                                      | Bukti yang diminta                                          | Status |
| :--- | :-------------------------------------------- | :---------------------------------------------------------- | :----: |
| R-01 | F-01 lima gate lokal exit 0                   | output mentah lima perintah                                 |  [ ]   |
| R-02 | F-01 migrasi di PostgreSQL nyata              | output `migrate deploy` dan `migrate status`                |  [ ]   |
| R-03 | A-01 isolasi dua user                         | output `test:integration` mentah                            |  [ ]   |
| R-04 | F-02 database mati bukan 401                  | nama test dan outputnya                                     |  [ ]   |
| R-05 | T-03 `completedAt` stabil                     | nama test dan outputnya                                     |  [ ]   |
| R-06 | T-03 CHECK constraint menolak data buruk      | output `psql` atau test yang menyalakan error constraint    |  [ ]   |
| R-07 | E-01 `javascript:` ditolak                    | nama test dan outputnya                                     |  [ ]   |
| R-08 | E-07 cascade dan flip `hasProof`              | nama test dan outputnya                                     |  [ ]   |
| R-09 | M-01 semua vektor streak dan batas zona waktu | output test unit dan integrasi                              |  [ ]   |
| R-10 | NFR performa                                  | output `EXPLAIN (ANALYZE, BUFFERS)`                         |  [ ]   |
| R-11 | UX-01 enam lebar viewport                     | screenshot atau catatan "NOT VERIFIED"                      |  [ ]   |
| R-12 | UX-02 dua tema, tanpa kilatan, tersimpan      | screenshot dua tema dan hasil reload                        |  [ ]   |
| R-13 | UX-03 keyboard-only dan kontras               | checklist terisi                                            |  [ ]   |
| R-14 | A-02, A-03 alur terautentikasi di browser     | rekaman atau "NOT VERIFIED" bila Supabase tidak tersedia    |  [ ]   |
| R-15 | `README.md` akurat                            | `git diff`; tabel route cocok dengan `git grep "router\\."` |  [ ]   |
| R-16 | CI remote hijau                               | URL run GitHub Actions dan kesimpulannya                    |  [ ]   |
