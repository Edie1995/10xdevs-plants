import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { DiseaseCommand, SeasonalScheduleCommand, Season } from "../../types";
import type { NewPlantFormErrors, NewPlantFormValues } from "../../lib/plants/new-plant-viewmodel";
import { useCreatePlant } from "../hooks/useCreatePlant";
import NewPlantForm from "./NewPlantForm";
import NewPlantHeader from "./NewPlantHeader";
import { toast } from "sonner";

interface NewPlantViewProps {
  initialUrl: string;
}

const EMPTY_ERRORS: NewPlantFormErrors = {};

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

const createDefaultSchedules = (): SeasonalScheduleCommand[] =>
  SEASONS.map((season) => ({
    season,
    watering_interval: 0,
    fertilizing_interval: 0,
  }));

export default function NewPlantView({ initialUrl }: NewPlantViewProps) {
  const [values, setValues] = useState<NewPlantFormValues>({ name: "" });
  const [errors, setErrors] = useState<NewPlantFormErrors>(EMPTY_ERRORS);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const { isSubmitting, authRequired, submit } = useCreatePlant();

  useEffect(() => {
    if (!authRequired) {
      return;
    }

    const redirectTo = encodeURIComponent(initialUrl);
    window.location.href = `/auth/login?redirectTo=${redirectTo}`;
  }, [authRequired, initialUrl]);

  const handleChange = (patch: Partial<NewPlantFormValues>) => {
    setValues((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleToggleSchedules = (enabled: boolean) => {
    setValues((prev) => ({
      ...prev,
      schedules: enabled ? createDefaultSchedules() : undefined,
    }));
    if (!enabled) {
      setErrors((prev) => ({
        ...prev,
        schedules: {},
      }));
      setScheduleError(null);
    }
  };

  const handleToggleDiseases = (enabled: boolean) => {
    setValues((prev) => ({
      ...prev,
      diseases: enabled ? [] : undefined,
    }));
    if (!enabled) {
      setErrors((prev) => ({
        ...prev,
        diseases: [],
      }));
    }
  };

  const handleAddDisease = () => {
    setValues((prev) => ({
      ...prev,
      diseases: [...(prev.diseases ?? []), { name: "", symptoms: "", advice: "" }],
    }));
  };

  const handleRemoveDisease = (index: number) => {
    setValues((prev) => ({
      ...prev,
      diseases: prev.diseases?.filter((_, diseaseIndex) => diseaseIndex !== index) ?? [],
    }));
  };

  const handleUpdateDisease = (index: number, patch: Partial<DiseaseCommand>) => {
    setValues((prev) => ({
      ...prev,
      diseases:
        prev.diseases?.map((disease, diseaseIndex) =>
          diseaseIndex === index ? { ...disease, ...patch } : disease
        ) ?? [],
    }));
  };

  const handleUpdateSchedule = (season: Season, patch: Partial<SeasonalScheduleCommand>) => {
    setValues((prev) => {
      const schedules = prev.schedules ?? createDefaultSchedules();
      const nextSchedules = schedules.map((entry) =>
        entry.season === season ? { ...entry, ...patch, season } : entry
      );
      return {
        ...prev,
        schedules: nextSchedules,
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors(EMPTY_ERRORS);
    setScheduleError(null);
    const { result, errors: fieldErrors } = await submit(values);

    if (fieldErrors) {
      setErrors(fieldErrors);
      return;
    }

    if (result.error) {
      if (result.error.httpStatus === 403) {
        toast.error("Brak dostepu do zasobu.");
        return;
      }

      if (result.error.httpStatus === 409 || result.error.code === "duplicate_season") {
        setScheduleError("Harmonogram zawiera powtorzone sezony.");
        toast.error("Harmonogram zawiera powtorzone sezony.");
        return;
      }

      if (result.error.httpStatus && result.error.httpStatus >= 500) {
        toast.error("Nie udalo sie zapisac rosliny.");
        return;
      }

      toast.error(result.error.message || "Nie udalo sie zapisac rosliny.");
      return;
    }

    if (result.data) {
      toast.success("Roslina zostala zapisana.");
      window.location.href = `/app/plants/${result.data.id}?tab=basic`;
    }
  };

  const handleCancel = () => {
    window.location.href = "/app/plants";
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <NewPlantHeader />
      <NewPlantForm
        values={values}
        errors={errors}
        isSubmitting={isSubmitting}
        scheduleError={scheduleError}
        onChange={handleChange}
        onToggleSchedules={handleToggleSchedules}
        onToggleDiseases={handleToggleDiseases}
        onAddDisease={handleAddDisease}
        onRemoveDisease={handleRemoveDisease}
        onUpdateDisease={handleUpdateDisease}
        onUpdateSchedule={handleUpdateSchedule}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </main>
  );
}
