import type { SupabaseClient } from "../../db/supabase.client.ts";
import type {
  CareLogDto,
  CareLogRow,
  PlantCardUpdateCommand,
  DiseaseDto,
  DiseaseEntryRow,
  PlantCardListResult,
  PlantListQueryDto,
  PlantCardCreateCommand,
  PlantCardDetailDto,
  PlantCardRow,
  PlantCardPublicDto,
  SeasonalScheduleCommand,
  SeasonalScheduleDto,
  SeasonalScheduleRow,
  Season,
} from "../../types.ts";
import { addDaysUtc, computeStatusPriority, getSeasonForDate } from "./care-schedule.utils.ts";

type PlantCardWithRelations =
  | (PlantCardRow & {
      seasonal_schedule?: SeasonalScheduleRow[] | null;
      disease_entry?: DiseaseEntryRow[] | null;
      care_log?: CareLogRow[] | null;
    })
  | (PlantCardPublicDto & {
      seasonal_schedule?: SeasonalScheduleDto[] | null;
      disease_entry?: DiseaseDto[] | null;
      care_log?: CareLogDto[] | null;
    });

export class ResourceNotFoundError extends Error {
  readonly status = 404;
  readonly code = "not_found";

  constructor(message = "Resource not found.") {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

export class ScheduleIntegrityError extends Error {
  readonly status = 500;
  readonly code = "schedule_incomplete";
  readonly details: Record<string, unknown>;

  constructor(details: Record<string, unknown>, message = "Plant schedules are incomplete.") {
    super(message);
    this.name = "ScheduleIntegrityError";
    this.details = details;
  }
}

const omitPlantCardId = <T extends Record<string, unknown>>(entry: T): Omit<T, "plant_card_id"> => {
  if (!("plant_card_id" in entry)) {
    return entry as Omit<T, "plant_card_id">;
  }

  const { plant_card_id: _plantCardId, ...rest } = entry as T & { plant_card_id?: string };
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

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

const getEndOfTodayUtcIso = (): string => {
  const now = new Date();
  const endOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return endOfTodayUtc.toISOString();
};

const getPrioritySortKey = (item: Pick<PlantCardRow, "next_watering_at" | "next_fertilizing_at">) =>
  computeStatusPriority(item.next_watering_at, item.next_fertilizing_at);

const sortByPriority = <T extends { name: string } & Pick<PlantCardRow, "next_watering_at" | "next_fertilizing_at">>(
  items: T[],
  direction: "asc" | "desc"
): T[] => {
  const sorted = [...items].sort((left, right) => {
    const leftPriority = getPrioritySortKey(left);
    const rightPriority = getPrioritySortKey(right);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.name.localeCompare(right.name, "pl");
  });

  return direction === "desc" ? sorted.reverse() : sorted;
};

const buildPlantCardUpdateData = (
  command: Partial<Omit<PlantCardUpdateCommand, "schedules" | "diseases">>
): Partial<PlantCardRow> => {
  const updateData: Partial<PlantCardRow> = {};

  if (command.name !== undefined) updateData.name = command.name;
  if (command.soil !== undefined) updateData.soil = command.soil;
  if (command.pot !== undefined) updateData.pot = command.pot;
  if (command.position !== undefined) updateData.position = command.position;
  if (command.difficulty !== undefined) updateData.difficulty = command.difficulty;
  if (command.watering_instructions !== undefined) updateData.watering_instructions = command.watering_instructions;
  if (command.repotting_instructions !== undefined) updateData.repotting_instructions = command.repotting_instructions;
  if (command.propagation_instructions !== undefined)
    updateData.propagation_instructions = command.propagation_instructions;
  if (command.notes !== undefined) updateData.notes = command.notes;
  if (command.icon_key !== undefined) updateData.icon_key = command.icon_key;
  if (command.color_hex !== undefined) updateData.color_hex = command.color_hex;

  return updateData;
};

const recalculateNextDates = (
  lastWateredAt: string | null,
  lastFertilizedAt: string | null,
  schedules: SeasonalScheduleCommand[]
): Pick<PlantCardRow, "next_watering_at" | "next_fertilizing_at"> => {
  const scheduleBySeason = new Map(schedules.map((schedule) => [schedule.season, schedule]));

  const computeNextDate = (lastDateRaw: string | null, interval: number | undefined, zeroIsNull = false) => {
    if (!lastDateRaw || interval === undefined) {
      return null;
    }

    if (interval === 0 && zeroIsNull) {
      return null;
    }

    const lastDate = new Date(lastDateRaw);
    return addDaysUtc(lastDate, interval).toISOString();
  };

  let nextWateringAt: string | null = null;
  let nextFertilizingAt: string | null = null;

  if (lastWateredAt) {
    const season = getSeasonForDate(new Date(lastWateredAt));
    const schedule = scheduleBySeason.get(season);
    nextWateringAt = computeNextDate(lastWateredAt, schedule?.watering_interval);
  }

  if (lastFertilizedAt) {
    const season = getSeasonForDate(new Date(lastFertilizedAt));
    const schedule = scheduleBySeason.get(season);
    nextFertilizingAt = computeNextDate(lastFertilizedAt, schedule?.fertilizing_interval, true);
  }

  return {
    next_watering_at: nextWateringAt,
    next_fertilizing_at: nextFertilizingAt,
  };
};

const mapPlantCardDetail = (record: PlantCardWithRelations): PlantCardDetailDto => {
  const { seasonal_schedule, disease_entry, care_log, ...plantCard } = record;

  const schedules = (seasonal_schedule ?? []).map((schedule) => omitPlantCardId(schedule)) as SeasonalScheduleDto[];
  const diseases = (disease_entry ?? []).map((disease) => omitPlantCardId(disease)) as DiseaseDto[];
  const recentCareLogs = (care_log ?? []).map((log) => omitPlantCardId(log)) as CareLogDto[];

  return {
    ...plantCard,
    schedules,
    diseases,
    recent_care_logs: recentCareLogs,
  };
};

interface GetPlantDetailOptions {
  recentCareLogsLimit?: number;
}

export const getPlantDetail = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  options: GetPlantDetailOptions = {}
): Promise<PlantCardDetailDto> => {
  const recentCareLogsLimit = options.recentCareLogsLimit ?? 5;
  const plantCardColumns = [
    "id",
    "name",
    "icon_key",
    "color_hex",
    "difficulty",
    "next_watering_at",
    "next_fertilizing_at",
    "last_watered_at",
    "last_fertilized_at",
    "created_at",
    "updated_at",
    "soil",
    "pot",
    "position",
    "watering_instructions",
    "repotting_instructions",
    "propagation_instructions",
    "notes",
  ].join(", ");
  const diseaseColumns = ["id", "name", "symptoms", "advice", "created_at", "updated_at"].join(", ");
  const scheduleColumns = [
    "id",
    "season",
    "watering_interval",
    "fertilizing_interval",
    "created_at",
    "updated_at",
  ].join(", ");
  const careLogColumns = ["id", "action_type", "performed_at", "created_at", "updated_at"].join(", ");

  const { data: plantCardRaw, error: plantError } = await supabase
    .from("plant_card")
    .select(plantCardColumns)
    .eq("id", plantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (plantError) {
    throw plantError;
  }

  const plantCard = plantCardRaw as PlantCardPublicDto | null;

  if (!plantCard) {
    throw new ResourceNotFoundError("Plant not found.");
  }

  const [diseasesResult, schedulesResult, careLogsResult] = await Promise.all([
    supabase.from("disease_entry").select(diseaseColumns).eq("plant_card_id", plantId),
    supabase.from("seasonal_schedule").select(scheduleColumns).eq("plant_card_id", plantId),
    supabase
      .from("care_log")
      .select(careLogColumns)
      .eq("plant_card_id", plantId)
      .order("performed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(recentCareLogsLimit),
  ]);

  if (diseasesResult.error) {
    throw diseasesResult.error;
  }

  if (schedulesResult.error) {
    throw schedulesResult.error;
  }

  if (careLogsResult.error) {
    throw careLogsResult.error;
  }

  const diseaseRows = (diseasesResult.data ?? []) as unknown as DiseaseDto[];
  const scheduleRows = (schedulesResult.data ?? []) as unknown as SeasonalScheduleDto[];
  const careLogRows = (careLogsResult.data ?? []) as unknown as CareLogDto[];

  const record: PlantCardWithRelations = {
    ...plantCard,
    disease_entry: diseaseRows,
    seasonal_schedule: scheduleRows,
    care_log: careLogRows,
  };

  return mapPlantCardDetail(record);
};

export const listPlantCards = async (
  supabase: SupabaseClient,
  userId: string,
  query: PlantListQueryDto
): Promise<PlantCardListResult> => {
  const { page = 1, limit = 20, search, sort = "priority", direction = "asc", needs_attention } = query;

  const offset = (page - 1) * limit;

  let baseQuery = supabase
    .from("plant_card")
    .select(
      `id, name, icon_key, color_hex, difficulty,
       next_watering_at, next_fertilizing_at, last_watered_at,
       last_fertilized_at, created_at, updated_at`,
      { count: "exact" }
    )
    .eq("user_id", userId);

  if (search) {
    baseQuery = baseQuery.ilike("name", `%${search}%`);
  }

  if (needs_attention === true) {
    const todayEndUtcIso = getEndOfTodayUtcIso();
    baseQuery = baseQuery.or(`next_watering_at.lte.${todayEndUtcIso},next_fertilizing_at.lte.${todayEndUtcIso}`);
  }

  if (sort === "priority") {
    const { data, error, count } = await baseQuery;

    if (error) {
      throw error;
    }

    const items = (data ?? []) as PlantCardListResult["items"];
    const sortedItems = sortByPriority(items, direction);
    const total = count ?? items.length;
    const totalPages = Math.ceil(total / limit);

    return {
      items: sortedItems.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  const sortColumn = sort === "created" ? "created_at" : "name";
  baseQuery = baseQuery.order(sortColumn, { ascending: direction === "asc" });

  if (sortColumn !== "name") {
    baseQuery = baseQuery.order("name", { ascending: true });
  }

  baseQuery = baseQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await baseQuery;

  if (error) {
    throw error;
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    items: (data ?? []) as PlantCardListResult["items"],
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
};

export const createPlantCard = async (
  supabase: SupabaseClient,
  userId: string,
  command: PlantCardCreateCommand
): Promise<PlantCardDetailDto> => {
  const { schedules = [], diseases = [], ...plantCard } = command;

  const { data: createdPlant, error: createError } = await supabase
    .from("plant_card")
    .insert({
      ...plantCard,
      user_id: userId,
    })
    .select("id")
    .single();

  if (createError || !createdPlant) {
    throw createError ?? new Error("Failed to create plant card.");
  }

  if (schedules.length > 0) {
    const scheduleRows = schedules.map((schedule) => ({
      ...schedule,
      plant_card_id: createdPlant.id,
    }));
    const { error: scheduleError } = await supabase.from("seasonal_schedule").insert(scheduleRows);

    if (scheduleError) {
      throw scheduleError;
    }
  }

  if (diseases.length > 0) {
    const diseaseRows = diseases.map((disease) => ({
      ...disease,
      plant_card_id: createdPlant.id,
    }));
    const { error: diseaseError } = await supabase.from("disease_entry").insert(diseaseRows);

    if (diseaseError) {
      throw diseaseError;
    }
  }

  const { data: fullCard, error: fetchError } = await supabase
    .from("plant_card")
    .select("*, seasonal_schedule(*), disease_entry(*), care_log(*)")
    .eq("id", createdPlant.id)
    .single();

  if (fetchError || !fullCard) {
    throw fetchError ?? new Error("Failed to load created plant card.");
  }

  return mapPlantCardDetail(fullCard);
};

export const updatePlantCard = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  command: PlantCardUpdateCommand
): Promise<PlantCardDetailDto> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const { data: currentPlant, error: currentError } = await supabase
    .from("plant_card")
    .select("id, last_watered_at, last_fertilized_at, next_watering_at, next_fertilizing_at")
    .eq("id", plantId)
    .eq("user_id", userId)
    .single();

  if (currentError || !currentPlant) {
    throw currentError ?? new Error("Failed to load plant card.");
  }

  const { schedules, diseases, ...plantFields } = command;
  const updateData = buildPlantCardUpdateData(plantFields);

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from("plant_card")
      .update(updateData)
      .eq("id", plantId)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }
  }

  if (schedules !== undefined) {
    const { error: deleteError } = await supabase.from("seasonal_schedule").delete().eq("plant_card_id", plantId);

    if (deleteError) {
      throw deleteError;
    }

    if (schedules.length > 0) {
      const scheduleRows = schedules.map((schedule) => ({
        ...schedule,
        plant_card_id: plantId,
      }));
      const { error: insertError } = await supabase.from("seasonal_schedule").insert(scheduleRows);

      if (insertError) {
        throw insertError;
      }
    }

    const nextValues = recalculateNextDates(currentPlant.last_watered_at, currentPlant.last_fertilized_at, schedules);

    const shouldUpdateNext =
      nextValues.next_watering_at !== currentPlant.next_watering_at ||
      nextValues.next_fertilizing_at !== currentPlant.next_fertilizing_at;

    if (shouldUpdateNext) {
      const { error: nextUpdateError } = await supabase
        .from("plant_card")
        .update(nextValues)
        .eq("id", plantId)
        .eq("user_id", userId);

      if (nextUpdateError) {
        throw nextUpdateError;
      }
    }
  }

  if (diseases !== undefined) {
    const { error: deleteError } = await supabase.from("disease_entry").delete().eq("plant_card_id", plantId);

    if (deleteError) {
      throw deleteError;
    }

    if (diseases.length > 0) {
      const diseaseRows = diseases.map((disease) => ({
        ...disease,
        plant_card_id: plantId,
      }));
      const { error: insertError } = await supabase.from("disease_entry").insert(diseaseRows);

      if (insertError) {
        throw insertError;
      }
    }
  }

  const { data: fullCard, error: fetchError } = await supabase
    .from("plant_card")
    .select("*, seasonal_schedule(*), disease_entry(*), care_log(*)")
    .eq("id", plantId)
    .single();

  if (fetchError || !fullCard) {
    throw fetchError ?? new Error("Failed to load updated plant card.");
  }

  return mapPlantCardDetail(fullCard);
};

export const updatePlantSchedules = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  command: { schedules: SeasonalScheduleCommand[] }
): Promise<SeasonalScheduleDto[]> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const { data: currentPlant, error: currentError } = await supabase
    .from("plant_card")
    .select("last_watered_at, last_fertilized_at, next_watering_at, next_fertilizing_at")
    .eq("id", plantId)
    .eq("user_id", userId)
    .single();

  if (currentError || !currentPlant) {
    throw currentError ?? new Error("Failed to load plant card.");
  }

  const scheduleRows = command.schedules.map((schedule) => ({
    ...schedule,
    plant_card_id: plantId,
  }));
  const { error: upsertError } = await supabase
    .from("seasonal_schedule")
    .upsert(scheduleRows, { onConflict: "plant_card_id,season" });

  if (upsertError) {
    throw upsertError;
  }

  const scheduleColumns = [
    "id",
    "season",
    "watering_interval",
    "fertilizing_interval",
    "created_at",
    "updated_at",
  ].join(", ");
  const { data: schedules, error: schedulesError } = await supabase
    .from("seasonal_schedule")
    .select(scheduleColumns)
    .eq("plant_card_id", plantId)
    .order("season", { ascending: true });

  if (schedulesError) {
    throw schedulesError;
  }

  const scheduleRowsRaw = (schedules ?? []) as unknown as SeasonalScheduleRow[];

  const nextValues = recalculateNextDates(
    currentPlant.last_watered_at,
    currentPlant.last_fertilized_at,
    scheduleRowsRaw.map((schedule) => ({
      season: schedule.season,
      watering_interval: schedule.watering_interval,
      fertilizing_interval: schedule.fertilizing_interval,
    }))
  );

  const shouldUpdateNext =
    nextValues.next_watering_at !== currentPlant.next_watering_at ||
    nextValues.next_fertilizing_at !== currentPlant.next_fertilizing_at;

  if (shouldUpdateNext) {
    const { error: nextUpdateError } = await supabase
      .from("plant_card")
      .update(nextValues)
      .eq("id", plantId)
      .eq("user_id", userId);

    if (nextUpdateError) {
      throw nextUpdateError;
    }
  }
  return scheduleRowsRaw.map((schedule) => omitPlantCardId(schedule)) as SeasonalScheduleDto[];
};

export const getPlantSchedules = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string
): Promise<SeasonalScheduleDto[]> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const scheduleColumns = [
    "id",
    "season",
    "watering_interval",
    "fertilizing_interval",
    "created_at",
    "updated_at",
  ].join(", ");

  const { data: schedules, error } = await supabase
    .from("seasonal_schedule")
    .select(scheduleColumns)
    .eq("plant_card_id", plantId)
    .order("season", { ascending: true });

  if (error) {
    throw error;
  }

  const scheduleRowsRaw = (schedules ?? []) as unknown as SeasonalScheduleRow[];
  const seasons = scheduleRowsRaw.map((schedule) => schedule.season);
  const uniqueSeasons = new Set(seasons);

  if (uniqueSeasons.size !== SEASON_ORDER.length || scheduleRowsRaw.length !== SEASON_ORDER.length) {
    const missingSeasons = SEASON_ORDER.filter((season) => !uniqueSeasons.has(season));
    const seasonCounts = seasons.reduce<Record<string, number>>((acc, season) => {
      acc[season] = (acc[season] ?? 0) + 1;
      return acc;
    }, {});
    const duplicateSeasons = Object.entries(seasonCounts)
      .filter(([, count]) => count > 1)
      .map(([season]) => season);

    throw new ScheduleIntegrityError({
      expected: SEASON_ORDER,
      received: seasons,
      missing: missingSeasons,
      duplicates: duplicateSeasons,
    });
  }

  const orderIndex = new Map(SEASON_ORDER.map((season, index) => [season, index]));
  const sortedSchedules = [...scheduleRowsRaw].sort(
    (left, right) => (orderIndex.get(left.season) ?? 0) - (orderIndex.get(right.season) ?? 0)
  );

  return sortedSchedules.map((schedule) => omitPlantCardId(schedule)) as SeasonalScheduleDto[];
};

export const deletePlantCard = async (supabase: SupabaseClient, userId: string, plantId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("plant_card")
    .delete()
    .eq("id", plantId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ResourceNotFoundError("Plant not found.");
  }
};
