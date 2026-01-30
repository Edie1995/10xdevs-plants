import type { DifficultyLevel, PlantCardDetailDto, PlantCardUpdateCommand } from "../../types";

export type PlantBasicDraftVM = {
  name: string;
  soil: string | null;
  pot: string | null;
  position: string | null;
  difficulty: DifficultyLevel | null;
  watering_instructions: string | null;
  repotting_instructions: string | null;
  propagation_instructions: string | null;
  notes: string | null;
  icon_key: string | null;
  color_hex: string | null;
};

export type PlantBasicErrorsVM = {
  form?: string;
  fields?: Partial<Record<keyof PlantBasicDraftVM, string>>;
};

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const normalizeOptionalString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const mapPlantDetailToBasicDraft = (plant: PlantCardDetailDto): PlantBasicDraftVM => ({
  name: plant.name ?? "",
  soil: plant.soil ?? null,
  pot: plant.pot ?? null,
  position: plant.position ?? null,
  difficulty: plant.difficulty ?? null,
  watering_instructions: plant.watering_instructions ?? null,
  repotting_instructions: plant.repotting_instructions ?? null,
  propagation_instructions: plant.propagation_instructions ?? null,
  notes: plant.notes ?? null,
  icon_key: plant.icon_key ?? null,
  color_hex: plant.color_hex ?? null,
});

export const mapPlantBasicDraftToCommand = (draft: PlantBasicDraftVM): PlantCardUpdateCommand => ({
  name: draft.name.trim(),
  soil: normalizeOptionalString(draft.soil),
  pot: normalizeOptionalString(draft.pot),
  position: normalizeOptionalString(draft.position),
  difficulty: draft.difficulty ?? null,
  watering_instructions: normalizeOptionalString(draft.watering_instructions),
  repotting_instructions: normalizeOptionalString(draft.repotting_instructions),
  propagation_instructions: normalizeOptionalString(draft.propagation_instructions),
  notes: normalizeOptionalString(draft.notes),
  icon_key: normalizeOptionalString(draft.icon_key),
  color_hex: normalizeOptionalString(draft.color_hex),
});

export const buildPlantBasicDiff = (
  base: PlantBasicDraftVM,
  draft: PlantBasicDraftVM,
): PlantCardUpdateCommand => {
  const normalizedBase = mapPlantBasicDraftToCommand(base);
  const normalizedDraft = mapPlantBasicDraftToCommand(draft);
  const diff: PlantCardUpdateCommand = {};

  (Object.keys(normalizedDraft) as Array<keyof PlantCardUpdateCommand>).forEach((key) => {
    if (normalizedDraft[key] !== normalizedBase[key]) {
      diff[key] = normalizedDraft[key];
    }
  });

  return diff;
};

export const validatePlantBasicDraft = (draft: PlantBasicDraftVM): PlantBasicErrorsVM | null => {
  const errors: PlantBasicErrorsVM = { fields: {} };

  const checkMax = (field: keyof PlantBasicDraftVM, max: number) => {
    const value = draft[field];
    if (typeof value === "string" && value.trim().length > max) {
      errors.fields![field] = `Maksymalnie ${max} znakow.`;
    }
  };

  checkMax("name", 50);
  checkMax("soil", 200);
  checkMax("pot", 200);
  checkMax("position", 50);
  checkMax("watering_instructions", 2000);
  checkMax("repotting_instructions", 2000);
  checkMax("propagation_instructions", 2000);
  checkMax("notes", 2000);
  checkMax("icon_key", 50);

  if (draft.color_hex && !COLOR_REGEX.test(draft.color_hex.trim())) {
    errors.fields!.color_hex = "Niepoprawny format koloru.";
  }

  const hasErrors = Boolean(errors.form) || Object.keys(errors.fields ?? {}).length > 0;
  return hasErrors ? errors : null;
};

export const mapPlantBasicApiErrors = (details: unknown): PlantBasicErrorsVM | null => {
  const payload = details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | null;
  if (!payload) {
    return null;
  }

  const errors: PlantBasicErrorsVM = { fields: {} };

  if (payload.formErrors && payload.formErrors.length > 0) {
    errors.form = payload.formErrors[0];
  }

  Object.entries(payload.fieldErrors ?? {}).forEach(([field, messages]) => {
    const message = messages?.[0];
    if (!message) {
      return;
    }
    errors.fields![field as keyof PlantBasicDraftVM] = message;
  });

  const hasErrors = Boolean(errors.form) || Object.keys(errors.fields ?? {}).length > 0;
  return hasErrors ? errors : null;
};
