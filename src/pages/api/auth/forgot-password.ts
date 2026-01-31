import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../db/database.types.ts";
import type { ApiResponseDto } from "../../../types.ts";

export const prerender = false;

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

const jsonResponse = <T>(status: number, payload: ApiResponseDto<T>): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const errorResponse = (status: number, code: string, message: string, details?: Json): Response =>
  jsonResponse(status, {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
  });

export const POST: APIRoute = async ({ request, locals, url }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Invalid JSON payload.");
  }

  const parsed = forgotPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Popraw bledy w formularzu.", parsed.error.flatten() as Json);
  }

  const { email } = parsed.data;
  const redirectTo = `${url.origin}/auth/callback?next=/auth/reset-password`;

  const { error } = await locals.supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    // eslint-disable-next-line no-console
    console.warn("Failed to request password reset.", { error });
  }

  return jsonResponse(200, {
    success: true,
    data: null,
    error: null,
    message: "Jesli konto istnieje, wyslalismy instrukcje resetu hasla.",
  });
};
