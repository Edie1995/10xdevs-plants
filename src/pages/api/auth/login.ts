import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../db/database.types.ts";
import type { ApiResponseDto, UserProfileDto } from "../../../types.ts";

export const prerender = false;

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
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

const mapLoginError = (error: { status?: number; code?: string; message?: string }) => {
  if (error.message?.toLowerCase().includes("email not confirmed")) {
    return {
      status: 401,
      code: "email_not_confirmed",
      message: "Potwierdz adres e-mail, aby sie zalogowac.",
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

  if (error.status === 400 || error.status === 401) {
    return {
      status: 401,
      code: "invalid_credentials",
      message: "Nieprawidlowy e-mail lub haslo.",
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

export const POST: APIRoute = async ({ request, locals }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Invalid JSON payload.");
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Popraw bledy w formularzu.", parsed.error.flatten() as Json);
  }

  const { email, password } = parsed.data;

  const { data, error } = await locals.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const mapped = mapLoginError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }

  if (!data.user) {
    return errorResponse(401, "invalid_credentials", "Nieprawidlowy e-mail lub haslo.");
  }

  const user: UserProfileDto = {
    id: data.user.id,
    email: data.user.email ?? "",
    created_at: data.user.created_at,
    user_metadata: data.user.user_metadata ?? {},
  };

  return jsonResponse(200, {
    success: true,
    data: { user },
    error: null,
  });
};
