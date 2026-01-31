import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiErrorViewModel } from "../../src/lib/api/api-client";
import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import { getInlineErrorMessage, handlePlantCardError } from "../../src/components/plants/PlantCard";

describe("PlantCard.getInlineErrorMessage", () => {
  it("maps fertilizing_disabled to user friendly message", () => {
    const error: ApiErrorViewModel = {
      code: "fertilizing_disabled",
      message: "ignored",
    };

    expect(getInlineErrorMessage(error)).toBe("Nawozenie jest wylaczone w tym sezonie.");
  });

  it("maps performed_at_in_future to user friendly message", () => {
    const error: ApiErrorViewModel = {
      code: "performed_at_in_future",
      message: "ignored",
    };

    expect(getInlineErrorMessage(error)).toBe("Nie mozna zapisac akcji z przyszla data.");
  });

  it("maps http 400 to generic action error", () => {
    const error: ApiErrorViewModel = {
      code: "http_400",
      message: "ignored",
      httpStatus: 400,
    };

    expect(getInlineErrorMessage(error)).toBe("Nie udalo sie zapisac akcji.");
  });

  it("falls back to error message when no mapping exists", () => {
    const error: ApiErrorViewModel = {
      code: "unknown_error",
      message: "Custom error",
    };

    expect(getInlineErrorMessage(error)).toBe("Custom error");
  });
});

describe("PlantCard.handlePlantCardError", () => {
  const setActionError = vi.fn();
  const setState = vi.fn();
  const toastError = vi.fn();
  const onCareActionCompleted = vi.fn();
  const scheduleState: PlantScheduleStateVM = { status: "ready", schedules: [], lastCheckedAt: 1 };

  beforeEach(() => {
    setActionError.mockClear();
    setState.mockClear();
    toastError.mockClear();
    onCareActionCompleted.mockClear();
    vi.stubGlobal("location", { href: "http://example.test/app" });
  });

  it("redirects to login on 401", () => {
    const error: ApiErrorViewModel = {
      code: "unauthorized",
      message: "Unauthorized",
      httpStatus: 401,
    };

    handlePlantCardError({
      error,
      scheduleState,
      plantId: "plant-1",
      setActionError,
      setState,
      onCareActionCompleted,
      toastError,
    });

    expect(window.location.href).toBe(
      "/auth/login?redirectTo=http%3A%2F%2Fexample.test%2Fapp",
    );
    expect(setActionError).not.toHaveBeenCalled();
  });

  it("handles 404 by updating error, notifying and refreshing", () => {
    const error: ApiErrorViewModel = {
      code: "not_found",
      message: "Not found",
      httpStatus: 404,
    };

    handlePlantCardError({
      error,
      scheduleState,
      plantId: "plant-1",
      setActionError,
      setState,
      onCareActionCompleted,
      toastError,
    });

    expect(setActionError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Nie znaleziono rosliny. Odswiezam liste.",
      }),
    );
    expect(onCareActionCompleted).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Nie znaleziono rosliny. Lista zostanie odswiezona.");
  });

  it("shows generic toast on 5xx and stores error", () => {
    const error: ApiErrorViewModel = {
      code: "server_error",
      message: "Server error",
      httpStatus: 500,
    };

    handlePlantCardError({
      error,
      scheduleState,
      plantId: "plant-1",
      setActionError,
      setState,
      onCareActionCompleted,
      toastError,
    });

    expect(toastError).toHaveBeenCalledWith("Cos poszlo nie tak. Sprobuj ponownie.");
    expect(setActionError).toHaveBeenCalledWith(error);
  });

  it("updates cache when schedule is missing or incomplete", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    const error: ApiErrorViewModel = {
      code: "schedule_missing",
      message: "Missing schedule",
    };

    handlePlantCardError({
      error,
      scheduleState,
      plantId: "plant-1",
      setActionError,
      setState,
      onCareActionCompleted,
      toastError,
    });

    expect(setState).toHaveBeenCalledWith("plant-1", {
      status: "missing",
      error,
      lastCheckedAt: 123,
    });
  });

  it("updates cache with error when fertilizing is disabled", () => {
    vi.spyOn(Date, "now").mockReturnValue(321);
    const error: ApiErrorViewModel = {
      code: "fertilizing_disabled",
      message: "Disabled",
    };

    handlePlantCardError({
      error,
      scheduleState,
      plantId: "plant-1",
      setActionError,
      setState,
      onCareActionCompleted,
      toastError,
    });

    expect(setState).toHaveBeenCalledWith("plant-1", {
      ...scheduleState,
      error,
      lastCheckedAt: 321,
    });
  });
});
