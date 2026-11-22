import type { APIRoute } from "astro";
import { parseAvatarDataUrl } from "@/lib/avatar";
import { json } from "@/lib/http";
import { clearAvatar, setAvatar } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";

export const POST: APIRoute = async ({ request, locals }) => {
  const copy = locals.copy;
  const user = locals.user;
  if (!user) return json({ error: copy.errors.loginRequired }, 401);
  if (!rateLimit(`avatar:${user.id}`, 10, 60_000)) return json({ error: copy.errors.tooManyRequests }, 429);

  const body = await request.json().catch(() => null);
  const parsed = parseAvatarDataUrl(body?.image);
  if (parsed === "too-large") return json({ error: copy.errors.imageTooLarge }, 413);
  if (parsed === "invalid") return json({ error: copy.errors.imageInvalid }, 400);

  await setAvatar(user.id, parsed);
  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return json({ error: locals.copy.errors.loginRequired }, 401);
  await clearAvatar(user.id);
  return json({ ok: true });
};
