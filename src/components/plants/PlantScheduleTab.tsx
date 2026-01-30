import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { SeasonalScheduleDto, Season } from "../../types";
import type { ApiErrorViewModel } from "../../lib/api/api-client";
import { apiPut } from "../../lib/api/api-client";
import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import {
  buildUpdateSchedulesCommand,
  getScheduleStatusMessage,
  mapScheduleApiErrors,
  validateScheduleEditor,
} from "../../lib/plants/plant-schedule-viewmodel";
import { usePlantScheduleEditor } from "../hooks/usePlantScheduleEditor";
import { Button } from "../ui/button";
import FormActions from "./FormActions";
import SeasonScheduleRow from "./SeasonScheduleRow";

export interface PlantScheduleTabProps {
  plantId: string;
  scheduleState: PlantScheduleStateVM;
  loadSchedule: () => Promise<PlantScheduleStateVM>;
  setScheduleState: (next: PlantScheduleStateVM) => void;
  onSaved: () => void;
  onApiError: (error: ApiErrorViewModel) => void;
}

const seasons: Season[] = ["spring", "summer", "autumn", "winter"];

const seasonLabels: Record<Season, string> = {
  spring: "Wiosna",
  summer: "Lato",
  autumn: "Jesien",
  winter: "Zima",
};

const getFirstScheduleErrorId = (errors: ReturnType<typeof validateScheduleEditor>) => {
  if (!errors?.seasons) {
    return null;
  }

  for (const season of seasons) {
    const seasonErrors = errors.seasons[season];
    if (!seasonErrors) {
      continue;
    }
    if (seasonErrors.watering_interval) {
      return `watering-${season}`;
    }
    if (seasonErrors.fertilizing_interval) {
      return `fertilizing-${season}`;
    }
  }

  return null;
};

const getScheduleValue = (schedules: SeasonalScheduleDto[] | undefined, season: Season) =>
  schedules?.find((entry) => entry.season === season);

export default function PlantScheduleTab({
  plantId,
  scheduleState,
  loadSchedule,
  setScheduleState,
  onSaved,
  onApiError,
}: PlantScheduleTabProps) {
  const { editor, setSeasonPatch, reset, ensureLoaded, isLoading } = usePlantScheduleEditor(
    scheduleState,
    loadSchedule,
  );
  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateScheduleEditor>>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (scheduleState.status === "unknown") {
      void ensureLoaded();
    }
  }, [ensureLoaded, scheduleState.status]);

  useEffect(() => {
    if (!editMode || !errors) {
      return;
    }
    const targetId = getFirstScheduleErrorId(errors);
    if (!targetId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      const element = document.getElementById(targetId);
      element?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [editMode, errors]);

  const statusMessage = useMemo(() => getScheduleStatusMessage(scheduleState), [scheduleState]);
  const schedules = scheduleState.schedules ?? [];

  const handleStartEdit = () => {
    setEditMode(true);
    setErrors(null);
    if (scheduleState.status === "unknown") {
      void ensureLoaded();
    }
  };

  const handleCancel = () => {
    reset();
    setErrors(null);
    setEditMode(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validation = validateScheduleEditor(editor);
    if (validation) {
      setErrors(validation);
      toast.error("Popraw bledy w harmonogramie.");
      return;
    }

    setIsSubmitting(true);
    const response = await apiPut<SeasonalScheduleDto[]>(
      `/api/plants/${plantId}/schedules`,
      buildUpdateSchedulesCommand(editor),
    );
    setIsSubmitting(false);

    if (response.error) {
      if (response.error.httpStatus === 400 || response.error.httpStatus === 409) {
        const mapped = mapScheduleApiErrors(response.error);
        setErrors(mapped);
        if (mapped?.form) {
          toast.error(mapped.form);
        } else {
          toast.error("Nie udalo sie zapisac harmonogramu.");
        }
        return;
      }

      onApiError(response.error);
      toast.error("Nie udalo sie zapisac harmonogramu.");
      return;
    }

    const nextSchedules = response.data ?? schedules;
    setScheduleState({
      status: "ready",
      schedules: nextSchedules,
      lastCheckedAt: Date.now(),
    });
    setErrors(null);
    setEditMode(false);
    onSaved();
    toast.success("Harmonogram zapisany.");
  };

  if (isLoading || scheduleState.status === "loading") {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-neutral-200" />
        </div>
      </section>
    );
  }

  if (!editMode) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Harmonogram sezonowy</h2>
            <p className="text-sm text-neutral-600">Podglad cykli podlewania i nawozenia.</p>
          </div>
          <Button type="button" variant="outline" onClick={handleStartEdit}>
            {scheduleState.status === "missing" || scheduleState.status === "incomplete"
              ? "Uzupelnij harmonogram"
              : "Edytuj"}
          </Button>
        </div>

        {statusMessage ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {statusMessage}
          </div>
        ) : null}

        {scheduleState.status === "error" ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <div>{scheduleState.error?.message ?? "Nie udalo sie pobrac harmonogramu."}</div>
            <Button type="button" variant="outline" className="mt-2" onClick={() => loadSchedule()}>
              Sprobuj ponownie
            </Button>
          </div>
        ) : null}

        {schedules.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="hidden rounded-lg border border-neutral-200 text-sm md:block">
              <div className="grid grid-cols-[140px_1fr_1fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <span>Sezon</span>
                <span>Podlewanie (dni)</span>
                <span>Nawozenie (dni)</span>
              </div>
              {seasons.map((season) => {
                const value = getScheduleValue(schedules, season);
                return (
                  <div
                    key={season}
                    className="grid grid-cols-[140px_1fr_1fr] gap-3 border-b border-neutral-100 px-4 py-2 last:border-b-0"
                  >
                    <span className="text-sm font-medium text-neutral-700">{seasonLabels[season]}</span>
                    <span className="text-sm text-neutral-900">{value?.watering_interval ?? 0}</span>
                    <span className="text-sm text-neutral-900">{value?.fertilizing_interval ?? 0}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3 md:hidden">
              {seasons.map((season) => {
                const value = getScheduleValue(schedules, season);
                return (
                  <div key={season} className="rounded-lg border border-neutral-200 p-3">
                    <div className="text-sm font-medium text-neutral-700">{seasonLabels[season]}</div>
                    <div className="mt-2 text-sm text-neutral-600">
                      Podlewanie: <span className="text-neutral-900">{value?.watering_interval ?? 0}</span> dni
                    </div>
                    <div className="text-sm text-neutral-600">
                      Nawozenie: <span className="text-neutral-900">{value?.fertilizing_interval ?? 0}</span> dni
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Edytuj harmonogram</h2>
        <p className="text-sm text-neutral-600">Wypelnij wszystkie sezony (0 wylacza nawozenie).</p>
      </div>

      {errors?.form ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errors.form}
        </div>
      ) : null}

      <div className="hidden space-y-3 md:block">
        {seasons.map((season) => (
          <SeasonScheduleRow
            key={season}
            season={season}
            seasonLabel={seasonLabels[season]}
            value={editor.values[season]}
            error={errors?.seasons?.[season]}
            onChange={(patch) => setSeasonPatch(season, patch)}
          />
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {seasons.map((season) => (
          <details key={season} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-neutral-700">{seasonLabels[season]}</summary>
            <div className="mt-3 space-y-3">
              <SeasonScheduleRow
                season={season}
                seasonLabel={seasonLabels[season]}
                value={editor.values[season]}
                error={errors?.seasons?.[season]}
                onChange={(patch) => setSeasonPatch(season, patch)}
              />
            </div>
          </details>
        ))}
      </div>

      <FormActions isSubmitting={isSubmitting} onCancel={handleCancel} />
    </form>
  );
}
