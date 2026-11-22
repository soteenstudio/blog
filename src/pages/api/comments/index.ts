import type { APIRoute } from "astro";
import { siteConfig } from "@/data/site";
import { addComment } from "@/lib/comments";
import { json } from "@/lib/http";
import { publishedPostExists } from "@/lib/posts";
import { rateLimit } from "@/lib/rate-limit";

export const POST: APIRoute = async ({ request, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);
  if (!rateLimit(`comment:${user.id}`, 8, 60_000)) return json({ error: copy.errors.tooManyRequests }, 429);

  const payload = await request.json().catch(() => null);
  const postId = typeof payload?.postId === "string" ? payload.postId : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!postId) return json({ error: copy.errors.invalidRequest }, 400);
  if (!body) return json({ error: copy.errors.commentEmpty }, 400);
  if (body.length > siteConfig.commentMaxLength) {
    return json({ error: copy.errors.commentTooLong(siteConfig.commentMaxLength) }, 400);
  }
  if (!(await publishedPostExists(postId))) return json({ error: copy.errors.postNotFound }, 404);

  const comment = await addComment(postId, user, body);
  return json({ comment }, 201);
};
