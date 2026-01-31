import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/");

const isAssetPath = (pathname: string) => pathname.startsWith("/_astro/") || pathname.startsWith("/favicon");

export const onRequest = defineMiddleware(async ({ locals, cookies, request, url, redirect }, next) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  locals.supabase = supabase;

  const { data } = await supabase.auth.getUser();
  if (data?.user) {
    locals.user = {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  }

  if (isAssetPath(url.pathname)) {
    return next();
  }

  if (!locals.user && !isPublicPath(url.pathname)) {
    return redirect("/?toast=auth-required");
  }

  return next();
});
