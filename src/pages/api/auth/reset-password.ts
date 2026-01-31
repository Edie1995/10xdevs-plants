import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../db/database.types.ts";
import type { ApiResponseDto } from "../../../types.ts";

export const prerender = false;

const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasla musza byc takie same.",
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

export const POST: APIRoute = async ({ request, locals }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Invalid JSON payload.");
  }

  const parsed = resetPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Popraw bledy w formularzu.", parsed.error.flatten() as Json);
  }

  const { password } = parsed.data;
  const { error } = await locals.supabase.auth.updateUser({ password });

  if (error) {
    if (error.status === 401) {
      return errorResponse(401, "unauthorized", "Sesja wygasla. Wyslij link ponownie.");
    }

    return errorResponse(500, "server_error", "Cos poszlo nie tak. Sprobuj ponownie.");
  }

  return jsonResponse(200, {
    success: true,
    data: null,
    error: null,
    message: "Haslo zostalo zaktualizowane.",
  });
};
