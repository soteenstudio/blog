import type { APIRoute } from "astro";
import { json } from "@/lib/http";
import { toggleLike } from "@/lib/likes";
import { publishedPostExists } from "@/lib/posts";
import { rateLimit } from "@/lib/rate-limit";

export const POST: APIRoute = async ({ request, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);
  if (!rateLimit(`like:${user.id}`, 40, 60_000)) return json({ error: copy.errors.tooManyRequests }, 429);

  const body = await request.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId : "";
  if (!postId) return json({ error: copy.errors.invalidRequest }, 400);
  if (!(await publishedPostExists(postId))) return json({ error: copy.errors.postNotFound }, 404);

  return json(await toggleLike(postId, user.id));
};
