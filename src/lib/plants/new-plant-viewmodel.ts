import type { ApiErrorViewModel } from "../api/api-client";
import type { DiseaseCommand, DifficultyLevel, PlantCardDetailDto, SeasonalScheduleCommand, Season } from "../../types";

export type NewPlantFormValues = {
  name: string;
  soil?: string;
  pot?: string;
  position?: string;
  difficulty?: DifficultyLevel;
  watering_instructions?: string;
  repotting_instructions?: string;
  propagation_instructions?: string;
  notes?: string;
  icon_key?: string;
  color_hex?: string;
  schedules?: SeasonalScheduleCommand[];
  diseases?: DiseaseCommand[];
};

export type NewPlantFormErrors = {
  form?: string;
  fields?: Record<string, string>;
  schedules?: Record<Season, { watering_interval?: string; fertilizing_interval?: string }>;
  diseases?: Array<{ name?: string; symptoms?: string; advice?: string }>;
};

export type CreatePlantResult = {
  data: PlantCardDetailDto | null;
  error: ApiErrorViewModel | null;
};

export type PlantIconOption = {
  key: string;
  label: string;
  src?: string;
  previewClass?: string;
};
