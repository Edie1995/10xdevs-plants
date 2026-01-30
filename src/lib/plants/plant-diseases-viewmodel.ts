import type { DiseaseCommand, DiseaseDto, DiseaseUpdateCommand } from "../../types";

export type DiseaseDraftVM = {
  name: string;
  symptoms: string | null;
  advice: string | null;
};

export type DiseaseErrorsVM = {
  fields?: { name?: string; symptoms?: string; advice?: string };
  form?: string;
};

export type InlineConfirmStateVM = {
  armedAt: number | null;
  expiresAt: number | null;
};

export type DiseaseItemVM = {
  id: string;
  data: DiseaseDto;
  isOpen: boolean;
  mode: "read" | "edit";
  draft: DiseaseDraftVM;
  errors: DiseaseErrorsVM | null;
  isSaving: boolean;
  deleteConfirm: InlineConfirmStateVM;
};

const normalizeOptionalString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const mapDiseaseToDraft = (disease: DiseaseDto): DiseaseDraftVM => ({
  name: disease.name ?? "",
  symptoms: disease.symptoms ?? null,
  advice: disease.advice ?? null,
});

export const mapDraftToCreateCommand = (draft: DiseaseDraftVM): DiseaseCommand => ({
  name: draft.name.trim(),
  symptoms: normalizeOptionalString(draft.symptoms),
  advice: normalizeOptionalString(draft.advice),
});

export const mapDraftToUpdateCommand = (draft: DiseaseDraftVM): DiseaseUpdateCommand => ({
  name: draft.name.trim(),
  symptoms: normalizeOptionalString(draft.symptoms),
  advice: normalizeOptionalString(draft.advice),
});

export const validateDiseaseDraft = (draft: DiseaseDraftVM): DiseaseErrorsVM | null => {
  const errors: DiseaseErrorsVM = { fields: {} };

  const name = draft.name.trim();
  if (!name) {
    errors.fields!.name = "Podaj nazwe choroby.";
  } else if (name.length > 50) {
    errors.fields!.name = "Maksymalnie 50 znakow.";
  }

  if (draft.symptoms && draft.symptoms.trim().length > 2000) {
    errors.fields!.symptoms = "Maksymalnie 2000 znakow.";
  }
  if (draft.advice && draft.advice.trim().length > 2000) {
    errors.fields!.advice = "Maksymalnie 2000 znakow.";
  }

  const hasErrors = Boolean(errors.form) || Object.keys(errors.fields ?? {}).length > 0;
  return hasErrors ? errors : null;
};

export const mapDiseaseApiErrors = (details: unknown): DiseaseErrorsVM | null => {
  const payload = details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | null;
  if (!payload) {
    return null;
  }

  const errors: DiseaseErrorsVM = { fields: {} };

  if (payload.formErrors && payload.formErrors.length > 0) {
    errors.form = payload.formErrors[0];
  }

  Object.entries(payload.fieldErrors ?? {}).forEach(([field, messages]) => {
    const message = messages?.[0];
    if (!message) {
      return;
    }
    if (field === "name" || field === "symptoms" || field === "advice") {
      errors.fields![field] = message;
    }
  });

  const hasErrors = Boolean(errors.form) || Object.keys(errors.fields ?? {}).length > 0;
  return hasErrors ? errors : null;
};

export const createInlineConfirmState = (): InlineConfirmStateVM => ({
  armedAt: null,
  expiresAt: null,
});
