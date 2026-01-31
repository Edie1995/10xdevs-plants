import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../db/database.types.ts";
import { getDashboard } from "../../lib/services/dashboard.service.ts";
import type { ApiResponseDto } from "../../types.ts";

export const prerender = false;

const dashboardQuerySchema = z.object({
  page: z.preprocess(
    (value) => (value === undefined ? undefined : Number.parseInt(String(value), 10)),
    z.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (value) => (value === undefined ? undefined : Number.parseInt(String(value), 10)),
    z.number().int().min(1).max(20).default(20)
  ),
  search: z.string().trim().max(50).optional(),
  sort: z.enum(["priority", "name", "created"]).optional().default("priority"),
  direction: z.enum(["asc", "desc"]).optional().default("asc"),
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

interface SupabaseErrorMapping {
  status: number;
  code: string;
  message: string;
  details?: Json;
}

const mapSupabaseError = (error: unknown): SupabaseErrorMapping => {
  const supabaseError = error as {
    code?: string;
    message?: string;
    status?: number;
    hint?: string;
  };

  if (supabaseError?.status === 401) {
    return {
      status: 401,
      code: "unauthorized",
      message: "Authentication required.",
      details: { db_code: supabaseError?.code },
    };
  }

  if (supabaseError?.status === 403 || supabaseError?.code === "42501") {
    return {
      status: 401,
      code: "unauthorized",
      message: "Authentication required.",
      details: { db_code: supabaseError?.code },
    };
  }

  if (supabaseError?.status === 400) {
    return {
      status: 400,
      code: "bad_request",
      message: supabaseError?.message ?? "Invalid request.",
      details: { db_code: supabaseError?.code, hint: supabaseError?.hint },
    };
  }

  return {
    status: 500,
    code: "server_error",
    message: "Unexpected server error.",
    details: { db_code: supabaseError?.code },
  };
};

/**
 * GET /api/dashboard - returns aggregated dashboard data for the current user.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = dashboardQuerySchema.safeParse(queryParams);

  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Invalid query parameters.", parsed.error.flatten() as Json);
  }

  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  try {
    const { dashboard, pagination } = await getDashboard(locals.supabase, userId, parsed.data);
    return jsonResponse(200, {
      success: true,
      data: dashboard,
      error: null,
      pagination,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load dashboard.", {
      error,
      route: "/api/dashboard",
      user_id: userId,
      query: parsed.data,
    });
    const mapped = mapSupabaseError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};
