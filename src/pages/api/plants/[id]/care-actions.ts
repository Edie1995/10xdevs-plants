import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../../db/database.types.ts";
import {
  createCareAction,
  DomainValidationError,
  listCareActions,
  ResourceNotFoundError,
} from "../../../../lib/services/care-actions.service.ts";
import type { ApiResponseDto } from "../../../../types.ts";
import { parseDateOnlyToUtc, toUtcDateOnly } from "../../../../lib/services/care-schedule.utils.ts";

export const prerender = false;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const querySchema = z.object({
  action_type: z.enum(["watering", "fertilizing"]).optional(),
  limit: z.preprocess(
    (value) => (value === undefined ? undefined : Number.parseInt(String(value), 10)),
    z.number().int().min(1).max(200).default(50)
  ),
});

const bodySchema = z.object({
  action_type: z.enum(["watering", "fertilizing"]),
  performed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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
      status: 403,
      code: "forbidden",
      message: "You do not have access to this resource.",
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

export const GET: APIRoute = async ({ params, url, locals }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "validation_error", "Invalid path parameters.", parsedParams.error.flatten() as Json);
  }

  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsedQuery = querySchema.safeParse(queryParams);

  if (!parsedQuery.success) {
    return errorResponse(400, "validation_error", "Invalid query parameters.", parsedQuery.error.flatten() as Json);
  }

  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  try {
    const data = await listCareActions(locals.supabase, userId, parsedParams.data.id, parsedQuery.data);
    return jsonResponse(200, {
      success: true,
      data,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, error.code, error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to list care actions.", error);
    const mapped = mapSupabaseError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "validation_error", "Invalid path parameters.", parsedParams.error.flatten() as Json);
  }

  const requestId = request.headers.get("x-request-id") ?? undefined;
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch (error) {
    return errorResponse(400, "invalid_body", "Invalid request body.", {
      message: error instanceof Error ? error.message : "Failed to parse JSON body.",
    });
  }

  const parsedBody = bodySchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return errorResponse(400, "validation_error", "Invalid request body.", parsedBody.error.flatten() as Json);
  }

  if (parsedBody.data.performed_at) {
    const performedAtDate = parseDateOnlyToUtc(parsedBody.data.performed_at);

    if (!performedAtDate) {
      return errorResponse(400, "validation_error", "Invalid performed_at date.", {
        performed_at: parsedBody.data.performed_at,
      });
    }

    const today = toUtcDateOnly(new Date());
    const performedAtUtc = toUtcDateOnly(performedAtDate);

    if (performedAtUtc.getTime() > today.getTime()) {
      return errorResponse(400, "performed_at_in_future", "performed_at cannot be in the future.", {
        performed_at: parsedBody.data.performed_at,
        today: today.toISOString().slice(0, 10),
      });
    }
  }

  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  try {
    const data = await createCareAction(locals.supabase, userId, parsedParams.data.id, parsedBody.data);
    return jsonResponse(201, {
      success: true,
      data,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, error.code, error.message);
    }

    if (error instanceof DomainValidationError) {
      return errorResponse(400, error.code, error.message, error.details);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to create care action.", {
      route: "/api/plants/:id/care-actions",
      plant_id: parsedParams.data.id,
      request_id: requestId,
      error,
    });
    const mapped = mapSupabaseError(error);

    if (mapped.status === 403) {
      return errorResponse(404, "not_found", "Plant not found.");
    }

    if (mapped.status === 401) {
      return errorResponse(401, "unauthorized", "Authentication required.");
    }

    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};
