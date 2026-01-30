import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../../db/database.types.ts";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client.ts";
import {
  getPlantSchedules,
  ResourceNotFoundError,
  ScheduleIntegrityError,
  updatePlantSchedules,
} from "../../../../lib/services/plant-card.service.ts";
import type { ApiResponseDto, SeasonalScheduleDto, UpdateSchedulesCommand } from "../../../../types.ts";

export const prerender = false;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const scheduleSchema = z.object({
  season: z.enum(["spring", "summer", "autumn", "winter"]),
  watering_interval: z.number().int().min(0).max(365),
  fertilizing_interval: z.number().int().min(0).max(365),
});

const bodySchema = z
  .object({
    schedules: z.array(scheduleSchema).min(1).max(4),
  })
  .strict();

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

  if (supabaseError?.code === "23505") {
    return {
      status: 409,
      code: "duplicate_season",
      message: "Schedule seasons must be unique.",
      details: { db_code: supabaseError?.code },
    };
  }

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

/**
 * GET /api/plants/:id/schedules
 * Returns seasonal schedules for a plant (ordered by season).
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "validation_error", "Invalid path parameters.", parsedParams.error.flatten() as Json);
  }

  const userId = DEFAULT_USER_ID;
  // TODO: Replace with authenticated user from Supabase session.
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  const requestId = request.headers.get("x-request-id") ?? undefined;

  try {
    const schedules = await getPlantSchedules(locals.supabase, userId, parsedParams.data.id);
    const payload: ApiResponseDto<SeasonalScheduleDto[]> = {
      success: true,
      data: schedules,
      error: null,
    };

    return jsonResponse(200, payload);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, "not_found", "Plant not found.");
    }

    if (error instanceof ScheduleIntegrityError) {
      return errorResponse(500, "schedule_incomplete", error.message, error.details as Json);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to fetch plant schedules.", {
      route: "/api/plants/:id/schedules",
      plant_id: parsedParams.data.id,
      user_id: userId,
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

/**
 * PUT /api/plants/:id/schedules
 * Updates one or more seasonal schedule entries.
 * Validation covers path, body shape, numeric ranges, and season uniqueness.
 * Error codes: 400 (validation), 401 (unauthorized), 404 (not found), 500 (server).
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "validation_error", "Invalid path parameters.", parsedParams.error.flatten() as Json);
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch (error) {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.", {
      message: error instanceof Error ? error.message : "Failed to parse JSON body.",
    });
  }

  const parsedBody = bodySchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return errorResponse(400, "validation_error", "Invalid request body.", parsedBody.error.flatten() as Json);
  }

  const command: UpdateSchedulesCommand = parsedBody.data;
  const seasons = command.schedules.map((schedule) => schedule.season);
  const uniqueSeasons = new Set(seasons);

  if (uniqueSeasons.size !== seasons.length) {
    return errorResponse(409, "duplicate_season", "Schedule seasons must be unique.", {
      fieldErrors: {
        schedules: ["Provide at most one entry per season."],
      },
    });
  }

  const userId = DEFAULT_USER_ID;
  // TODO: Replace with authenticated user from Supabase session.
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  const requestId = request.headers.get("x-request-id") ?? undefined;

  try {
    const schedules = await updatePlantSchedules(locals.supabase, userId, parsedParams.data.id, command);
    return jsonResponse(200, {
      success: true,
      data: schedules,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, "not_found", "Plant not found.");
    }

    // eslint-disable-next-line no-console
    console.error("Failed to update plant schedules.", {
      route: "/api/plants/:id/schedules",
      plant_id: parsedParams.data.id,
      user_id: userId,
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
