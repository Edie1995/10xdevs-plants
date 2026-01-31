import type { APIRoute } from "astro";

import type { Json } from "../../../db/database.types.ts";
import type { ApiResponseDto } from "../../../types.ts";

export const prerender = false;

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

export const POST: APIRoute = async ({ locals }) => {
  const { error } = await locals.supabase.auth.signOut();

  if (error) {
    return errorResponse(400, "logout_failed", "Nie udalo sie wylogowac.", { db_code: error.code });
  }

  return jsonResponse(200, {
    success: true,
    data: null,
    error: null,
    message: "Wylogowano.",
  });
};
