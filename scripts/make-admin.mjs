import { createClient } from "@libsql/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Pemakaian: pnpm db:make-admin email@contoh.com");
  process.exit(1);
}

const db = createClient({
  url: process.env.ST_BLOG_DB_TURSO_DATABASE_URL,
  authToken: process.env.ST_BLOG_DB_TURSO_AUTH_TOKEN || undefined,
});

const result = await db.execute({ sql: "UPDATE users SET role = 'admin' WHERE email = ?", args: [email] });
if (result.rowsAffected === 0) {
  console.error(`Tidak ada akun dengan email ${email}. Daftar lewat /register dulu, lalu jalankan perintah ini lagi.`);
  process.exit(1);
}
console.log(`${email} sekarang adalah admin.`);
