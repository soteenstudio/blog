import type { Copy } from "@/data/copy/index";
import type { PostInput, PostStatus } from "./posts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export function parseRegisterForm(form: FormData, copy: Copy) {
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";

  let error: string | null = null;
  if (!name || name.length > 60) error = copy.errors.nameRequired;
  else if (!EMAIL_RE.test(email) || email.length > 254) error = copy.errors.emailInvalid;
  else if (password.length < 8) error = copy.errors.passwordShort;
  else if (password.length > 128) error = copy.errors.passwordLong;

  return { values: { name, email, password }, error };
}

export function parseLoginForm(form: FormData) {
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  return { email, password };
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
    category: text(form, "category"),
    content: typeof form.get("content") === "string" ? (form.get("content") as string).trim() : "",
    status,
  };

  let error: string | null = null;
  if (!values.title || values.title.length > 160) error = copy.errors.titleRequired;
  else if (!values.category || values.category.length > 40) error = copy.errors.categoryInvalid;
  else if (values.excerpt.length > 240) error = copy.errors.excerptTooLong;
  else if (values.slug && !SLUG_RE.test(values.slug)) error = copy.errors.slugInvalid;
  else if (!values.content) error = copy.errors.contentRequired;
  else if (values.altExcerpt.length > 240) error = copy.errors.excerptTooLong;
  else if (!!values.altTitle !== !!values.altContent || (values.altExcerpt && !values.altTitle)) {
    error = copy.errors.altIncomplete;
  } else if (values.altTitle.length > 160) error = copy.errors.titleRequired;

  return { values, error };
}
