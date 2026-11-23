import type { Copy } from "@/data/copy/index";
import { resolveCategoryId } from "./categories";
import { checkEmail } from "./email-rules";
import { validateEmail } from "./email-check";
import { MAX_LENGTH, MIN_LENGTH, MIN_SCORE, evaluatePassword } from "./password-strength";
import type { PostInput, PostStatus } from "./posts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

/** Nama tampilan: tanpa karakter kontrol/format tak terlihat, dan tanpa tautan atau alamat email. */
const NAME_FORBIDDEN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff<>]|https?:|www\.|@|\.(?:com|net|org|id|io|ru|xyz)\b/i;

export function parseRegisterForm(form: FormData, copy: Copy) {
  const name = text(form, "name").normalize("NFKC").replace(/\s+/g, " ");
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";

  let error: string | null = null;
  const emailCheck = validateEmail(email);

  if (!name || name.length > 60) error = copy.errors.nameRequired;
  else if (NAME_FORBIDDEN.test(name)) error = copy.errors.nameInvalid;
  else if (!emailCheck.ok) {
    error =
      emailCheck.problem === "blocked"
        ? copy.errors.emailBlocked
        : emailCheck.problem === "typo"
          ? copy.errors.emailTypo(emailCheck.suggestion ?? "")
          : copy.errors.emailInvalid;
  } else if (password.length < MIN_LENGTH) error = copy.errors.passwordShort;
  else if (password.length > MAX_LENGTH) error = copy.errors.passwordLong;
  else if (evaluatePassword(password, { name, email }).score < MIN_SCORE) error = copy.errors.passwordWeak;

  // Email yang dipakai untuk menyimpan: sudah dinormalisasi (NFKC, huruf kecil).
  return { values: { name, email: emailCheck.ok ? emailCheck.email : email, password }, error };
}

/**
 * Login hanya memeriksa bentuk email. Daftar blokir domain sengaja tidak dipakai di sini supaya akun
 * lama tidak terkunci bila daftar diperbarui.
 */
export function parseLoginForm(form: FormData) {
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  // Bentuk yang benar tetap lolos di sini walau domainnya ada di daftar blokir.
  const check = checkEmail(email, []);
  const formatOk = check.ok || check.problem !== "invalid";
  return { email, password, formatOk: formatOk && password.length > 0 && password.length <= MAX_LENGTH };
}

export function parsePostForm(form: FormData, copy: Copy): { values: PostInput; error: string | null } {
  const status: PostStatus = text(form, "status") === "published" ? "published" : "draft";
  const values: PostInput = {
    lang: text(form, "lang") === "en" ? "en" : "id",
    altTitle: text(form, "alt_title"),
    altExcerpt: text(form, "alt_excerpt"),
    altContent: typeof form.get("alt_content") === "string" ? (form.get("alt_content") as string).trim() : "",
    title: text(form, "title"),
    slug: text(form, "slug").toLowerCase(),
    excerpt: text(form, "excerpt"),
    // Hanya id dari daftar kategori yang diterima (label bahasa apa pun dan tulisan lama dikenali).
    category: resolveCategoryId(text(form, "category")) ?? "",
    content: typeof form.get("content") === "string" ? (form.get("content") as string).trim() : "",
    status,
  };

  let error: string | null = null;
  if (!values.title || values.title.length > 160) error = copy.errors.titleRequired;
  else if (!values.category) error = copy.errors.categoryInvalid;
  else if (values.excerpt.length > 240) error = copy.errors.excerptTooLong;
  else if (values.slug && !SLUG_RE.test(values.slug)) error = copy.errors.slugInvalid;
  else if (!values.content) error = copy.errors.contentRequired;
  else if (values.altExcerpt.length > 240) error = copy.errors.excerptTooLong;
  else if (!!values.altTitle !== !!values.altContent || (values.altExcerpt && !values.altTitle)) {
    error = copy.errors.altIncomplete;
  } else if (values.altTitle.length > 160) error = copy.errors.titleRequired;

  return { values, error };
}
