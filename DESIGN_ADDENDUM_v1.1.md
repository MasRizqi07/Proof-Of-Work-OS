# DESIGN ADDENDUM v1.1 — Proof of Work OS

| Field | Nilai |
| :--- | :--- |
| Versi | 1.1 (LOCKED) |
| Tanggal | 2026-11-22 |
| Hubungan | Menambah `docs/DESIGN.md` v1.0. Semua aturan v1.0 tetap berlaku (token tiga tingkat, nol hex di luar `tokens.css`, dua tema, WCAG 2.2 AA sebagai target). Dokumen ini hanya menambah. |
| Batasan | CSS biasa. Tanpa library UI, ikon, chart, tanggal, router, atau palette. Semua interaksi memakai elemen native (`dialog`, `details`, `kbd`, `Intl`). |

Arah visual tidak berubah: hangat, tenang, kontras tinggi, data bukti dalam monospace, hijau hanya untuk "ada bukti". Tambahan v1.1 memakai satu aksen baru yang sudah ada: biru tinta (`--color-accent`) untuk sinyal "dicek pihak ketiga" (lencana GitHub). Hijau tetap eksklusif untuk bukti.

---

## 1. Token baru (hanya di `tokens.css`)

### 1.1 Skala heatmap

Lima level intensitas bukti per hari. Level 4 sama dengan `--color-proof-fg`.

| Token | Terang | Gelap | Kontras vs `surface` (terang / gelap) |
| :--- | :--- | :--- | :---: |
| `--color-heat-0` | `#e0dacb` | `#272621` | 1.37 / 1.11 |
| `--color-heat-1` | `#b7d8c2` | `#1f4a31` | 1.52 / 1.67 |
| `--color-heat-2` | `#52a173` | `#2f7a52` | 3.08 / 3.23 |
| `--color-heat-3` | `#2e8a5b` | `#4fae7c` | 4.22 / 6.17 |
| `--color-heat-4` | `#17603f` | `#7fd8a6` | 7.43 / 9.86 |

Nilai dihitung dengan rumus luminansi WCAG. Level 2 sampai 4 memenuhi 3:1 (WCAG 1.4.11). **Level 0 dan 1 tidak memenuhi 3:1 dan itu keterbatasan yang diketahui.** Penutupnya ada tiga: tabel data lengkap sebagai alternatif teks, `aria-label` per sel ("12 Nov 2026: 2 with proof, 1 without"), dan legenda angka yang terlihat. Sel level 0 diberi border 1px `--color-border`, bukan hanya isian.

Tambahkan nilai primitif ke Tingkat 1 (`--ref-heat-*`) dan petakan ke Tingkat 2 seperti token lain. Kedua blok gelap (`[data-theme='dark']` dan `@media (prefers-color-scheme: dark)`) tetap harus identik.

### 1.2 Token cetak

Blok `@media print` di `tokens.css` memaksa tema terang tanpa bergantung pada pilihan user:

```css
@media print {
  :root,
  [data-theme='dark'] {
    color-scheme: light;
    /* ulangi nilai semantic tema terang di sini dengan var(--ref-*) */
  }
}
```

Kontras cetak: teks utama di atas kertas `--ref-paper-50` = 16.95:1. Link `--ref-blue-700` di atas kertas = 7.51:1.

## 2. Ikon tambahan

`Icon.jsx` boleh bertambah sampai 24 ikon total (v1.0: 12). Tambahan yang diizinkan: `command`, `keyboard`, `git-merge`, `share`, `download`, `user`, `settings`, `calendar`, `search`, `copy`, `external`, `lock`. Aturan v1.0 tetap: SVG inline, `stroke-width` 1.75, `currentColor`, `aria-hidden`, selalu berpasangan dengan teks kecuali tombol ikon ber-`aria-label`.

## 3. Heatmap bukti (H-01)

Grid 26 minggu × 7 hari. Kolom = minggu (Senin pertama), baris = hari (Senin di atas). Sel 12×12 px, jarak 3 px, `--radius-control` dikurangi jadi 2 px.

- Warna sel dari jumlah task `done` hari itu yang punya bukti: 0 → level 0, 1 → 1, 2 → 2, 3–4 → 3, 5+ → 4. Hari yang hanya punya task tanpa bukti tetap level 0 dan memakai penanda titik kecil `--color-noproof-fg` di sudut sel, supaya "selesai tanpa bukti" terlihat tanpa memakai hijau.
- Label hari di kiri: Mon, Wed, Fri. Label bulan di atas pada kolom pertama tiap bulan, memakai `Intl.DateTimeFormat`.
- Di lebar kurang dari 560 px grid lebih lebar dari layar. Wadahnya `overflow-x: auto`, `body` tidak boleh ikut scroll, dan posisi scroll awal ada di minggu terbaru.
- Hari ini diberi outline `--focus-ring` yang berbeda dari fokus keyboard (garis putus-putus 1px).
- Legenda: "Less ▢ ▢ ▢ ▢ ▢ More" dengan angka batas level di `title`.
- Alternatif teks wajib: `figure` dengan `figcaption` ringkasan ("26 weeks: 31 completed with proof, 6 without") dan `details` "Show data table" berisi `table` per hari yang tidak kosong.
- Setiap sel bisa difokus keyboard (`tabindex="-1"` dengan roving tabindex, panah menggeser sel, Tab keluar dari grid). Tooltip muncul saat hover dan fokus, tidak hanya hover.

## 4. Command palette dan pintasan (K-01 sampai K-03)

### 4.1 Palette

Elemen `dialog` modal dengan pola combobox: `input` (`role="combobox"`, `aria-expanded="true"`, `aria-controls`, `aria-activedescendant`) dan `ul` (`role="listbox"`). Buka dengan `Ctrl+K` atau `Cmd+K`. Semua aksi juga tersedia lewat tombol biasa di halaman, jadi palette adalah jalan pintas, bukan satu-satunya jalan.

- Lebar maksimal 560 px, margin atas 12vh, di layar sempit lebar penuh dengan margin 12 px.
- Kelompok hasil: **Actions** (New task, Show tasks with proof, Show tasks without proof, Toggle theme, Open settings, Copy public link, Print proof report) dan **Tasks** (judul task dari data yang sudah dimuat, maksimal 8 hasil).
- Pencarian cocok-sebagian, tidak peka huruf besar-kecil, dilakukan di klien terhadap daftar yang sudah dimuat. Tidak ada panggilan jaringan dari palette.
- Navigasi: panah atas dan bawah, Home, End, Enter menjalankan, Esc menutup dan mengembalikan fokus ke elemen sebelumnya. Hasil aktif memakai `aria-selected="true"` dan latar `--color-surface-sunken`.
- State kosong: "No match. Try a task title or an action."
- Kaki panel menampilkan petunjuk dengan `kbd`: "↑↓ move · Enter run · Esc close".

### 4.2 Pintasan

| Tombol | Aksi |
| :--- | :--- |
| `n` | fokus ke judul form task baru |
| `/` | fokus ke kotak pencarian task |
| `t` | ganti tema |
| `?` | buka dialog bantuan pintasan |

Aturan: pintasan satu huruf tidak aktif saat fokus berada di `input`, `textarea`, `select`, atau elemen `contenteditable`, tidak aktif saat dialog lain terbuka, dan tidak bertabrakan dengan pintasan browser atau pembaca layar (tidak memakai kombinasi `Ctrl` atau `Alt` kecuali `Ctrl/Cmd+K`). Setiap pintasan harus punya padanan tombol terlihat di UI (WCAG 2.1.4). Dialog bantuan mendaftar semuanya dalam `table`.

`kbd`: huruf monospace `--text-xs`, latar `--color-surface-sunken`, border 1px `--color-border-control`, radius `--radius-control`, padding 2px 6px. Kontras teks `kbd` terhadap latarnya 14.36:1 (terang) dan 15.59:1 (gelap).

## 5. Pencarian task (S-01)

Satu `input type="search"` dengan label terlihat "Search tasks" di atas filter. Debounce 250 ms. Tombol hapus teks memakai `aria-label="Clear search"`. Hasil kosong memakai state kosong v1.0 dengan teks "No tasks match “…”" (tanda kutip tipografis, teks pencarian sebagai teks biasa).

## 6. Pembaruan optimistis (O-01)

Perubahan status cepat dan penambahan atau penghapusan bukti langsung tampak di UI sebelum server menjawab.

- Elemen yang sedang menunggu: `aria-busy="true"` dan opasitas 0.7. Ukuran tidak berubah (tanpa layout shift).
- Bila server menolak: UI kembali ke nilai sebelumnya dan pesan inline muncul di dekat pemicu dengan `role="alert"` ("Couldn't update this task. Your change was undone.").
- Teks "Saved." hanya muncul setelah server menjawab sukses. Tidak boleh ada konfirmasi sebelum itu.

## 7. Transisi tampilan (progressive enhancement)

`document.startViewTransition` dipakai untuk ganti tema dan membuka atau menutup panel detail bila browser mendukung. Tanpa dukungan, perilaku tetap benar tanpa animasi. `prefers-reduced-motion: reduce` mematikannya sepenuhnya. Tidak ada transisi di luar dua tempat itu.

## 8. Halaman profil publik (PP-05)

Halaman terbuka tanpa login di `/u/handle`. Tidak ada elemen auth, tidak ada tombol aksi data. Semua teks pengguna dirender sebagai teks biasa.

Susunan satu kolom (maksimal 760 px, di tengah):

```
┌──────────────────────────────────────────────┐
│ @handle                         [Dark theme] │
│ Display name                                 │
│ Bio (maks 500 karakter)                      │
│ Focus: ...                                   │
├──────────────────────────────────────────────┤
│ Proof rate | Streak | With proof | Merged PR │
│ [ 8-week chart ]                             │
│ [ 26-week heatmap ]                          │
├──────────────────────────────────────────────┤
│ Showcase (maks 6)                            │
│ ┌ Judul task · selesai 12 Nov 2026 ────────┐ │
│ │ ✓ PR #12  github.com        [Merged PR…] │ │
│ │ ▤ Test output (catatan pribadi)          │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ Catatan: bukti dilampirkan sendiri oleh      │
│ pemilik. Lencana "Merged on GitHub" dicek ke │
│ API publik GitHub dan tidak membuktikan      │
│ identitas pemilik.                           │
└──────────────────────────────────────────────┘
```

Aturan tampilan:
- Bukti `note` hanya menampilkan label dan ikon catatan. Isi catatan tidak pernah tampil di halaman publik.
- Bukti `url` menampilkan label dan hostname (monospace) dengan tautan `target="_blank" rel="noopener noreferrer"`, melalui fungsi `safeHref` yang hanya meloloskan `http:` dan `https:`.
- Catatan kaki jujur di atas wajib tampil dan tidak boleh disembunyikan di layar kecil.
- Profil privat atau tidak ada: satu state yang sama, "This profile isn't public or doesn't exist." Tidak ada petunjuk mana yang terjadi.
- Tag `meta name="robots" content="noindex"` dipasang oleh klien saat halaman dirender. Pengaturan indeks mesin pencari ditunda (Defer).
- Kartu showcase memakai komponen kartu v1.0. Tidak ada gaya baru.

## 9. Dialog pengaturan (DR-03, PP-06)

Elemen `dialog` yang sama dengan panel detail (lembar bawah di layar sempit, panel kanan di ≥ 768 px). Tiga bagian berurutan:

1. **Public profile**: toggle "Make my profile public" (`role="switch"`), input handle (`@` ditampilkan sebagai awalan terlihat di luar input), display name, tombol "Copy link" (`navigator.clipboard.writeText`, hasil "Link copied." dengan `role="status"`), dan tautan "Preview" yang membuka halaman publik di tab baru. Toggle tidak bisa dinyalakan bila handle kosong, dan alasannya ditulis di teks bantuan.
2. **Your data**: tombol "Download my data (JSON)".
3. **Danger zone**: penjelasan tentang apa yang terhapus, input konfirmasi "Type DELETE to confirm", dan tombol Danger yang tetap nonaktif sampai teks cocok persis. Bila server menjawab `REAUTH_REQUIRED`, pesan inline: "For safety, sign in again, then retry within 5 minutes."

## 10. Lencana GitHub (GH-05)

Lencana bukti dengan verifikasi memakai palet aksen, bukan hijau:

| Status | Tampilan |
| :--- | :--- |
| `merged` | latar `--color-accent-subtle`, teks `--color-accent`, ikon `git-merge`, teks "Merged on GitHub · owner/repo#42 · @author" |
| `open` | latar `--color-surface-sunken`, teks `--color-text-secondary`, teks "PR open · owner/repo#42" |
| `closed` | latar `--color-surface-sunken`, teks `--color-text-muted`, teks "PR closed, not merged · owner/repo#42" |
| tidak terverifikasi | tidak ada lencana tambahan. Bukti tampil seperti bukti biasa. |

`title` pada lencana berisi: "Checked against GitHub's public API on 22 Nov 2026. This does not prove who you are." Tanggal memakai `Intl.DateTimeFormat`. Pasangan `--color-accent` di atas `--color-accent-subtle` sudah terverifikasi di tabel kontras v1.0.

## 11. Laporan bukti untuk cetak (RP-01)

Halaman `/report` (perlu login) menampilkan task selesai dalam rentang 30, 90, atau 365 hari, dikelompokkan per minggu, dengan bukti lengkap termasuk isi catatan milik user sendiri. Tombol "Print or save as PDF" memanggil `window.print()`. Tidak ada library PDF.

Aturan cetak (`@media print`):
- Tema terang paksa (bagian 1.2). Chrome aplikasi (header, tombol, toggle, sidebar) disembunyikan.
- Header laporan: nama tampilan, rentang tanggal, "Generated {timestamp} · {timezone}", dan satu baris "Proof is attached by the owner. Merged-PR labels are checked against GitHub's public API."
- Tautan menampilkan URL penuh setelah teksnya: `a[href^='http']::after { content: ' (' attr(href) ')'; }`.
- `break-inside: avoid` pada setiap item task. Ukuran font dasar 11pt, huruf monospace untuk URL dan catatan.
- Tidak ada warna sebagai satu-satunya pembeda: "With proof" dan "No proof" tetap berupa teks.

## 12. Checklist tambahan (agent mengisi dengan bukti)

- [ ] Heatmap: tabel data, `aria-label` per sel, navigasi panah, scroll horizontal hanya di dalam wadahnya pada 320 px.
- [ ] Palette: uji hanya dengan keyboard (buka, ketik, panah, Enter, Esc, fokus kembali). Uji dengan pembaca layar jika tersedia, jika tidak tulis NOT VERIFIED.
- [ ] Pintasan: tidak aktif saat mengetik di input, setiap pintasan punya padanan tombol terlihat.
- [ ] Pembaruan optimistis: simulasikan kegagalan server (matikan server atau blokir permintaan), buktikan rollback dan pesan inline.
- [ ] Halaman publik: tanpa login, di 320 dan 1440 px, kedua tema, profil privat dan tidak ada menampilkan state yang sama.
- [ ] Cetak: pratinjau cetak (Ctrl+P) menunjukkan tema terang, tanpa chrome aplikasi, URL tercetak.
- [ ] `git grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" -- client/src ":!client/src/styles/tokens.css"` tetap tidak mengembalikan baris.
- [ ] Dua blok gelap di `tokens.css` tetap identik (lampirkan `diff`).

## 13. Ditolak sejak awal (tambahan)

- Library palette (cmdk, kbar), library heatmap, library tanggal, library PDF.
- Pintasan yang tidak punya padanan tombol terlihat.
- Menampilkan isi catatan bukti, email, atau ID internal di halaman publik.
- Memakai kata "verified" untuk bukti tanpa pengecekan pihak ketiga. Lencana GitHub memakai kalimat yang menyebut apa yang dicek.
- Warna hijau untuk lencana GitHub.
- Animasi di luar dua transisi tampilan di bagian 7.
