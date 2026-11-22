# SoTeen Studio Blog

Blog satu halaman (daftar artikel) SoTeen Studio, terpisah dari web utama (Next.js) tetapi memakai token desain,
font, dan komponen visual yang sama. Dibangun dengan **Astro** (SSR) dan **Turso** (libSQL)
untuk artikel, komentar, suka, dan akun login.

## Menjalankan secara lokal

```bash
pnpm install            # atau npm install
cp .env.example .env    # bawaannya memakai file SQLite lokal (local.db)
pnpm db:migrate         # membuat tabel
pnpm dev                # http://localhost:4321
```

Butuh Node.js 20.6 atau lebih baru.

## Memakai Turso

```bash
turso db create soteen-blog
turso db show soteen-blog --url          # -> TURSO_DATABASE_URL
turso db tokens create soteen-blog       # -> TURSO_AUTH_TOKEN
```

Isi nilai itu di `.env` (atau environment variable di hosting), lalu jalankan `pnpm db:migrate`.

## Halaman khusus untuk menulis dan mengatur izin

Tidak ada artikel bawaan (hardcoded): setiap artikel dibuat manual lewat halaman khusus.

| Halaman | Siapa yang boleh | Fungsi |
| --- | --- | --- |
| `/dashboard/posts/new` | admin dan akun berizin | menulis artikel baru (Markdown) |
| `/dashboard` | admin dan akun berizin | daftar artikel; penulis hanya melihat miliknya, admin melihat semua |
| `/dashboard/posts/<id>` | pemilik artikel dan admin | mengubah, menerbitkan, menghapus |
| `/dashboard/users` | hanya admin | memberi atau mencabut izin menulis akun lain |
| `/profile` | semua akun | foto, profesi, dan daftar pengikut |
| `/u/<id>` | publik | profil publik dan tombol Ikuti |

**Menentukan admin.** Isi `ADMIN_EMAILS` di `.env` (email dipisah koma). Akun yang emailnya ada di daftar
otomatis menjadi admin begitu mendaftar atau masuk:

```
ADMIN_EMAILS=kamu@contoh.com,rekan@contoh.com
```

Karena belum ada verifikasi email, daftarkan akun admin segera setelah deploy dan jangan
mempublikasikan email admin. Alternatifnya, `pnpm db:make-admin email@anda.com` menjadikan akun yang
sudah ada sebagai admin permanen di database.

Mencabut izin berlaku seketika; artikel lama penulis itu tetap tersimpan dan tetap dikelola admin.
Bila database dibuat sebelum fitur izin ada, jalankan `pnpm db:migrate` lagi (kolom `users.can_post`
ditambahkan otomatis tanpa menghapus data).

## Fitur pembaca dan penulis

- **Terjemahan artikel:** di form menulis, pilih bahasa utama lalu isi bagian *Terjemahan (opsional)*.
  Pembaca otomatis melihat versi sesuai bahasa yang dipilih; bila terjemahan belum ada, teks utama
  tampil dengan catatan. Kategori adalah satu nilai untuk semua bahasa.
- **Pratinjau Markdown:** tab *Tulis/Pratinjau* di setiap kolom isi. HTML dirender dan disanitasi di
  server (`/api/preview`, hanya untuk akun berizin menulis).
- **Profil:** `/profile` untuk mengubah foto (dipangkas jadi persegi 256 px di browser lalu disimpan di
  database Turso, tampil lewat `/avatar/<id>`), profesi di studio, dan melihat daftar pengikut.
  Profil publik di `/u/<id>` memiliki tombol Ikuti.
- **Progres membaca** di tepi atas halaman artikel, dan tombol **Bagikan** (WhatsApp, X, Facebook,
  LinkedIn, Telegram, email, salin tautan, serta menu bagikan bawaan perangkat bila tersedia).

Jalankan `pnpm db:migrate` setelah memperbarui: kolom baru (profil, terjemahan) dan tabel `follows`
ditambahkan tanpa menghapus data.

## Bahasa

Tombol bahasa di navbar (ID/EN) menyimpan pilihan di cookie `lang`. Teks antarmuka ada di
`src/data/copy/id.ts` dan `src/data/copy/en.ts` (kunci harus sama; TypeScript akan memberi tahu bila
ada yang kurang). Isi artikel tidak diterjemahkan otomatis; penulis mengisi terjemahannya sendiri (lihat di atas).

## Struktur

```
src/
  data/site.ts        identitas studio, navigasi, tautan sosial & legal
  data/copy/          teks antarmuka per bahasa (id.ts, en.ts, index.ts)
  styles/global.css   token warna & animasi (sama dengan web utama) + gaya isi artikel
  layouts/            BaseLayout (tema gelap/terang, animasi scroll)
  components/         Navbar, Footer, PostCard, Comments, LikeButton, PostForm, ...
  lib/                db, auth, posts, comments, likes, markdown, validasi, rate limit
  pages/              /, /posts/[slug], /login, /register, /dashboard/*, /api/*
scripts/              migrate, make-admin
```

## Menyamakan dengan web utama

- Warna, radius, dan font ada di `src/styles/global.css` dan `tailwind.config.mjs`. Bila `--brand`
  di web utama berubah, ubah juga di sini.
  seperti di web utama.
- Pilihan tema tersimpan di `localStorage`, jadi tidak otomatis terbawa antar domain/subdomain.

## Keamanan yang sudah ditangani

- Kata sandi di-hash dengan scrypt (salt per pengguna); sesi berupa token acak, hanya hash-nya yang disimpan.
- Cookie sesi `HttpOnly`, `SameSite=Lax`, dan `Secure` di produksi; Astro memeriksa origin untuk form POST.
- Komentar selalu ditampilkan sebagai teks (tidak pernah HTML); isi artikel disanitasi setelah Markdown dirender.
- Pembatas laju untuk login, pendaftaran, komentar, dan suka. Ini disimpan di memori proses,
  jadi bila nanti berjalan di banyak instance/serverless, pindahkan ke penyimpanan bersama.
- Parameter `?next=` hanya menerima path internal.

## Deploy

Memakai adapter `@astrojs/node` (`pnpm build && pnpm start`), cocok untuk VPS atau Docker. Untuk Vercel,
Netlify, atau Cloudflare, ganti adapter di `astro.config.mjs` dengan adapter platform tersebut.
Atur variabel `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_EMAILS`, dan `SITE_URL`.
Bila berada di belakang reverse proxy, pastikan IP klien diteruskan agar pembatas laju akurat.
