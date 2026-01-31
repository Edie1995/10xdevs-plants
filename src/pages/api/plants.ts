import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../db/database.types.ts";
import { createPlantCard, listPlantCards } from "../../lib/services/plant-card.service.ts";
import type { ApiResponseDto, PlantCardCreateCommand } from "../../types.ts";

export const prerender = false;

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

const plantCardCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
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
});

const plantListQuerySchema = z.object({
  page: z.preprocess(
    (value) => (value === undefined ? undefined : Number.parseInt(String(value), 10)),
    z.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (value) => (value === undefined ? undefined : Number.parseInt(String(value), 10)),
    z.number().int().min(1).max(20).default(20)
  ),
  search: z.string().trim().optional(),
  sort: z.enum(["priority", "name", "created"]).optional().default("priority"),
  direction: z.enum(["asc", "desc"]).optional().default("asc"),
  needs_attention: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
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

export const GET: APIRoute = async ({ url, locals }) => {
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = plantListQuerySchema.safeParse(queryParams);

  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Invalid query parameters.", parsed.error.flatten() as Json);
  }

  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }

  try {
    const result = await listPlantCards(locals.supabase, userId, parsed.data);
    return jsonResponse(200, {
      success: true,
      data: result.items,
      error: null,
      pagination: result.pagination,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to list plant cards.", error);
    const mapped = mapSupabaseError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Invalid JSON body.", error);
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = plantCardCreateSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return errorResponse(400, "validation_error", "Invalid request payload.", parsed.error.flatten() as Json);
  }

  const payload = parsed.data as PlantCardCreateCommand;
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
    const plantCard = await createPlantCard(locals.supabase, userId, payload);
    return jsonResponse(201, {
      success: true,
      data: plantCard,
      error: null,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to create plant card.", error);
    const mapped = mapSupabaseError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, mapped.details);
  }
};
