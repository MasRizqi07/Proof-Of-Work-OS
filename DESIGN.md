# DESIGN — Proof of Work OS

| Field          | Nilai                                                                                                                                          |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| Versi          | 1.0 (LOCKED)                                                                                                                                   |
| Tanggal        | 2026-11-19                                                                                                                                     |
| Authority      | `docs/PRD.md` mengalahkan dokumen ini untuk scope. Dokumen ini adalah sumber kebenaran untuk token, visual, dan perilaku antarmuka.            |
| Batasan teknis | CSS biasa (tanpa Tailwind, shadcn, atau framework UI). Tanpa library ikon, chart, atau tanggal. Server tetap tidak tersentuh oleh dokumen ini. |

---

## 1. Arah visual

**Tujuan antarmuka:** membuat user melihat dua hal sekilas: pekerjaan apa yang selesai, dan apakah ada buktinya.

**Arah:** hangat, tenang, kontras tinggi. Latar kertas krem, teks tinta gelap. Data bukti (URL, catatan, timestamp, angka) memakai huruf monospace. Satu-satunya warna hijau di seluruh aplikasi berarti "ada bukti". Amber berarti "selesai tanpa bukti". Warna tidak pernah menjadi satu-satunya pembeda status.

**Kenapa bukan tampilan saat ini.** Repo saat ini memakai indigo `#4f46e5` dengan font sistem. Itu tampilan default yang tidak membedakan produk ini dari task tracker lain. Perubahan ini hanya mengganti kulit. Struktur halaman dan komponen yang sudah berjalan tidak dirombak.

**Pertimbangan skill.** `frontend-design` dipakai untuk prinsip tipografi dan komitmen pada satu arah estetika. `ckmui-styling` (shadcn dan Tailwind) **ditolak**: repo memakai CSS biasa dan aturan nol dependensi baru melarangnya. `design-token-system` dipakai penuh untuk arsitektur token dan aturan dark mode.

## 2. Arsitektur token

Tiga tingkat. Komponen tidak boleh merujuk nilai warna mentah.

| Tingkat                                                                        | Isi                                         | Boleh dirujuk dari     |
| :----------------------------------------------------------------------------- | :------------------------------------------ | :--------------------- |
| 1. Primitive (`--ref-*`)                                                       | Nilai mentah: hex, ukuran                   | hanya Tingkat 2        |
| 2. Semantic (`--color-*`, `--space-*`, `--radius-*`, `--text-*`)               | Berbasis tujuan, berganti per tema          | komponen dan Tingkat 3 |
| 3. Component (`--button-*`, `--card-*`, `--input-*`, `--badge-*`, `--chart-*`) | Pemakaian spesifik, hanya merujuk Tingkat 2 | stylesheet komponen    |

Struktur file:

```
client/src/styles/
  tokens.css       # Tingkat 1 dan 2 (satu-satunya file yang boleh memuat hex dan rgba)
  base.css         # reset, tipografi, fokus, skip link, .visually-hidden
  components.css   # Tingkat 3 dan seluruh gaya komponen
```

`main.jsx` mengimpor ketiganya berurutan, lalu `App.css` dihapus setelah semua kelasnya dipindahkan.

### 2.1 Pemetaan token lama ke token baru

| Token lama (`App.css`)                              | Token baru                                               | Catatan                                     |
| :-------------------------------------------------- | :------------------------------------------------------- | :------------------------------------------ |
| `--color-primary`                                   | `--color-accent`                                         | hanya untuk link, fokus, dan state terpilih |
| `--color-primary-hover`                             | `--color-accent-hover`                                   |                                             |
| `--color-text`                                      | `--color-text`                                           |                                             |
| `--color-text-secondary`, `--color-text-dark-muted` | `--color-text-secondary`                                 | dua token lama digabung                     |
| `--color-text-muted`                                | `--color-text-muted`                                     |                                             |
| `--color-text-button`                               | `--color-text`                                           |                                             |
| `--color-error`                                     | `--color-danger-fg`                                      |                                             |
| `--color-bg`, `--color-surface`                     | `--color-bg`, `--color-surface`                          |                                             |
| `--color-border`                                    | `--color-border`                                         | dekoratif saja                              |
| `--color-input-border`                              | `--color-border-control`                                 | wajib 3:1                                   |
| `--color-input-bg`                                  | `--color-surface`                                        |                                             |
| `--color-shadow`                                    | `--shadow-1`, `--shadow-2`                               |                                             |
| `--color-ghost-bg`, `--color-ghost-hover`           | `--color-surface-sunken`, `--color-surface-sunken-hover` |                                             |
| `--color-status-*`                                  | `--badge-*` (Tingkat 3)                                  | lihat bagian 6.4                            |
| `--color-demo-bg`, `--color-demo-text`              | dihapus                                                  | demo mode di-Cut (PRD)                      |

### 2.2 Tingkat 1: primitive

```css
:root {
  /* paper / ink (netral hangat) */
  --ref-paper-50: #fffdf9;
  --ref-paper-100: #f7f4ee;
  --ref-paper-200: #efeae0;
  --ref-paper-250: #e6e0d2;
  --ref-paper-300: #e0dacb;
  --ref-stone-500: #857f70;
  --ref-stone-600: #6b665b;
  --ref-stone-700: #57534a;
  --ref-ink-800: #34322b;
  --ref-ink-900: #1c1b18;

  /* dark netral */
  --ref-night-50: #ece8df;
  --ref-night-100: #d8d3c7;
  --ref-night-300: #b5b0a3;
  --ref-night-400: #9d988b;
  --ref-night-500: #7d786b;
  --ref-night-700: #34322b;
  --ref-night-750: #272621;
  --ref-night-800: #1e1d19;
  --ref-night-900: #151512;
  --ref-night-950: #10100d;
  --ref-night-975: #0b0b09;

  /* aksen biru tinta */
  --ref-blue-100: #e4e8fb;
  --ref-blue-700: #2b45c4;
  --ref-blue-800: #2338a3;
  --ref-blue-200d: #b9c6ff;
  --ref-blue-300d: #9db0ff;
  --ref-blue-900d: #10133a;
  --ref-blue-950d: #1b2147;

  /* hijau (hanya untuk "ada bukti") */
  --ref-green-100: #e1f1e7;
  --ref-green-700: #17603f;
  --ref-green-300d: #7fd8a6;
  --ref-green-900d: #16301f;

  /* amber (hanya untuk "selesai tanpa bukti") */
  --ref-amber-100: #fbebc8;
  --ref-amber-800: #8a4b00;
  --ref-amber-300d: #f2b45a;
  --ref-amber-900d: #35270d;

  /* merah (bahaya, error, overdue) */
  --ref-red-100: #fde7e4;
  --ref-red-700: #b42318;
  --ref-red-300d: #ff9a8f;
  --ref-red-900d: #3a1814;
}
```

### 2.3 Tingkat 2: semantic

Nilai di bawah dibuat dari tabel kontras di bagian 3. Agent menulisnya memakai `var(--ref-*)`. Hex ditulis langsung di sini hanya agar dokumen ini bisa diperiksa tanpa membuka file lain.

Tema terang (default) dan tema gelap:

```css
:root,
[data-theme='light'] {
  color-scheme: light;
  --color-bg: #f7f4ee;
  --color-surface: #fffdf9;
  --color-surface-raised: #fffdf9;
  --color-surface-sunken: #efeae0;
  --color-surface-sunken-hover: #e6e0d2;
  --color-text: #1c1b18;
  --color-text-secondary: #57534a;
  --color-text-muted: #6b665b;
  --color-border: #e0dacb;
  --color-border-control: #857f70;
  --color-accent: #2b45c4;
  --color-accent-hover: #2338a3;
  --color-on-accent: #fffdf9;
  --color-accent-subtle: #e4e8fb;
  --color-btn-bg: #1c1b18;
  --color-btn-fg: #f7f4ee;
  --color-btn-bg-hover: #34322b;
  --color-proof-fg: #17603f;
  --color-proof-bg: #e1f1e7;
  --color-noproof-fg: #8a4b00;
  --color-noproof-bg: #fbebc8;
  --color-danger-fg: #b42318;
  --color-danger-bg: #fde7e4;
  --shadow-1: 0 1px 2px rgba(28, 27, 24, 0.06);
  --shadow-2: 0 8px 24px rgba(28, 27, 24, 0.08);
}

[data-theme='dark'] {
  color-scheme: dark;
  --color-bg: #151512;
  --color-surface: #1e1d19;
  --color-surface-raised: #272621;
  --color-surface-sunken: #10100d;
  --color-surface-sunken-hover: #0b0b09;
  --color-text: #ece8df;
  --color-text-secondary: #b5b0a3;
  --color-text-muted: #9d988b;
  --color-border: #34322b;
  --color-border-control: #7d786b;
  --color-accent: #9db0ff;
  --color-accent-hover: #b9c6ff;
  --color-on-accent: #10133a;
  --color-accent-subtle: #1b2147;
  --color-btn-bg: #ece8df;
  --color-btn-fg: #151512;
  --color-btn-bg-hover: #d8d3c7;
  --color-proof-fg: #7fd8a6;
  --color-proof-bg: #16301f;
  --color-noproof-fg: #f2b45a;
  --color-noproof-bg: #35270d;
  --color-danger-fg: #ff9a8f;
  --color-danger-bg: #3a1814;
  --shadow-1: none;
  --shadow-2: none;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    /* ulangi seluruh blok [data-theme='dark'] persis sama */
  }
}
```

Aturan: blok `@media` dan blok `[data-theme='dark']` harus identik. Agent menulis keduanya dari satu daftar dan melaporkan hasil `diff` keduanya.

Skala non-warna:

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  --radius-control: 6px;
  --radius-card: 12px;
  --radius-pill: 999px;

  --font-sans:
    'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    sans-serif;
  --font-mono:
    'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;
  --text-display: clamp(2rem, 5vw, 3.25rem);

  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  --focus-ring: 2px solid var(--color-accent);
  --focus-offset: 2px;
}
```

### 2.4 Tingkat 3: contoh komponen

```css
.button {
  --button-bg: var(--color-btn-bg);
  --button-fg: var(--color-btn-fg);
  --button-bg-hover: var(--color-btn-bg-hover);
  background: var(--button-bg);
  color: var(--button-fg);
  border-radius: var(--radius-control);
}
.button:hover:not(:disabled) {
  background: var(--button-bg-hover);
}
```

## 3. Kontras (dihitung, bukan perkiraan)

Rumus: luminansi relatif WCAG 2.x. Setiap baris dihitung ulang dengan skrip dan diberi `assert` terhadap ambang. Tabel ini dibuat dari skrip yang sama, jadi angkanya cocok dengan nilai token di bagian 2.3.

Teks (ambang 4.5:1, WCAG 1.4.3):

| Pasangan                  | Token (fg / bg)             | Ambang | Terang | Gelap |
| :------------------------ | :-------------------------- | :----: | :----: | :---: |
| Teks utama                | `text` / `bg`               | 4.5:1  | 15.69  | 14.96 |
| Teks utama                | `text` / `surface`          | 4.5:1  | 16.95  | 13.80 |
| Teks sekunder             | `text2` / `bg`              | 4.5:1  |  6.98  | 8.45  |
| Teks sekunder             | `text2` / `surface`         | 4.5:1  |  7.54  | 7.79  |
| Teks muted                | `muted` / `surface`         | 4.5:1  |  5.62  | 5.86  |
| Link / aksen              | `accent` / `surface`        | 4.5:1  |  7.51  | 8.10  |
| Link / aksen              | `accent` / `bg`             | 4.5:1  |  6.95  | 8.79  |
| Link hover                | `accent_hover` / `surface`  | 4.5:1  |  9.54  | 10.11 |
| Tombol primer             | `btn_fg` / `btn_bg`         | 4.5:1  | 15.69  | 14.96 |
| Tombol primer (hover)     | `btn_fg` / `btn_hover`      | 4.5:1  | 11.68  | 12.25 |
| Lencana With proof        | `proof_fg` / `proof_bg`     | 4.5:1  |  6.45  | 8.31  |
| Lencana No proof          | `noproof_fg` / `noproof_bg` | 4.5:1  |  5.77  | 7.91  |
| Pesan bahaya (di surface) | `danger_fg` / `surface`     | 4.5:1  |  6.47  | 8.25  |
| Lencana bahaya            | `danger_fg` / `danger_bg`   | 4.5:1  |  5.55  | 7.78  |
| Lencana in-progress       | `accent` / `accent_subtle`  | 4.5:1  |  6.26  | 7.44  |
| Lencana todo              | `text2` / `sunken`          | 4.5:1  |  6.39  | 8.81  |
| Lencana cancelled         | `muted` / `sunken`          | 4.5:1  |  4.76  | 6.62  |

Non-teks (ambang 3:1, WCAG 1.4.11):

| Pasangan                                  | Token (fg / bg)          | Ambang | Terang | Gelap |
| :---------------------------------------- | :----------------------- | :----: | :----: | :---: |
| Border kontrol (input, select) vs surface | `control` / `surface`    | 3.0:1  |  3.92  | 3.83  |
| Border kontrol vs bg                      | `control` / `bg`         | 3.0:1  |  3.63  | 4.16  |
| Cincin fokus vs bg                        | `accent` / `bg`          | 3.0:1  |  6.95  | 8.79  |
| Cincin fokus vs surface                   | `accent` / `surface`     | 3.0:1  |  7.51  | 8.10  |
| Batang chart "with proof" vs surface      | `proof_fg` / `surface`   | 3.0:1  |  7.43  | 9.86  |
| Batang chart "no proof" vs surface        | `noproof_fg` / `surface` | 3.0:1  |  6.70  | 9.20  |

Catatan:

- `--color-border` (dekoratif, pembatas kartu) sengaja **tidak** dikenai 3:1. Pembatas kontrol yang bisa dioperasikan memakai `--color-border-control`.
- Teks pada tombol primer memakai `--color-btn-fg`, bukan putih murni.
- Hasil di atas menjamin pasangan token, bukan tampilan akhir. Agent tetap memeriksa halaman nyata (bagian 11).

## 4. Dark mode

Dark mode adalah desain terpisah, bukan inversi warna.

1. Tanpa hitam murni dan putih murni. Latar `--ref-night-900`, teks `--ref-night-50`.
2. Elevasi di dark mode lewat permukaan yang lebih terang (`bg` → `surface` → `surface-raised`), bukan bayangan. `--shadow-1` dan `--shadow-2` bernilai `none`.
3. Aksen bergeser lebih terang dan sedikit kurang jenuh (`#2b45c4` menjadi `#9db0ff`).
4. Border dekoratif memakai `--ref-night-700`. Border kontrol memakai `--ref-night-500`.
5. Kontras diperiksa per tema (tabel bagian 3 menampilkan dua kolom).

### 4.1 Tanpa kilatan, tersimpan

Taruh skrip ini di `client/index.html`, di dalam `head`, **sebelum** tag `link` atau `script` modul apa pun:

```html
<meta name="color-scheme" content="light dark" />
<script>
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var dark = saved
        ? saved === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute(
        'data-theme',
        dark ? 'dark' : 'light',
      );
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

Toggle (`ThemeToggle.jsx`) mengganti atribut `data-theme` tanpa reload, menulis `localStorage` di dalam `try/catch`, dan memakai `aria-pressed`. Label tombol: "Dark theme". Nilai `aria-pressed` mengikuti tema aktif.

`theme-color`: dua tag `meta`, satu per `prefers-color-scheme`, nilai mengikuti `--color-bg` tiap tema.

## 5. Tipografi

| Peran     | Font          |  Bobot   | Ukuran                                                     | Dipakai untuk                                          |
| :-------- | :------------ | :------: | :--------------------------------------------------------- | :----------------------------------------------------- |
| Display   | IBM Plex Sans |   600    | `--text-display`, line-height 1.05, letter-spacing -0.02em | `h1` saja                                              |
| Heading   | IBM Plex Sans |   600    | `--text-xl`, `--text-lg`                                   | `h2`, `h3`                                             |
| Body      | IBM Plex Sans |   400    | `--text-base`, line-height 1.5                             | semua teks biasa                                       |
| Label, UI | IBM Plex Sans |   500    | `--text-sm`                                                | label form, tombol, lencana                            |
| Data      | IBM Plex Mono | 400, 500 | `--text-sm`                                                | URL bukti, isi catatan, timestamp, ID, angka statistik |

Aturan:

- Ukuran font input minimal 16px (mencegah zoom otomatis di iOS).
- Tinggi baris badan minimal 1.5. Lebar baris teks panjang maksimal 70 karakter.
- Tabel angka memakai `font-variant-numeric: tabular-nums`.
- Pemuatan font: paket npm `@fontsource/ibm-plex-sans` dan `@fontsource/ibm-plex-mono` (lisensi OFL, tanpa JavaScript runtime). Impor hanya subset `latin` dan bobot yang tercantum di tabel (sans 400, 500, 600; mono 400, 500). `font-display: swap`. **[CLAIM]** Nama file CSS (`latin-400.css` dst.) dan keberadaan paket belum diperiksa. Agent memeriksanya di Fase 5 dengan `npm view` dan melihat isi paket sebelum menginstal. Kalau berbeda, STOP gate G2.
- Tumpukan fallback harus tetap terbaca baik kalau font gagal dimuat.

## 6. Komponen

Semua komponen punya state: default, hover, `:focus-visible`, active, disabled, dan jika relevan loading serta error.

### 6.1 Prinsip umum

- Target sentuh minimal 44×44 px di layar ≤ 768 px. Di semua ukuran minimal 24×24 px (WCAG 2.5.8).
- Fokus: `outline: var(--focus-ring); outline-offset: var(--focus-offset)`. Tidak boleh `outline: none` tanpa pengganti.
- Radius: kontrol `--radius-control`, kartu dan panel `--radius-card`, lencana `--radius-pill`.
- Ikon: komponen `Icon.jsx` berisi SVG inline (maksimal 12 ikon: check, alert, trash, plus, x, link, note, sun, moon, chevron, clock, refresh). Ukuran 16 atau 20 px, `stroke-width` 1.75, `currentColor`, `aria-hidden="true"`. Ikon selalu berpasangan dengan teks, kecuali tombol ikon yang punya `aria-label`.

### 6.2 Tombol

| Varian    | Latar             | Teks                     | Border                       | Dipakai untuk                |
| :-------- | :---------------- | :----------------------- | :--------------------------- | :--------------------------- |
| Primary   | `--color-btn-bg`  | `--color-btn-fg`         | tidak ada                    | satu aksi utama per area     |
| Secondary | `--color-surface` | `--color-text`           | 1px `--color-border-control` | aksi biasa                   |
| Ghost     | transparan        | `--color-text-secondary` | tidak ada                    | aksi tersier                 |
| Danger    | `--color-surface` | `--color-danger-fg`      | 1px `--color-danger-fg`      | hapus (di dialog konfirmasi) |

Saat `disabled` karena request berjalan, teks berubah ("Adding…") dan `aria-busy="true"`. Tombol tidak berubah lebar (cegah layout shift).

### 6.3 Input, select, textarea

Label selalu terlihat di atas kontrol dan terhubung dengan `for`/`id`. Placeholder bukan pengganti label. Border `--color-border-control`. Saat error: border `--color-danger-fg`, ikon alert, dan pesan di bawah kontrol yang terhubung lewat `aria-describedby`, serta `aria-invalid="true"`.

### 6.4 Lencana status dan bukti

Status task (teks selalu tampil, ikon pelengkap):

| Status        | Tampilan                                                                             |
| :------------ | :----------------------------------------------------------------------------------- |
| `todo`        | latar `--color-surface-sunken`, teks `--color-text-secondary`, ikon lingkaran kosong |
| `in-progress` | latar `--color-accent-subtle`, teks `--color-accent`, ikon jam                       |
| `done`        | latar `--color-btn-bg`, teks `--color-btn-fg`, ikon centang                          |
| `cancelled`   | latar `--color-surface-sunken`, teks `--color-text-muted`, teks dicoret, ikon x      |

Lencana bukti (hanya pada task `done`):

| Kondisi            | Tampilan                                                                                                                                |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `hasProof = true`  | latar `--color-proof-bg`, teks `--color-proof-fg`, ikon centang, teks "With proof · 2" (angka = `proofCount`, huruf monospace)          |
| `hasProof = false` | latar `--color-noproof-bg`, teks `--color-noproof-fg`, **border putus-putus** 1px `--color-noproof-fg`, ikon alert, teks "No proof yet" |

Task non-`done` dengan `proofCount > 0` menampilkan teks netral "2 proof" tanpa warna hijau. Hijau hanya muncul bila ada bukti dan task sudah selesai.

Penanda terlambat: teks "Overdue" dengan ikon jam, warna `--color-danger-fg`.

### 6.5 Kartu task

Isi: judul (`h3`), lencana status, lencana bukti, prioritas (teks), due date (monospace), project (jika ada). Seluruh kartu membuka panel detail lewat satu tombol "Open details for [judul]" (bukan seluruh kartu sebagai tombol). Select status cepat tetap ada di kartu.

### 6.6 Panel detail task

Elemen `dialog` bawaan HTML dengan `showModal()` (fokus terjebak dan Esc menutup tanpa library).

- Lebar ≤ 767 px: lembar penuh, maksimal tinggi `92dvh`, menempel di bawah.
- Lebar ≥ 768 px: panel kanan, lebar 440 px, tinggi penuh.
- Isi berurutan: judul dan form edit, lalu bagian "Proof" (daftar evidence, form tambah), lalu zona bahaya (hapus).
- Fokus awal ke judul dialog. Menutup mengembalikan fokus ke tombol pemicu.
- `aria-labelledby` menunjuk judul dialog.

### 6.7 Evidence

Item `url`: ikon tautan, label, hostname dalam monospace, tautan `target="_blank" rel="noopener noreferrer"`. Item `note`: ikon catatan, label, isi dalam blok `pre` monospace dengan `white-space: pre-wrap` dan batas tinggi 12 baris dengan scroll. Setiap item punya tombol "Remove proof: [label]". Form tambah: pilihan jenis (radio "Link" atau "Note"), label, lalu URL atau isi catatan. Validasi klien hanya memudahkan user. Validasi server tetap otoritatif.

### 6.8 Kartu statistik

Empat kartu: "Proof rate" (persen, `—` bila `null`), "Current streak" (minggu), "Completed with proof", "Completed without proof". Angka memakai huruf monospace ukuran `--text-2xl`. Di layar sempit: grid 2 kolom. Di 320 px: 1 kolom.

### 6.9 Grafik proof mingguan

Grafik batang tersusun 8 minggu, dibuat dari elemen HTML atau SVG inline tanpa library.

- Dua seri: "With proof" (`--color-proof-fg`, isi solid) dan "No proof" (`--color-noproof-fg`, **pola garis diagonal** agar berbeda tanpa warna).
- Sumbu: label minggu `DD MMM` (format lewat `Intl.DateTimeFormat`, tanpa library tanggal). Skala dimulai dari 0.
- Alternatif teks wajib: `figure` dengan `figcaption` yang merangkum ("8 weeks: 9 with proof, 3 without"), plus elemen `details` berjudul "Show data table" berisi `table` lengkap.
- State kosong: teks "No completed tasks yet. Finish a task and attach proof to start your streak."

### 6.10 State pesan

- **Loading:** skeleton dengan dimensi sama seperti konten akhir (cegah CLS). Animasi shimmer dimatikan pada `prefers-reduced-motion`.
- **Empty:** satu kalimat penjelas dan satu aksi.
- **Error:** pesan, `requestId` (monospace, bisa disalin), dan tombol Retry. Pakai `role="alert"` untuk error yang muncul setelah aksi user.
- **Offline:** banner persisten di atas halaman, `role="status"`, muncul saat `navigator.onLine === false`.
- **Toast:** tidak dipakai. Hasil aksi ditampilkan inline di dekat pemicunya (YAGNI).

### 6.11 Dialog konfirmasi hapus

Elemen `dialog`. Judul "Delete this task?". Isi menyebut bahwa evidence ikut terhapus dan tindakan tidak bisa dibatalkan. Tombol "Cancel" (fokus awal) dan "Delete task" (Danger).

## 7. Layout dan responsivitas

Mobile-first. Breakpoint (`min-width`): 480, 768, 1024, 1440. Dasar tampilan adalah 320 px.

| Lebar     | Layout                                                                           |
| :-------- | :------------------------------------------------------------------------------- |
| 320–479   | satu kolom. Statistik 1 kolom. Form task bertumpuk. Panel detail = lembar bawah. |
| 480–767   | satu kolom. Statistik 2 kolom.                                                   |
| 768–1023  | satu kolom lebar penuh. Panel detail = panel kanan 440 px. Statistik 4 kolom.    |
| 1024–1439 | dua kolom: utama `1fr`, sidebar `340px`.                                         |
| ≥ 1440    | wadah maksimal 1180 px di tengah.                                                |

Aturan:

- Tidak ada `width` tetap dalam piksel pada elemen konten (kecuali panel detail dan sidebar di atas).
- Gambar dan elemen media `max-width: 100%`. Teks panjang (URL bukti) memakai `overflow-wrap: anywhere`.
- Konten lebar (tabel data chart) di-scroll di dalam wadahnya sendiri (`overflow-x: auto`), bukan di `body`.
- Gunakan `min-width: 0` pada anak grid dan flex yang memuat teks panjang.

Wireframe desktop ≥ 1024:

```
┌─────────────────────────────────────────────────────────────┐
│ [skip link]                                                 │
│ Proof of Work OS            [Dark theme ◐]  [user] [Sign out]│
├──────────────────────────────────────────────┬──────────────┤
│ Proof rate | Streak | With proof | No proof   │              │
│ [ 8-week chart ......................... ]     │  Projects    │
├──────────────────────────────────────────────┤  (3 of 8)    │
│ Active work                                   │              │
│ [add task form]   [filters: status/proj/proof]│  Activity    │
│ ┌ task card ─ status ─ proof ─ due ─ [open] ┐ │  timeline    │
│ └───────────────────────────────────────────┘ │              │
└──────────────────────────────────────────────┴──────────────┘
```

Mobile 320: header, statistik, grafik, form, daftar task, project, aktivitas, dalam satu kolom berurutan.

## 8. Layar dan state yang harus ada

| Layar atau state               | Isi                                                             |
| :----------------------------- | :-------------------------------------------------------------- |
| Signed out                     | judul, satu kalimat nilai produk, form sign in dan sign up      |
| Configuration required         | daftar nama variabel `VITE_*` yang kosong. Tanpa panggilan API. |
| Dashboard                      | statistik, grafik, form dan daftar task, project, aktivitas     |
| Detail task                    | dialog (bagian 6.6)                                             |
| Konfirmasi hapus               | dialog (bagian 6.11)                                            |
| Loading, empty, error, offline | bagian 6.10, untuk setiap daftar dan panel                      |

## 9. Gerak

Satu gerakan masuk saja: kartu dashboard muncul dengan `opacity` dan `translateY(8px)`, durasi `--duration-base`, jeda bertingkat 40 ms antar kartu, hanya saat load pertama. Panel detail: transisi `transform` dan `opacity` dengan `--duration-base`. Hover dan fokus: transisi `--duration-fast`.

Di bawah `@media (prefers-reduced-motion: reduce)` semua animasi dan transisi dimatikan (`animation: none; transition: none`).

## 10. Copy UI (bahasa Inggris)

- Sentence case. Kalimat pendek. Tombol memakai kata kerja ("Add proof", "Remove proof", "Retry").
- **Dilarang** memakai kata "verified" atau "certified" di UI. Gunakan "With proof" dan "No proof yet".
- Pesan error memuat apa yang gagal dan apa yang bisa dilakukan. Contoh: "Couldn't save this proof. Check the link starts with http:// or https:// and try again."
- Tidak ada superlatif atau emoji di UI.

## 11. Checklist verifikasi (agent mengisi dengan bukti)

### 11.1 Tema (dari `design-token-system`)

- [ ] Setiap komponen dirender benar di **kedua** tema, diperiksa dengan benar-benar mengganti tema, bukan disimpulkan dari satu tema.
- [ ] Kontras per tema: tabel bagian 3 terpenuhi pada halaman nyata (sampel minimal: teks utama, lencana, tombol, link, border input).
- [ ] Tidak ada hex atau `rgba(` di luar `tokens.css`. Perintah: `git grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" -- "client/src" ":!client/src/styles/tokens.css"`. Hasil yang diharapkan: tidak ada baris.
- [ ] Tidak ada kilatan tema salah saat load dan refresh (rekam atau jelaskan metode pemeriksaan).
- [ ] Pilihan tema bertahan setelah reload.
- [ ] Blok `@media (prefers-color-scheme: dark)` identik dengan `[data-theme='dark']` (lampirkan `diff`).

### 11.2 Responsif (UX-01)

Pada lebar 320, 480, 768, 1024, 1440, 1920, di kedua tema, jalankan di konsol browser:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth;
```

Hasil yang diharapkan: `true` pada semua lebar. Lampirkan hasilnya, bukan ringkasan. Periksa juga zoom 200% pada 1280 px (WCAG 1.4.10 reflow).

### 11.3 Aksesibilitas (UX-03)

- [ ] Seluruh alur selesai hanya dengan keyboard: sign in, tambah task, buka detail, tambah dan hapus bukti, ubah status, hapus task, ganti tema.
- [ ] Urutan tab logis. Dialog menjebak fokus, Esc menutup, fokus kembali ke pemicu.
- [ ] Cincin fokus terlihat di semua kontrol, di kedua tema.
- [ ] Skip link menjadi elemen fokus pertama dan terlihat saat fokus.
- [ ] Landmark `header`, `main`, `aside` ada. Hanya satu `h1`. Urutan heading tidak melompat.
- [ ] Setiap input punya label terlihat. Error terhubung lewat `aria-describedby`.
- [ ] Tidak ada status yang hanya dibedakan oleh warna (periksa lencana, grafik, overdue).
- [ ] `role="alert"` untuk error pasca-aksi. `role="status"` untuk banner offline.
- [ ] Target sentuh ≥ 44 px di ≤ 768 px.
- [ ] `prefers-reduced-motion` mematikan animasi (uji dengan emulasi di devtools).
- [ ] Grafik punya ringkasan teks dan tabel data.

Catatan jujur: daftar ini bukan audit aksesibilitas penuh dan tidak menghasilkan klaim kepatuhan. Kalau agent tidak bisa menjalankan browser, semua kotak di bagian 11.2 dan 11.3 yang memerlukannya dilaporkan sebagai **NOT VERIFIED**.

## 12. Hal yang ditolak sejak awal

- Hitam murni (`#000`) atau putih murni (`#fff`) sebagai latar atau teks.
- Komponen dengan hex langsung.
- Gradien ungu di atas putih. Font Inter atau Arial sebagai identitas.
- Bayangan yang disalin tanpa perubahan ke dark mode.
- Hijau untuk selain "ada bukti". Merah untuk selain bahaya.
- Toggle tema yang memuat ulang halaman.
- Animasi dekoratif di layar operasional.
- Library UI, ikon, chart, atau tanggal baru.
- Mengubah struktur halaman yang sudah berjalan demi estetika.
