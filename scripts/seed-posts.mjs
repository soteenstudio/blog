/** Artikel contoh (dummy). Ganti atau hapus sesuai kebutuhan; tulis artikel asli lewat /admin. */
export const seedPosts = [
  {
    slug: "kenapa-kami-membuat-blog-ini",
    title: "Kenapa kami membuat blog ini",
    category: "Studio",
    excerpt: "Tempat kami mencatat proses, keputusan teknis, dan eksperimen, termasuk yang gagal.",
    content: `Studio kecil biasanya menyimpan pelajaran terbaiknya di kepala orang-orang di dalamnya. Blog ini cara kami memindahkannya ke tempat yang bisa dibaca siapa saja.

## Apa yang akan ditulis

- Catatan pengembangan game dan keputusan desain di baliknya
- Perkakas open-source yang kami rilis dan alasan kami membuatnya
- Eksperimen teknis, lengkap dengan hasil yang tidak sesuai harapan

## Cara kerja blog ini

Artikel ditulis tim studio. Siapa pun boleh membuat akun untuk memberi suka dan berkomentar. Kami membaca semua komentar.

> Eksperimen yang gagal tetap menghasilkan sesuatu: catatan tentang apa yang tidak perlu dicoba lagi.

Selamat membaca.`,
  },
  {
    slug: "memulai-eksperimen-tanpa-tujuan-yang-kaku",
    title: "Memulai eksperimen tanpa tujuan yang kaku",
    category: "Eksperimen",
    excerpt: "Kenapa kami memberi ruang bagi ide setengah jadi sebelum memutuskan apakah layak dirilis.",
    content: `Banyak ide bagus mati karena dipaksa punya target sebelum sempat dicoba. Kami memilih urutan sebaliknya.

## Tiga aturan kecil

1. Satu eksperimen, satu pertanyaan yang ingin dijawab.
2. Batas waktu pendek, biasanya satu sampai dua minggu.
3. Di akhir, tulis hasilnya, apa pun hasilnya.

## Setelah eksperimen selesai

Sebagian kecil eksperimen layak dilanjutkan menjadi proyek. Sisanya kami arsipkan beserta catatannya, supaya tidak diulang dua kali.`,
  },
  {
    slug: "menjaga-kode-open-source-tetap-terawat",
    title: "Menjaga kode open-source tetap terawat",
    category: "Open Source",
    excerpt: "Pelajaran dari merawat perkakas terbuka dengan tim kecil: dokumentasi, rilis, dan batasan.",
    content: `Merilis kode itu mudah. Merawatnya yang butuh disiplin.

## Dokumentasi dulu

Fitur tanpa dokumentasi hampir sama dengan fitur yang tidak ada. Kami menulis contoh pemakaian sebelum menggabungkan perubahan.

## Rilis yang membosankan

Rilis yang baik itu membosankan: nomor versi jelas, catatan perubahan lengkap, dan tidak ada kejutan.

\`\`\`bash
git tag v1.2.0
git push origin v1.2.0
\`\`\`

## Berani bilang tidak

Tidak semua permintaan fitur cocok. Menolak dengan sopan dan jelas lebih baik daripada membiarkan menggantung.`,
  },
  {
    slug: "catatan-desain-sistem-di-game-kecil",
    title: "Catatan desain sistem di game kecil",
    category: "Game",
    excerpt: "Bagaimana kami memilih sistem yang sederhana tetapi memberi ruang bagi pemain untuk berkreasi.",
    content: `Game kecil punya keuntungan: setiap sistem bisa dipahami seluruh tim. Kami berusaha menjaganya begitu.

## Mulai dari loop inti

Sebelum menambah fitur, pastikan loop utamanya menyenangkan selama lima menit pertama.

## Fitur yang kami potong

| Fitur | Alasan dipotong |
| --- | --- |
| Inventaris kompleks | Menambah beban tanpa menambah keseruan |
| Level karakter | Mengaburkan keterampilan pemain |

Memotong fitur adalah bagian dari mendesain.`,
  },
];
