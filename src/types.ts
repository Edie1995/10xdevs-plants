import type { Enums, Json, Tables, TablesInsert } from "./db/database.types";

// Base entity aliases from the database schema.
export type PlantCardRow = Tables<"plant_card">;
export type DiseaseEntryRow = Tables<"disease_entry">;
export type SeasonalScheduleRow = Tables<"seasonal_schedule">;
export type CareLogRow = Tables<"care_log">;

export type CareActionType = Enums<"care_action_type">;
export type DifficultyLevel = Enums<"difficulty_level">;
export type Season = Enums<"season">;

// Shared API envelope DTOs.
export interface ApiErrorDto {
  code: string;
  message: string;
  details?: Json;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponseDto<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorDto | null;
  pagination?: PaginationDto;
  message?: string;
}

// Public-facing DTOs (hide user_id by default).
export type PlantCardPublicDto = Omit<PlantCardRow, "user_id">;

export type PlantCardListItemDto = Pick<
  PlantCardPublicDto,
  | "id"
  | "name"
  | "icon_key"
  | "color_hex"
  | "difficulty"
  | "status_priority"
  | "next_watering_at"
  | "next_fertilizing_at"
  | "last_watered_at"
  | "last_fertilized_at"
  | "created_at"
  | "updated_at"
>;

export interface PlantCardListResult {
  items: PlantCardListItemDto[];
  pagination: PaginationDto;
}

export type DiseaseDto = Omit<DiseaseEntryRow, "plant_card_id">;
export type SeasonalScheduleDto = Omit<SeasonalScheduleRow, "plant_card_id">;
export type CareLogDto = Omit<CareLogRow, "plant_card_id">;
export type CareActionsListResultDto = CareLogDto[];

export type PlantCardDetailDto = PlantCardPublicDto & {
  diseases: DiseaseDto[];
  schedules: SeasonalScheduleDto[];
  recent_care_logs: CareLogDto[];
};

export interface DashboardStatsDto {
  total_plants: number;
  urgent: number;
  warning: number;
}

export interface DashboardDto {
  requires_attention: PlantCardListItemDto[];
  all_plants: PlantCardListItemDto[];
  stats: DashboardStatsDto;
}

// Query DTOs
export interface PlantListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "priority" | "name" | "created";
  direction?: "asc" | "desc";
  needs_attention?: boolean;
}

export interface CareActionsQueryDto {
  action_type?: CareActionType;
  limit?: number;
}

export type DashboardQueryDto = Pick<PlantListQueryDto, "page" | "limit" | "search" | "sort" | "direction">;

// Command models
type PlantCardInsert = TablesInsert<"plant_card">;
type DiseaseInsert = TablesInsert<"disease_entry">;

// Omit server-controlled fields so client payloads stay aligned to DB.
export type PlantCardCreateCommand = Omit<
  PlantCardInsert,
  | "id"
  | "created_at"
  | "updated_at"
  | "user_id"
  | "status_priority"
  | "last_fertilized_at"
  | "last_watered_at"
  | "next_fertilizing_at"
  | "next_watering_at"
> & {
  schedules?: SeasonalScheduleCommand[];
  diseases?: DiseaseCommand[];
};

// Update allows partial fields, with optional nested upserts.
export type PlantCardUpdateCommand = Partial<Omit<PlantCardCreateCommand, "schedules" | "diseases">> & {
  schedules?: SeasonalScheduleCommand[];
  diseases?: DiseaseCommand[];
};

export type DiseaseCommand = Omit<DiseaseInsert, "id" | "created_at" | "updated_at" | "plant_card_id">;

export type DiseaseUpdateCommand = Partial<DiseaseCommand>;

// Schedules are always sent as full season entries in the API.
export type SeasonalScheduleCommand = Pick<
  SeasonalScheduleRow,
  "season" | "watering_interval" | "fertilizing_interval"
>;

export interface UpdateSchedulesCommand {
  schedules: SeasonalScheduleCommand[];
}

export interface CareActionCreateCommand {
  action_type: CareLogRow["action_type"];
  performed_at?: CareLogRow["performed_at"];
}

export interface CareActionResultDto {
  care_log: CareLogDto;
  plant: PlantCardListItemDto;
}

export type PlantTabKey = "basic" | "schedule" | "diseases" | "history";

// Supabase auth profile mirror; user id is linked to plant_card.user_id.
export interface UserProfileDto {
  id: PlantCardRow["user_id"];
  email: string;
  created_at: string;
  user_metadata: Json;
}
