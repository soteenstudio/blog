import type { APIRoute } from "astro";
import { json } from "@/lib/http";
import { renderMarkdown } from "@/lib/markdown";
import { rateLimit } from "@/lib/rate-limit";

const MAX_LENGTH = 200_000;

/** Pratinjau Markdown untuk editor: hanya admin dan akun berizin menulis. */
export const POST: APIRoute = async ({ request, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);
  if (!user.canPost) return json({ error: copy.errors.forbidden }, 403);
  if (!rateLimit(`preview:${user.id}`, 60, 60_000)) return json({ error: copy.errors.tooManyRequests }, 429);

  const payload = await request.json().catch(() => null);
  const markdown = typeof payload?.markdown === "string" ? payload.markdown : null;
  if (markdown === null) return json({ error: copy.errors.invalidRequest }, 400);
  if (markdown.length > MAX_LENGTH) return json({ error: copy.errors.previewTooLong }, 413);

  return json({ html: renderMarkdown(markdown) });
};
