import type { FormEvent } from "react";

import type { DiseaseCommand, SeasonalScheduleCommand, Season } from "../../types";
import type { NewPlantFormErrors, NewPlantFormValues } from "../../lib/plants/new-plant-viewmodel";
import PlantBasicsSection from "./PlantBasicsSection";
import PlantInstructionsSection from "./PlantInstructionsSection";
import PlantIdentificationSection from "./PlantIdentificationSection";
import PlantSchedulesSection from "./PlantSchedulesSection";
import PlantDiseasesSection from "./PlantDiseasesSection";
import FormActions from "./FormActions.tsx";

interface NewPlantFormProps {
  values: NewPlantFormValues;
  errors: NewPlantFormErrors;
  isSubmitting: boolean;
  onChange: (patch: Partial<NewPlantFormValues>) => void;
  onToggleSchedules: (enabled: boolean) => void;
  onToggleDiseases: (enabled: boolean) => void;
  onAddDisease: () => void;
  onRemoveDisease: (index: number) => void;
  onUpdateDisease: (index: number, patch: Partial<DiseaseCommand>) => void;
  onUpdateSchedule: (season: Season, patch: Partial<SeasonalScheduleCommand>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  scheduleError?: string | null;
}

export default function NewPlantForm({
  values,
  errors,
  isSubmitting,
  onChange,
  onToggleSchedules,
  onToggleDiseases,
  onAddDisease,
  onRemoveDisease,
  onUpdateDisease,
  onUpdateSchedule,
  onSubmit,
  onCancel,
  scheduleError,
}: NewPlantFormProps) {
  return (
    <form className="mt-8 space-y-6" onSubmit={onSubmit} data-test-id="new-plant-form">
      {errors.form ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors.form}
        </div>
      ) : null}

      <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <PlantBasicsSection values={values} errors={errors} onChange={onChange} />
        <PlantInstructionsSection values={values} errors={errors} onChange={onChange} />
        <PlantIdentificationSection values={values} errors={errors} onChange={onChange} />
        <PlantSchedulesSection
          schedules={values.schedules}
          errors={errors.schedules}
          errorMessage={scheduleError ?? undefined}
          onToggleSchedules={onToggleSchedules}
          onUpdateSchedule={onUpdateSchedule}
        />
        <PlantDiseasesSection
          diseases={values.diseases}
          errors={errors.diseases}
          onToggleDiseases={onToggleDiseases}
          onAddDisease={onAddDisease}
          onRemoveDisease={onRemoveDisease}
          onUpdateDisease={onUpdateDisease}
        />
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
