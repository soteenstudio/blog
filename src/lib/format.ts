import { intlLocale, type Locale } from "@/data/copy/index";

const TIME_ZONE = "Asia/Makassar";
const dateFormatters = new Map<Locale, Intl.DateTimeFormat>();
const dateTimeFormatters = new Map<Locale, Intl.DateTimeFormat>();

function dateFormatter(locale: Locale) {
  let f = dateFormatters.get(locale);
  if (!f) dateFormatters.set(locale, (f = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: TIME_ZONE })));
  return f;
}

function dateTimeFormatter(locale: Locale) {
  let f = dateTimeFormatters.get(locale);
  if (!f)
    dateTimeFormatters.set(
      locale,
      (f = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE })),
    );
  return f;
}

export const formatDate = (iso: string | null | undefined, locale: Locale = "id") =>
  iso ? dateFormatter(locale).format(new Date(iso)) : "";

export const formatDateTime = (iso: string, locale: Locale = "id") => dateTimeFormatter(locale).format(new Date(iso));

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
