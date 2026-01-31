import type { Json } from "../../db/database.types.ts";
import type { SupabaseClient } from "../../db/supabase.client.ts";
import type {
  CareActionCreateCommand,
  CareActionResultDto,
  CareActionsQueryDto,
  CareLogDto,
  CareLogRow,
  PlantCardListItemDto,
  PlantCardRow,
} from "../../types.ts";
import {
  addDaysUtc,
  formatUtcDateOnly,
  getSeasonForDate,
  parseDateOnlyToUtc,
  toUtcDateOnly,
} from "./care-schedule.utils.ts";

export class ResourceNotFoundError extends Error {
  readonly status = 404;
  readonly code = "not_found";

  constructor(message = "Resource not found.") {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

export class DomainValidationError extends Error {
  readonly status = 400;
  readonly code: string;
  readonly details?: Json;

  constructor(code: string, message: string, details?: Json) {
    super(message);
    this.name = "DomainValidationError";
    this.code = code;
    this.details = details;
  }
}

const omitPlantCardId = <T extends { plant_card_id: string }>(entry: T): Omit<T, "plant_card_id"> => {
  const { plant_card_id: _plantCardId, ...rest } = entry;
  void _plantCardId;
  return rest;
};

const assertPlantOwnershipOrNotFound = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string
): Promise<void> => {
  const { data, error } = await supabase
    .from("plant_card")
    .select("id")
    .eq("id", plantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ResourceNotFoundError("Plant not found.");
  }
};

export const createCareAction = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  command: CareActionCreateCommand
): Promise<CareActionResultDto> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const performedAtRaw = command.performed_at ?? formatUtcDateOnly(new Date());
  const performedAtDate = parseDateOnlyToUtc(performedAtRaw);

  if (!performedAtDate) {
    throw new DomainValidationError("validation_error", "Invalid performed_at date.", {
      performed_at: performedAtRaw,
    });
  }

  const today = toUtcDateOnly(new Date());
  const performedAtUtc = toUtcDateOnly(performedAtDate);

  if (performedAtUtc.getTime() > today.getTime()) {
    throw new DomainValidationError("performed_at_in_future", "performed_at cannot be in the future.", {
      performed_at: performedAtRaw,
      today: today.toISOString().slice(0, 10),
    });
  }

  const { data: currentPlant, error: plantError } = await supabase
    .from("plant_card")
    .select(
      "id, name, icon_key, color_hex, difficulty, next_watering_at, next_fertilizing_at, last_watered_at, last_fertilized_at, created_at, updated_at"
    )
    .eq("id", plantId)
    .eq("user_id", userId)
    .single();

  if (plantError || !currentPlant) {
    throw plantError ?? new ResourceNotFoundError("Plant not found.");
  }

  const season = getSeasonForDate(performedAtDate);
  const { data: schedule, error: scheduleError } = await supabase
    .from("seasonal_schedule")
    .select("watering_interval, fertilizing_interval")
    .eq("plant_card_id", plantId)
    .eq("season", season)
    .maybeSingle();

  if (scheduleError) {
    throw scheduleError;
  }

  if (!schedule) {
    throw new DomainValidationError("schedule_missing", "Seasonal schedule is missing for this plant.", {
      season,
    });
  }

  const interval = command.action_type === "watering" ? schedule.watering_interval : schedule.fertilizing_interval;

  if (interval === null || interval === undefined) {
    throw new DomainValidationError("schedule_missing", "Seasonal schedule is missing for this plant.", {
      season,
    });
  }

  if (command.action_type === "fertilizing" && interval === 0) {
    throw new DomainValidationError("fertilizing_disabled", "Fertilizing disabled for this season", {
      season,
    });
  }

  const performedAtIso = performedAtDate.toISOString();
  const nextDate = addDaysUtc(performedAtDate, interval).toISOString();

  const { data: createdLog, error: insertError } = await supabase
    .from("care_log")
    .insert({
      plant_card_id: plantId,
      action_type: command.action_type,
      performed_at: performedAtRaw,
    })
    .select("id, action_type, performed_at, created_at, updated_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  if (!createdLog) {
    throw new Error("Failed to create care log.");
  }

  const updatePayload: Partial<PlantCardRow> = {};

  if (command.action_type === "watering") {
    updatePayload.last_watered_at = performedAtIso;
    updatePayload.next_watering_at = nextDate;
  } else {
    updatePayload.last_fertilized_at = performedAtIso;
    updatePayload.next_fertilizing_at = nextDate;
  }

  const { data: updatedPlant, error: updateError } = await supabase
    .from("plant_card")
    .update(updatePayload)
    .eq("id", plantId)
    .eq("user_id", userId)
    .select(
      "id, name, icon_key, color_hex, difficulty, next_watering_at, next_fertilizing_at, last_watered_at, last_fertilized_at, created_at, updated_at"
    )
    .single();

  if (updateError || !updatedPlant) {
    throw updateError ?? new Error("Failed to update plant card.");
  }

  return {
    care_log: omitPlantCardId(createdLog as CareLogRow) as CareLogDto,
    plant: updatedPlant as PlantCardListItemDto,
  };
};

export const listCareActions = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  query: CareActionsQueryDto
): Promise<CareLogDto[]> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const { action_type, limit = 50 } = query;

  let careLogQuery = supabase
    .from("care_log")
    .select("id, action_type, performed_at, created_at, updated_at")
    .eq("plant_card_id", plantId);

  if (action_type) {
    careLogQuery = careLogQuery.eq("action_type", action_type);
  }

  const { data, error } = await careLogQuery
    .order("performed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((entry) => omitPlantCardId(entry as CareLogRow)) as CareLogDto[];
};
