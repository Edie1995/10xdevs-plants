import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../db/database.types.ts";
import {
  deletePlantCard,
  getPlantDetail,
  ResourceNotFoundError,
  updatePlantCard,
} from "../../../lib/services/plant-card.service.ts";
import type { ApiResponseDto, PlantCardUpdateCommand } from "../../../types.ts";

export const prerender = false;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const scheduleSchema = z.object({
  season: z.enum(["spring", "summer", "autumn", "winter"]),
  watering_interval: z.number().int().min(0).max(365),
  fertilizing_interval: z.number().int().min(0).max(365),
});

const diseaseSchema = z.object({
  name: z.string().trim().min(1).max(50),
  symptoms: z.string().trim().max(2000).optional(),
  advice: z.string().trim().max(2000).optional(),
});

const plantCardUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    soil: z.string().trim().max(200).optional(),
    pot: z.string().trim().max(200).optional(),
    position: z.string().trim().max(50).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    watering_instructions: z.string().trim().max(2000).optional(),
    repotting_instructions: z.string().trim().max(2000).optional(),
    propagation_instructions: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(2000).optional(),
    icon_key: z.string().trim().max(50).optional(),
    color_hex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    schedules: z.array(scheduleSchema).optional(),
    diseases: z.array(diseaseSchema).optional(),
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

export const GET: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "invalid_id", "Plant id must be a valid UUID.", parsedParams.error.flatten() as Json);
  }

  const { id: plantId } = parsedParams.data;
  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }
  const requestId = request.headers.get("x-request-id") ?? undefined;

  try {
    const plantCard = await getPlantDetail(locals.supabase, userId, plantId, { recentCareLogsLimit: 5 });
    return jsonResponse(200, {
      success: true,
      data: plantCard,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, "plant_not_found", error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to load plant card.", {
      route: "/api/plants/:id",
      plant_id: plantId,
      request_id: requestId,
      error,
    });
    const mapped = mapSupabaseError(error);

    if (mapped.status === 403) {
      return errorResponse(404, "plant_not_found", "Plant not found.");
    }

    if (mapped.status === 401) {
      return errorResponse(401, "unauthorized", "Authentication required.");
    }

    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "validation_error", "Invalid path parameters.", parsedParams.error.flatten() as Json);
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Invalid JSON body.", error);
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = plantCardUpdateSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Invalid request payload.", parsed.error.flatten() as Json);
  }

  const payload = parsed.data as PlantCardUpdateCommand;
  const seasons = payload.schedules?.map((schedule) => schedule.season) ?? [];
  const uniqueSeasons = new Set(seasons);

  if (uniqueSeasons.size !== seasons.length) {
    return errorResponse(409, "duplicate_season", "Schedule seasons must be unique.");
  }

  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  try {
    const plantCard = await updatePlantCard(locals.supabase, userId, parsedParams.data.id, payload);
    return jsonResponse(200, {
      success: true,
      data: plantCard,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, error.code, error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to update plant card.", error);
    const mapped = mapSupabaseError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};

export const DELETE: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "invalid_id", "Plant id must be a valid UUID.", parsedParams.error.flatten() as Json);
  }

  const { id: plantId } = parsedParams.data;
  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }
  const requestId = request.headers.get("x-request-id") ?? undefined;

  try {
    await deletePlantCard(locals.supabase, userId, plantId);
    return jsonResponse(200, {
      success: true,
      data: null,
      error: null,
      message: "Plant deleted",
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, "plant_not_found", error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to delete plant card.", {
      route: "/api/plants/:id",
      plant_id: plantId,
      request_id: requestId,
      error,
    });
    const mapped = mapSupabaseError(error);

    if (mapped.status === 403) {
      return errorResponse(404, "plant_not_found", "Plant not found.");
    }

    if (mapped.status === 401) {
      return errorResponse(401, "unauthorized", "Authentication required.");
    }

    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};
