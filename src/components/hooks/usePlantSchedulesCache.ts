import { useCallback, useEffect, useState } from "react";

import { apiGet } from "../../lib/api/api-client";
import type { SeasonalScheduleDto } from "../../types";
import type { PlantScheduleStateVM } from "../../lib/dashboard/dashboard-viewmodel";

const CACHE_TTL_MS = 5 * 60 * 1000;
const scheduleCache = new Map<string, PlantScheduleStateVM>();
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

const getCached = (plantId: string): PlantScheduleStateVM => scheduleCache.get(plantId) ?? { status: "unknown" };

const setCached = (plantId: string, next: PlantScheduleStateVM) => {
  scheduleCache.set(plantId, next);
  notify();
};

const isCacheFresh = (state: PlantScheduleStateVM) => {
  if (!state.lastCheckedAt) {
    return false;
  }

  return Date.now() - state.lastCheckedAt < CACHE_TTL_MS;
};

const mapScheduleResponse = (data: SeasonalScheduleDto[] | null): PlantScheduleStateVM => {
  if (!data || data.length === 0) {
    return {
      status: "missing",
      schedules: [],
      lastCheckedAt: Date.now(),
    };
  }

  return {
    status: "ready",
    schedules: data,
    lastCheckedAt: Date.now(),
  };
};

export const usePlantSchedulesCache = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getState = useCallback((plantId: string) => getCached(plantId), []);

  const setState = useCallback((plantId: string, next: PlantScheduleStateVM) => {
    setCached(plantId, next);
  }, []);

  const getOrLoad = useCallback(async (plantId: string) => {
    const current = getCached(plantId);
    if (current.status !== "unknown" && current.status !== "loading" && isCacheFresh(current)) {
      return current;
    }

    if (current.status === "loading") {
      return current;
    }

    setCached(plantId, { status: "loading", lastCheckedAt: Date.now() });

    const result = await apiGet<SeasonalScheduleDto[]>(`/api/plants/${plantId}/schedules`);

    if (result.error) {
      if (result.error.code === "schedule_incomplete") {
        const nextState: PlantScheduleStateVM = {
          status: "incomplete",
          error: result.error,
          lastCheckedAt: Date.now(),
        };
        setCached(plantId, nextState);
        return nextState;
      }

      if (result.error.httpStatus === 404) {
        const nextState: PlantScheduleStateVM = {
          status: "missing",
          error: result.error,
          lastCheckedAt: Date.now(),
        };
        setCached(plantId, nextState);
        return nextState;
      }

      const nextState: PlantScheduleStateVM = {
        status: "error",
        error: result.error,
        lastCheckedAt: Date.now(),
      };
      setCached(plantId, nextState);
      return nextState;
    }

    const nextState = mapScheduleResponse(result.data ?? null);
    setCached(plantId, nextState);
    return nextState;
  }, []);

  return {
    getState,
    setState,
    getOrLoad,
  };
};
