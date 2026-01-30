import type { APIRoute } from "astro";
import { z } from "zod";

import type { Json } from "../../../../../db/database.types.ts";
import { DEFAULT_USER_ID } from "../../../../../db/supabase.client.ts";
import { deleteDisease, ResourceNotFoundError, updateDisease } from "../../../../../lib/services/diseases.service.ts";
import type { ApiResponseDto, DiseaseDto, DiseaseUpdateCommand } from "../../../../../types.ts";

export const prerender = false;

const paramsSchema = z.object({
  id: z.string().uuid(),
  diseaseId: z.string().uuid(),
});

const optionalTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    symptoms: optionalTextSchema,
    advice: optionalTextSchema,
  })
  .superRefine((value, context) => {
    // Require at least one field for a partial update.
    if (value.name === undefined && value.symptoms === undefined && value.advice === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided.",
      });
    }
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

export const PUT: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(
      400,
      "invalid_id",
      "Plant or disease id must be a valid UUID.",
      parsedParams.error.flatten() as Json
    );
  }

  const plantId = parsedParams.data.id;
  const diseaseId = parsedParams.data.diseaseId;
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

  const command: DiseaseUpdateCommand = parsedBody.data;

  try {
    const disease = await updateDisease(locals.supabase, DEFAULT_USER_ID, plantId, diseaseId, command);

    return jsonResponse(200, {
      success: true,
      data: disease as DiseaseDto,
      error: null,
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      const isPlant = error.message.toLowerCase().includes("plant");
      const code = isPlant ? "plant_not_found" : "disease_not_found";
      return errorResponse(404, code, error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to update plant disease.", {
      route: "/api/plants/:id/diseases/:diseaseId",
      plant_id: plantId,
      disease_id: diseaseId,
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

export const DELETE: APIRoute = async ({ params, locals, request }) => {
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) {
    return errorResponse(
      400,
      "invalid_id",
      "Plant or disease id must be a valid UUID.",
      parsedParams.error.flatten() as Json
    );
  }

  const plantId = parsedParams.data.id;
  const diseaseId = parsedParams.data.diseaseId;
  const requestId = request.headers.get("x-request-id") ?? undefined;

  try {
    await deleteDisease(locals.supabase, DEFAULT_USER_ID, plantId, diseaseId);

    return jsonResponse(200, {
      success: true,
      data: null,
      error: null,
      message: "Disease removed.",
    });
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      const isPlant = error.message.toLowerCase().includes("plant");
      const code = isPlant ? "plant_not_found" : "disease_not_found";
      return errorResponse(404, code, error.message);
    }

    // eslint-disable-next-line no-console
    console.error("Failed to delete plant disease.", {
      route: "/api/plants/:id/diseases/:diseaseId",
      plant_id: plantId,
      disease_id: diseaseId,
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
