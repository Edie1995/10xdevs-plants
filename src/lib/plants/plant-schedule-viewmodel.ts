import type { ApiErrorViewModel } from "../api/api-client";
import type { Season, SeasonalScheduleCommand, SeasonalScheduleDto, UpdateSchedulesCommand } from "../../types";

export type PlantScheduleEditorVM = {
  values: Record<Season, SeasonalScheduleCommand>;
  dirty: boolean;
};

export type ScheduleErrorsVM = {
  form?: string;
  seasons?: Record<Season, { watering_interval?: string; fertilizing_interval?: string }>;
};

const seasons: Season[] = ["spring", "summer", "autumn", "winter"];

const emptySchedule = (season: Season): SeasonalScheduleCommand => ({
  season,
  watering_interval: 0,
  fertilizing_interval: 0,
});

const toCommand = (schedule: SeasonalScheduleDto | SeasonalScheduleCommand): SeasonalScheduleCommand => ({
  season: schedule.season,
  watering_interval: Number(schedule.watering_interval ?? 0),
  fertilizing_interval: Number(schedule.fertilizing_interval ?? 0),
});

export const buildScheduleEditor = (
  schedules: SeasonalScheduleDto[] | SeasonalScheduleCommand[] | undefined,
): PlantScheduleEditorVM => {
  const values = seasons.reduce((acc, season) => {
    const schedule = schedules?.find((item) => item.season === season);
    acc[season] = schedule ? toCommand(schedule) : emptySchedule(season);
    return acc;
  }, {} as Record<Season, SeasonalScheduleCommand>);

  return { values, dirty: false };
};

export const buildUpdateSchedulesCommand = (editor: PlantScheduleEditorVM): UpdateSchedulesCommand => ({
  schedules: seasons.map((season) => editor.values[season] ?? emptySchedule(season)),
});

export const validateScheduleEditor = (editor: PlantScheduleEditorVM): ScheduleErrorsVM | null => {
  const errors: ScheduleErrorsVM = { seasons: {} };

  const validateInterval = (value: number, key: "watering_interval" | "fertilizing_interval") => {
    if (!Number.isInteger(value)) {
      return "Wpisz liczbe calkowita.";
    }
    if (value < 0 || value > 365) {
      return "Dozwolony zakres 0-365.";
    }
    return null;
  };

  seasons.forEach((season) => {
    const entry = editor.values[season] ?? emptySchedule(season);
    const seasonErrors: { watering_interval?: string; fertilizing_interval?: string } = {};

    const wateringError = validateInterval(entry.watering_interval, "watering_interval");
    if (wateringError) {
      seasonErrors.watering_interval = wateringError;
    }

    const fertilizingError = validateInterval(entry.fertilizing_interval, "fertilizing_interval");
    if (fertilizingError) {
      seasonErrors.fertilizing_interval = fertilizingError;
    }

    if (Object.keys(seasonErrors).length > 0) {
      errors.seasons![season] = seasonErrors;
    }
  });

  const hasErrors =
    Boolean(errors.form) || Object.keys(errors.seasons ?? {}).length > 0;

  return hasErrors ? errors : null;
};

export const mapScheduleApiErrors = (
  error: ApiErrorViewModel,
): ScheduleErrorsVM | null => {
  const payload = error.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | null;
  if (!payload) {
    return null;
  }

  const errors: ScheduleErrorsVM = { seasons: {} };

  if (payload.formErrors && payload.formErrors.length > 0) {
    errors.form = payload.formErrors[0];
  }

  Object.entries(payload.fieldErrors ?? {}).forEach(([field, messages]) => {
    const message = messages?.[0];
    if (!message) {
      return;
    }

    const scheduleMatch = field.match(/^schedules\.(\d+)\.(watering_interval|fertilizing_interval)$/);
    if (!scheduleMatch) {
      return;
    }

    const index = Number(scheduleMatch[1]);
    const key = scheduleMatch[2] as "watering_interval" | "fertilizing_interval";
    const season = seasons[index];
    if (!season) {
      return;
    }

    errors.seasons![season] = {
      ...errors.seasons![season],
      [key]: message,
    };
  });

  const hasErrors =
    Boolean(errors.form) || Object.keys(errors.seasons ?? {}).length > 0;
  return hasErrors ? errors : null;
};

export const getScheduleStatusMessage = (state: { status: string; error?: ApiErrorViewModel }) => {
  if (state.status === "missing") {
    return "Nie masz jeszcze ustawionego harmonogramu.";
  }
  if (state.status === "incomplete") {
    return "Harmonogram jest niepelny. Uzupelnij wszystkie sezony.";
  }
  if (state.status === "error") {
    return state.error?.message ?? "Nie udalo sie pobrac harmonogramu.";
  }
  return null;
};
