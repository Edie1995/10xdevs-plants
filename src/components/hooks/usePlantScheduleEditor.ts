import { useCallback, useEffect, useState } from "react";

import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";
import type { Season } from "../../types";
import { buildScheduleEditor, type PlantScheduleEditorVM } from "../../lib/plants/plant-schedule-viewmodel";

export const usePlantScheduleEditor = (
  scheduleState: PlantScheduleStateVM,
  loadSchedule: () => Promise<PlantScheduleStateVM>
) => {
  const [editor, setEditor] = useState<PlantScheduleEditorVM>(() => buildScheduleEditor(scheduleState.schedules));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (scheduleState.status === "loading") {
      return;
    }
    setEditor(buildScheduleEditor(scheduleState.schedules));
  }, [scheduleState.schedules, scheduleState.status]);

  const ensureLoaded = useCallback(async () => {
    if (scheduleState.status !== "unknown") {
      return scheduleState;
    }

    setIsLoading(true);
    const next = await loadSchedule();
    setIsLoading(false);
    setEditor(buildScheduleEditor(next.schedules));
    return next;
  }, [loadSchedule, scheduleState]);

  const setSeasonPatch = useCallback(
    (season: Season, patch: Partial<{ watering_interval: number; fertilizing_interval: number }>) => {
      setEditor((prev) => {
        const next = prev ?? buildScheduleEditor(scheduleState.schedules);
        return {
          values: {
            ...next.values,
            [season]: {
              ...next.values[season],
              ...patch,
              season,
            },
          },
          dirty: true,
        };
      });
    },
    [scheduleState.schedules]
  );

  const reset = useCallback(() => {
    setEditor(buildScheduleEditor(scheduleState.schedules));
  }, [scheduleState.schedules]);

  return {
    editor,
    setEditor,
    setSeasonPatch,
    reset,
    ensureLoaded,
    isLoading,
  };
};
