import type { APIRoute } from "astro";
import { json } from "@/lib/http";
import { toggleFollow, userExists } from "@/lib/follows";
import { rateLimit } from "@/lib/rate-limit";

export const POST: APIRoute = async ({ request, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);
  if (!rateLimit(`follow:${user.id}`, 30, 60_000)) return json({ error: copy.errors.tooManyRequests }, 429);

  const body = await request.json().catch(() => null);
  const targetId = typeof body?.userId === "string" ? body.userId : "";
  if (!targetId) return json({ error: copy.errors.invalidRequest }, 400);
  if (targetId === user.id) return json({ error: copy.errors.cannotFollowSelf }, 400);
  if (!(await userExists(targetId))) return json({ error: copy.errors.userNotFound }, 404);

  return json(await toggleFollow(user.id, targetId));
};
