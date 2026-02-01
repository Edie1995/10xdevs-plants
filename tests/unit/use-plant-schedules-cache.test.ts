import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { ApiResult } from "../../src/lib/api/api-client";
import type { SeasonalScheduleDto } from "../../src/types";

const apiGetMock = vi.fn();

vi.mock("../../src/lib/api/api-client", () => ({
  apiGet: apiGetMock,
}));

const buildResult = <T>(payload: Partial<ApiResult<T>>): ApiResult<T> => ({
  data: null,
  error: null,
  httpStatus: 200,
  response: null,
  ...payload,
});

const loadHook = async () => {
  const module = await import("../../src/components/hooks/usePlantSchedulesCache");
  return module.usePlantSchedulesCache;
};

describe("usePlantSchedulesCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    apiGetMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("returns unknown state by default", async () => {
    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    expect(result.current.getState("plant-1")).toEqual({ status: "unknown" });
  });

  it("returns cached state while loading without new request", async () => {
    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    act(() => {
      result.current.setState("plant-1", { status: "loading", lastCheckedAt: Date.now() });
    });

    const current = await result.current.getOrLoad("plant-1");

    expect(current.status).toBe("loading");
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("reuses fresh cache within TTL", async () => {
    const schedules: SeasonalScheduleDto[] = [
      {
        id: "schedule-1",
        season_start_at: "2025-01-01",
        season_end_at: "2025-12-31",
        watering_every_days: 7,
        fertilizing_every_days: 30,
      },
    ];
    apiGetMock.mockResolvedValue(
      buildResult<SeasonalScheduleDto[]>({
        data: schedules,
      })
    );

    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    vi.setSystemTime(new Date("2025-01-01T00:03:00Z"));

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it("returns missing when api returns empty array", async () => {
    apiGetMock.mockResolvedValue(
      buildResult<SeasonalScheduleDto[]>({
        data: [],
      })
    );

    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    expect(result.current.getState("plant-1")).toMatchInlineSnapshot(`
      {
        "lastCheckedAt": 1735689600000,
        "schedules": [],
        "status": "missing",
      }
    `);
  });

  it("returns ready when api returns schedules", async () => {
    const schedules: SeasonalScheduleDto[] = [
      {
        id: "schedule-1",
        season_start_at: "2025-01-01",
        season_end_at: "2025-12-31",
        watering_every_days: 7,
        fertilizing_every_days: 30,
      },
    ];
    apiGetMock.mockResolvedValue(
      buildResult<SeasonalScheduleDto[]>({
        data: schedules,
      })
    );

    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    expect(result.current.getState("plant-1")).toMatchInlineSnapshot(`
      {
        "lastCheckedAt": 1735689600000,
        "schedules": [
          {
            "fertilizing_every_days": 30,
            "id": "schedule-1",
            "season_end_at": "2025-12-31",
            "season_start_at": "2025-01-01",
            "watering_every_days": 7,
          },
        ],
        "status": "ready",
      }
    `);
  });

  it("returns incomplete when api responds with schedule_incomplete", async () => {
    apiGetMock.mockResolvedValue(
      buildResult<SeasonalScheduleDto[]>({
        data: null,
        error: { code: "schedule_incomplete", message: "Incomplete" },
      })
    );

    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    expect(result.current.getState("plant-1")).toMatchInlineSnapshot(`
      {
        "error": {
          "code": "schedule_incomplete",
          "message": "Incomplete",
        },
        "lastCheckedAt": 1735689600000,
        "status": "incomplete",
      }
    `);
  });

  it("returns missing when api responds with 404", async () => {
    apiGetMock.mockResolvedValue(
      buildResult<SeasonalScheduleDto[]>({
        data: null,
        error: { code: "not_found", message: "Not found", httpStatus: 404 },
      })
    );

    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    expect(result.current.getState("plant-1")).toMatchInlineSnapshot(`
      {
        "error": {
          "code": "not_found",
          "httpStatus": 404,
          "message": "Not found",
        },
        "lastCheckedAt": 1735689600000,
        "status": "missing",
      }
    `);
  });

  it("returns error for other api errors", async () => {
    apiGetMock.mockResolvedValue(
      buildResult<SeasonalScheduleDto[]>({
        data: null,
        error: { code: "http_500", message: "Server error", httpStatus: 500 },
      })
    );

    const usePlantSchedulesCache = await loadHook();
    const { result } = renderHook(() => usePlantSchedulesCache());

    await act(async () => {
      await result.current.getOrLoad("plant-1");
    });

    expect(result.current.getState("plant-1")).toMatchInlineSnapshot(`
      {
        "error": {
          "code": "http_500",
          "httpStatus": 500,
          "message": "Server error",
        },
        "lastCheckedAt": 1735689600000,
        "status": "error",
      }
    `);
  });
});
