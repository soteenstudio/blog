import type { APIRoute } from "astro";
import { deleteComment } from "@/lib/comments";
import { json } from "@/lib/http";

export const DELETE: APIRoute = async ({ params, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);

  const result = await deleteComment(params.id ?? "", user);
  if (result === "not-found") return json({ error: copy.errors.commentNotFound }, 404);
  if (result === "forbidden") return json({ error: copy.errors.forbidden }, 403);
  return json({ ok: true });
};
