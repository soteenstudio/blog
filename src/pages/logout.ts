import type { APIRoute } from "astro";
import { destroySession } from "@/lib/auth";

export const POST: APIRoute = async ({ cookies, redirect, locals }) => {
  await destroySession(cookies);
  return redirect(locals.href("/"), 303);
};
