import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { PlantCardDetailDto } from "../../types";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import { apiPut } from "../../lib/api/api-client";
import {
  mapPlantBasicApiErrors,
  buildPlantBasicDiff,
  mapPlantDetailToBasicDraft,
  type PlantBasicDraftVM,
  type PlantBasicErrorsVM,
  validatePlantBasicDraft,
} from "../../lib/plants/plant-basic-viewmodel";
import type { NewPlantFormErrors, NewPlantFormValues } from "../../lib/plants/new-plant-viewmodel";
import { usePlantBasicDraft } from "../hooks/usePlantBasicDraft";
import { Button } from "../ui/button";
import FormActions from "./FormActions";
import PlantBasicsSection from "./PlantBasicsSection";
import PlantInstructionsSection from "./PlantInstructionsSection";

export interface PlantBasicTabProps {
  plantId: string;
  plantDetail: PlantCardDetailDto;
  editMode: boolean;
  onEditModeChange: (next: boolean) => void;
  onSaved: () => void;
  onApiError: (error: ApiErrorViewModel) => void;
}

const difficultyLabels: Record<NonNullable<PlantCardDetailDto["difficulty"]>, string> = {
  easy: "Latwy",
  medium: "Sredni",
  hard: "Trudny",
};

const getDisplayValue = (value: string | null | undefined) => (value && value.trim().length > 0 ? value : "—");
const fieldOrder: (keyof NonNullable<PlantBasicErrorsVM["fields"]>)[] = [
  "name",
  "difficulty",
  "soil",
  "pot",
  "position",
  "watering_instructions",
  "repotting_instructions",
  "propagation_instructions",
  "notes",
];

const fieldIdMap: Record<keyof PlantBasicDraftVM, string> = {
  name: "plant-name",
  soil: "plant-soil",
  pot: "plant-pot",
  position: "plant-position",
  difficulty: "plant-difficulty",
  watering_instructions: "watering-instructions",
  repotting_instructions: "repotting-instructions",
  propagation_instructions: "propagation-instructions",
  notes: "plant-notes",
  icon_key: "plant-icon",
  color_hex: "plant-color",
};

export default function PlantBasicTab({
  plantId,
  plantDetail,
  editMode,
  onEditModeChange,
  onSaved,
  onApiError,
}: PlantBasicTabProps) {
  const { draft, setPatch, setDirty } = usePlantBasicDraft(plantDetail);
  const [errors, setErrors] = useState<PlantBasicErrorsVM | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseDraft = useMemo(() => mapPlantDetailToBasicDraft(plantDetail), [plantDetail]);
  const diff = useMemo(() => (draft ? buildPlantBasicDiff(baseDraft, draft) : {}), [baseDraft, draft]);
  const hasChanges = useMemo(() => Object.keys(diff).length > 0, [diff]);

  useEffect(() => {
    if (!editMode) {
      return;
    }

    setErrors(null);

    const timeout = window.setTimeout(() => {
      const element = document.getElementById("plant-name");
      element?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [editMode]);

  useEffect(() => {
    if (!editMode || !errors?.fields) {
      return;
    }

    const firstKey = fieldOrder.find((key) => errors.fields?.[key]);
    if (!firstKey) {
      return;
    }

    const targetId = fieldIdMap[firstKey as keyof PlantBasicDraftVM];
    const timeout = window.setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [editMode, errors]);

  const sectionValues = useMemo<NewPlantFormValues>(() => {
    if (!draft) {
      return {
        name: plantDetail.name ?? "",
      };
    }

    return {
      name: draft.name,
      soil: draft.soil ?? undefined,
      pot: draft.pot ?? undefined,
      position: draft.position ?? undefined,
      difficulty: draft.difficulty ?? undefined,
      watering_instructions: draft.watering_instructions ?? undefined,
      repotting_instructions: draft.repotting_instructions ?? undefined,
      propagation_instructions: draft.propagation_instructions ?? undefined,
      notes: draft.notes ?? undefined,
      icon_key: draft.icon_key ?? undefined,
      color_hex: draft.color_hex ?? undefined,
    };
  }, [draft, plantDetail.name]);

  const sectionErrors = useMemo<NewPlantFormErrors>(
    () => ({
      form: errors?.form,
      fields: errors?.fields ?? {},
    }),
    [errors]
  );

  const handleSectionChange = (patch: Partial<NewPlantFormValues>) => {
    const nextPatch: Partial<PlantBasicDraftVM> = {};

    if ("name" in patch) {
      nextPatch.name = patch.name ?? "";
    }
    if ("soil" in patch) {
      nextPatch.soil = patch.soil ?? null;
    }
    if ("pot" in patch) {
      nextPatch.pot = patch.pot ?? null;
    }
    if ("position" in patch) {
      nextPatch.position = patch.position ?? null;
    }
    if ("difficulty" in patch) {
      nextPatch.difficulty = patch.difficulty ?? null;
    }
    if ("watering_instructions" in patch) {
      nextPatch.watering_instructions = patch.watering_instructions ?? null;
    }
    if ("repotting_instructions" in patch) {
      nextPatch.repotting_instructions = patch.repotting_instructions ?? null;
    }
    if ("propagation_instructions" in patch) {
      nextPatch.propagation_instructions = patch.propagation_instructions ?? null;
    }
    if ("notes" in patch) {
      nextPatch.notes = patch.notes ?? null;
    }
    if ("icon_key" in patch) {
      nextPatch.icon_key = patch.icon_key ?? null;
    }
    if ("color_hex" in patch) {
      nextPatch.color_hex = patch.color_hex ?? null;
    }

    setPatch(nextPatch);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    if (!hasChanges) {
      return;
    }

    const validation = validatePlantBasicDraft(draft);
    if (validation) {
      setErrors(validation);
      if (validation.form) {
        toast.error(validation.form);
      }
      return;
    }

    setIsSubmitting(true);
    const response = await apiPut<PlantCardDetailDto>(`/api/plants/${plantId}`, diff);
    setIsSubmitting(false);

    if (response.error) {
      if (response.error.httpStatus === 400 && response.error.code === "validation_error") {
        const mapped = mapPlantBasicApiErrors(response.error.details);
        setErrors(mapped);
        if (mapped?.form) {
          toast.error(mapped.form);
        }
        return;
      }

      toast.error("Nie udalo sie zapisac zmian.");
      onApiError(response.error);
      return;
    }

    setErrors(null);
    setDirty(false);
    onEditModeChange(false);
    onSaved();
    toast.success("Zapisano zmiany.");
  };

  if (!draft) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        Ladowanie danych...
      </section>
    );
  }

  if (!editMode) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Podstawowe informacje</h2>
            <p className="text-sm text-neutral-600">Podglad najwazniejszych danych rosliny.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => onEditModeChange(true)}>
            Edytuj
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Nazwa</p>
            <p className="text-sm text-neutral-900">{getDisplayValue(plantDetail.name)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Poziom trudnosci</p>
            <p className="text-sm text-neutral-900">
              {plantDetail.difficulty ? difficultyLabels[plantDetail.difficulty] : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Gleba</p>
            <p className="text-sm text-neutral-900">{getDisplayValue(plantDetail.soil)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Doniczka</p>
            <p className="text-sm text-neutral-900">{getDisplayValue(plantDetail.pot)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Stanowisko</p>
            <p className="text-sm text-neutral-900">{getDisplayValue(plantDetail.position)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Podlewanie</p>
            <p className="whitespace-pre-wrap text-sm text-neutral-900">
              {getDisplayValue(plantDetail.watering_instructions)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Przesadzanie</p>
            <p className="whitespace-pre-wrap text-sm text-neutral-900">
              {getDisplayValue(plantDetail.repotting_instructions)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Rozmnazanie</p>
            <p className="whitespace-pre-wrap text-sm text-neutral-900">
              {getDisplayValue(plantDetail.propagation_instructions)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Notatki</p>
            <p className="whitespace-pre-wrap text-sm text-neutral-900">{getDisplayValue(plantDetail.notes)}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border border-neutral-200 bg-white p-6">
      {errors?.form ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errors.form}
        </div>
      ) : null}

      <PlantBasicsSection
        values={sectionValues}
        errors={sectionErrors}
        onChange={handleSectionChange}
        nameRequired={false}
      />
      <PlantInstructionsSection values={sectionValues} errors={sectionErrors} onChange={handleSectionChange} />

      <FormActions
        isSubmitting={isSubmitting}
        disableSubmit={!hasChanges}
        onCancel={() => {
          onEditModeChange(false);
        }}
      />
    </form>
  );
}
