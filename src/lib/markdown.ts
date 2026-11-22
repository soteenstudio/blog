import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Markdown -> HTML yang sudah disanitasi. Artikel memang hanya ditulis admin,
 * tetapi tetap disanitasi supaya satu akun yang bocor tidak bisa menyisipkan skrip.
 */
export function renderMarkdown(source: string): string {
  const raw = marked.parse(source, { async: false, gfm: true }) as string;

  return sanitizeHtml(raw, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "h1", "h2", "img"],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "title"],
      code: ["class"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" },
      }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
    },
  });
}
