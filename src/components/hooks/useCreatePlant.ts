import { useCallback, useState } from "react";

import { apiPost, type ApiErrorViewModel } from "../../lib/api/api-client";
import type { DiseaseCommand, PlantCardCreateCommand, PlantCardDetailDto, SeasonalScheduleCommand } from "../../types";
import type { NewPlantFormErrors, NewPlantFormValues } from "../../lib/plants/new-plant-viewmodel";

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

const normalizeOptionalString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeSchedules = (schedules?: SeasonalScheduleCommand[]) => {
  if (!schedules || schedules.length === 0) {
    return undefined;
  }
  return schedules.map((schedule) => ({
    ...schedule,
    watering_interval: Number(schedule.watering_interval),
    fertilizing_interval: Number(schedule.fertilizing_interval),
  }));
};

const normalizeDiseases = (diseases?: DiseaseCommand[]) => {
  if (!diseases || diseases.length === 0) {
    return undefined;
  }
  return diseases.map((disease) => ({
    name: normalizeOptionalString(disease.name) ?? "",
    symptoms: normalizeOptionalString(disease.symptoms),
    advice: normalizeOptionalString(disease.advice),
  }));
};

const normalizeValues = (values: NewPlantFormValues): PlantCardCreateCommand => ({
  name: values.name.trim(),
  soil: normalizeOptionalString(values.soil),
  pot: normalizeOptionalString(values.pot),
  position: normalizeOptionalString(values.position),
  difficulty: values.difficulty,
  watering_instructions: normalizeOptionalString(values.watering_instructions),
  repotting_instructions: normalizeOptionalString(values.repotting_instructions),
  propagation_instructions: normalizeOptionalString(values.propagation_instructions),
  notes: normalizeOptionalString(values.notes),
  icon_key: normalizeOptionalString(values.icon_key),
  color_hex: normalizeOptionalString(values.color_hex),
  schedules: normalizeSchedules(values.schedules),
  diseases: normalizeDiseases(values.diseases),
});

const createEmptyErrors = (): NewPlantFormErrors => ({
  fields: {},
  schedules: {},
  diseases: [],
});

const ensureFields = (errors: NewPlantFormErrors) => {
  if (!errors.fields) {
    errors.fields = {};
  }
  return errors.fields;
};

const ensureSchedules = (errors: NewPlantFormErrors) => {
  if (!errors.schedules) {
    errors.schedules = {};
  }
  return errors.schedules;
};

const ensureDiseases = (errors: NewPlantFormErrors) => {
  if (!errors.diseases) {
    errors.diseases = [];
  }
  return errors.diseases;
};

const hasErrors = (errors: NewPlantFormErrors) => {
  const hasFields = errors.fields && Object.keys(errors.fields).length > 0;
  const hasSchedules = errors.schedules && Object.keys(errors.schedules).length > 0;
  const hasDiseases = errors.diseases && errors.diseases.some((entry) => entry && Object.keys(entry).length > 0);
  return Boolean(errors.form || hasFields || hasSchedules || hasDiseases);
};

const validateValues = (values: NewPlantFormValues): NewPlantFormErrors | null => {
  const errors = createEmptyErrors();

  const name = values.name.trim();
  if (!name) {
    ensureFields(errors).name = "Podaj nazwe rosliny.";
  } else if (name.length > 50) {
    ensureFields(errors).name = "Maksymalnie 50 znakow.";
  }

  const checkMax = (field: keyof NewPlantFormValues, max: number) => {
    const value = values[field];
    if (typeof value === "string" && value.trim().length > max) {
      ensureFields(errors)[field] = `Maksymalnie ${max} znakow.`;
    }
  };

  checkMax("soil", 200);
  checkMax("pot", 200);
  checkMax("position", 50);
  checkMax("watering_instructions", 2000);
  checkMax("repotting_instructions", 2000);
  checkMax("propagation_instructions", 2000);
  checkMax("notes", 2000);
  checkMax("icon_key", 50);

  if (values.color_hex && !COLOR_REGEX.test(values.color_hex.trim())) {
    ensureFields(errors).color_hex = "Niepoprawny format koloru.";
  }

  if (values.schedules) {
    values.schedules.forEach((schedule) => {
      const scheduleErrors = ensureSchedules(errors)[schedule.season] ?? {};
      const { watering_interval, fertilizing_interval } = schedule;

      const validateInterval = (value: number, key: "watering_interval" | "fertilizing_interval") => {
        if (!Number.isInteger(value)) {
          scheduleErrors[key] = "Wpisz liczbe calkowita.";
          return;
        }
        if (value < 0 || value > 365) {
          scheduleErrors[key] = "Dozwolony zakres 0-365.";
        }
      };

      validateInterval(watering_interval, "watering_interval");
      validateInterval(fertilizing_interval, "fertilizing_interval");

      if (Object.keys(scheduleErrors).length > 0) {
        ensureSchedules(errors)[schedule.season] = scheduleErrors;
      }
    });
  }

  if (values.diseases) {
    values.diseases.forEach((disease, index) => {
      const diseaseErrors: { name?: string; symptoms?: string; advice?: string } = {};
      const diseaseName = disease.name?.trim() ?? "";

      if (!diseaseName) {
        diseaseErrors.name = "Podaj nazwe choroby.";
      } else if (diseaseName.length > 50) {
        diseaseErrors.name = "Maksymalnie 50 znakow.";
      }

      if (disease.symptoms && disease.symptoms.trim().length > 2000) {
        diseaseErrors.symptoms = "Maksymalnie 2000 znakow.";
      }
      if (disease.advice && disease.advice.trim().length > 2000) {
        diseaseErrors.advice = "Maksymalnie 2000 znakow.";
      }

      if (Object.keys(diseaseErrors).length > 0) {
        ensureDiseases(errors)[index] = diseaseErrors;
      }
    });
  }

  return hasErrors(errors) ? errors : null;
};

const mapApiValidationErrors = (details: unknown, values: NewPlantFormValues): NewPlantFormErrors | null => {
  const payload = details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | null;
  if (!payload) {
    return null;
  }

  const errors = createEmptyErrors();

  if (payload.formErrors && payload.formErrors.length > 0) {
    errors.form = payload.formErrors[0];
  }

  Object.entries(payload.fieldErrors ?? {}).forEach(([field, messages]) => {
    const message = messages?.[0];
    if (!message) {
      return;
    }

    const scheduleMatch = field.match(/^schedules\.(\d+)\.(watering_interval|fertilizing_interval)$/);
    if (scheduleMatch) {
      const index = Number(scheduleMatch[1]);
      const scheduleKey = scheduleMatch[2] as "watering_interval" | "fertilizing_interval";
      const season = values.schedules?.[index]?.season;
      if (season) {
        const schedules = ensureSchedules(errors);
        schedules[season] = {
          ...schedules[season],
          [scheduleKey]: message,
        };
      }
      return;
    }

    const diseaseMatch = field.match(/^diseases\.(\d+)\.(name|symptoms|advice)$/);
    if (diseaseMatch) {
      const index = Number(diseaseMatch[1]);
      const diseaseKey = diseaseMatch[2] as "name" | "symptoms" | "advice";
      const diseases = ensureDiseases(errors);
      diseases[index] = {
        ...diseases[index],
        [diseaseKey]: message,
      };
      return;
    }

    ensureFields(errors)[field] = message;
  });

  return hasErrors(errors) ? errors : null;
};

interface SubmitResult {
  result: { data: PlantCardDetailDto | null; error: ApiErrorViewModel | null };
  errors: NewPlantFormErrors | null;
}

export const useCreatePlant = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const submit = useCallback(async (values: NewPlantFormValues): Promise<SubmitResult> => {
    const validationErrors = validateValues(values);
    if (validationErrors) {
      return { result: { data: null, error: null }, errors: validationErrors };
    }

    setIsSubmitting(true);
    setAuthRequired(false);
    const payload = normalizeValues(values);
    const response = await apiPost<PlantCardDetailDto>("/api/plants", payload);
    setIsSubmitting(false);

    if (response.error?.httpStatus === 401) {
      setAuthRequired(true);
    }

    if (response.error?.httpStatus === 400 && response.error.code === "validation_error") {
      const errors = mapApiValidationErrors(response.error.details, values);
      return { result: { data: null, error: response.error }, errors: errors ?? null };
    }

    return { result: { data: response.data, error: response.error }, errors: null };
  }, []);

  return {
    isSubmitting,
    authRequired,
    submit,
  };
};
