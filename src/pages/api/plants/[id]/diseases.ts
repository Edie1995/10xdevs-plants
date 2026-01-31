import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../../db/database.types.ts";
import { createDisease, listDiseases, ResourceNotFoundError } from "../../../../lib/services/diseases.service.ts";
import type { ApiResponseDto, DiseaseCommand, DiseaseDto } from "../../../../types.ts";

export const prerender = false;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const optionalTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const bodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  symptoms: optionalTextSchema,
  advice: optionalTextSchema,
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

export const GET: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "invalid_id", "Plant id must be a valid UUID.", parsedParams.error.flatten() as Json);
  }

  const plantId = parsedParams.data.id;
  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
  }
  const requestId = request.headers.get("x-request-id") ?? undefined;

  try {
    const diseases = await listDiseases(locals.supabase, userId, plantId);

    return jsonResponse(200, {
      success: true,
      data: diseases,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, "plant_not_found", error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to list plant diseases.", {
      route: "/api/plants/:id/diseases",
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

export const POST: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(400, "invalid_id", "Plant id must be a valid UUID.", parsedParams.error.flatten() as Json);
  }

  const plantId = parsedParams.data.id;
  const userId = locals.user?.id;
  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required.");
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
    return errorResponse(400, "invalid_body", "Invalid request body.", parsedBody.error.flatten() as Json);
  }

  const command: DiseaseCommand = parsedBody.data;

  try {
    const disease = await createDisease(locals.supabase, userId, plantId, command);

    return jsonResponse(201, {
      success: true,
      data: disease as DiseaseDto,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return errorResponse(404, "plant_not_found", error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to create plant disease.", {
      route: "/api/plants/:id/diseases",
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
