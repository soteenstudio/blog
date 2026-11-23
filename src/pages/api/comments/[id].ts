import type { APIRoute } from "astro";
import { deleteComment } from "@/lib/comments";
import { limits } from "@/data/site";
import { json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const DELETE: APIRoute = async ({ params, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);
  if (!rateLimit(`comment-delete:${user.id}`, limits.commentDeletePerMinute.max, limits.commentDeletePerMinute.windowMs)) {
    return json({ error: copy.errors.tooManyRequests }, 429);
  }

  const result = await deleteComment(params.id ?? "", user);
  if (result === "not-found") return json({ error: copy.errors.commentNotFound }, 404);
  if (result === "forbidden") return json({ error: copy.errors.forbidden }, 403);
  return json({ ok: true });
};
