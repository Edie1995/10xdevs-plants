import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../db/database.types.ts";
import type { ApiResponseDto, UserProfileDto } from "../../../types.ts";

export const prerender = false;

const registerSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    redirectTo: z.string().optional(),
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

const mapRegisterError = (error: { status?: number; code?: string; message?: string }) => {
  if (error.status === 409) {
    return {
      status: 409,
      code: "email_already_in_use",
      message: "Konto z tym e-mailem juz istnieje.",
      details: { db_code: error.code },
    };
  }

  if (error.status === 429) {
    return {
      status: 429,
      code: "rate_limited",
      message: "Zbyt wiele prob. Sprobuj ponownie za chwile.",
      details: { db_code: error.code },
    };
  }

  if (error.status === 400) {
    return {
      status: 400,
      code: "bad_request",
      message: error.message ?? "Nieprawidlowe dane.",
      details: { db_code: error.code },
    };
  }

  return {
    status: 500,
    code: "server_error",
    message: "Cos poszlo nie tak. Sprobuj ponownie.",
    details: { db_code: error.code },
  };
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Invalid JSON payload.");
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Popraw bledy w formularzu.", parsed.error.flatten() as Json);
  }

  const { email, password } = parsed.data;

  const { data, error } = await locals.supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${url.origin}/auth/callback`,
    },
  });

  if (error) {
    const mapped = mapRegisterError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }

  if (!data.user) {
    return errorResponse(500, "server_error", "Cos poszlo nie tak. Sprobuj ponownie.");
  }

  if (data.session) {
    await locals.supabase.auth.signOut();
  }

  const user: UserProfileDto = {
    id: data.user.id,
    email: data.user.email ?? "",
    created_at: data.user.created_at,
    user_metadata: data.user.user_metadata ?? {},
  };

  return jsonResponse(200, {
    success: true,
    data: { user, session_active: false },
    error: null,
  });
};
