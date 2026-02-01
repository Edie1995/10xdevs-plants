import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import PlantScheduleTab from "../../src/components/plants/PlantScheduleTab";
import { usePlantScheduleEditor } from "../../src/components/hooks/usePlantScheduleEditor";
import {
  buildUpdateSchedulesCommand,
  getScheduleStatusMessage,
  mapScheduleApiErrors,
  validateScheduleEditor,
} from "../../src/lib/plants/plant-schedule-viewmodel";
import { apiPut } from "../../src/lib/api/api-client";
import { toast } from "sonner";

vi.mock("../../src/components/hooks/usePlantScheduleEditor", () => ({
  usePlantScheduleEditor: vi.fn(),
}));

vi.mock("../../src/lib/plants/plant-schedule-viewmodel", () => ({
  buildUpdateSchedulesCommand: vi.fn(),
  getScheduleStatusMessage: vi.fn(),
  mapScheduleApiErrors: vi.fn(),
  validateScheduleEditor: vi.fn(),
}));

vi.mock("../../src/lib/api/api-client", () => ({
  apiPut: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const usePlantScheduleEditorMock = vi.mocked(usePlantScheduleEditor);
const validateScheduleEditorMock = vi.mocked(validateScheduleEditor);
const buildUpdateSchedulesCommandMock = vi.mocked(buildUpdateSchedulesCommand);
const getScheduleStatusMessageMock = vi.mocked(getScheduleStatusMessage);
const mapScheduleApiErrorsMock = vi.mocked(mapScheduleApiErrors);
const apiPutMock = vi.mocked(apiPut);

const buildEditor = () => ({
  values: {
    spring: { season: "spring", watering_interval: 7, fertilizing_interval: 14 },
    summer: { season: "summer", watering_interval: 7, fertilizing_interval: 14 },
    autumn: { season: "autumn", watering_interval: 7, fertilizing_interval: 14 },
    winter: { season: "winter", watering_interval: 7, fertilizing_interval: 14 },
  },
});

const buildScheduleState = (overrides?: Partial<PlantScheduleStateVM>): PlantScheduleStateVM => ({
  status: "ready",
  schedules: [],
  ...overrides,
});

describe("PlantScheduleTab", () => {
  beforeEach(() => {
    usePlantScheduleEditorMock.mockReturnValue({
      editor: buildEditor(),
      setSeasonPatch: vi.fn(),
      reset: vi.fn(),
      ensureLoaded: vi.fn(),
      isLoading: false,
    });
    validateScheduleEditorMock.mockReturnValue(null);
    buildUpdateSchedulesCommandMock.mockReturnValue({ schedules: [] });
    getScheduleStatusMessageMock.mockReturnValue(null);
    mapScheduleApiErrorsMock.mockReturnValue(null);
    apiPutMock.mockReset();
  });

  it("shows server error and retries loading", () => {
    const loadSchedule = vi.fn();
    const scheduleState = buildScheduleState({
      status: "error",
      error: { message: "Oops" },
    });

    render(
      <PlantScheduleTab
        plantId="plant-1"
        scheduleState={scheduleState}
        loadSchedule={loadSchedule}
        setScheduleState={vi.fn()}
        onSaved={vi.fn()}
        onApiError={vi.fn()}
      />
    );

    expect(screen.getByText("Oops")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sprobuj ponownie" }));
    expect(loadSchedule).toHaveBeenCalled();
  });

  it("loads schedule when starting edit for unknown state", () => {
    const ensureLoaded = vi.fn();
    usePlantScheduleEditorMock.mockReturnValue({
      editor: buildEditor(),
      setSeasonPatch: vi.fn(),
      reset: vi.fn(),
      ensureLoaded,
      isLoading: false,
    });
    const scheduleState = buildScheduleState({ status: "unknown" });

    render(
      <PlantScheduleTab
        plantId="plant-1"
        scheduleState={scheduleState}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        onSaved={vi.fn()}
        onApiError={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(ensureLoaded).toHaveBeenCalled();
  });

  it("shows validation errors and blocks submit", async () => {
    validateScheduleEditorMock.mockReturnValue({
      form: "Blad walidacji",
      seasons: {},
    });

    render(
      <PlantScheduleTab
        plantId="plant-1"
        scheduleState={buildScheduleState()}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        onSaved={vi.fn()}
        onApiError={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    const form = screen.getByRole("button", { name: "Zapisz" }).closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Popraw bledy w harmonogramie.");
    });
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it("submits schedules and updates state", async () => {
    apiPutMock.mockResolvedValue({
      data: [
        { season: "spring", watering_interval: 7, fertilizing_interval: 14 },
        { season: "summer", watering_interval: 7, fertilizing_interval: 14 },
        { season: "autumn", watering_interval: 7, fertilizing_interval: 14 },
        { season: "winter", watering_interval: 7, fertilizing_interval: 14 },
      ],
      error: null,
      httpStatus: 200,
      response: null,
    });
    buildUpdateSchedulesCommandMock.mockReturnValue({ schedules: [{ season: "spring" }] });
    const setScheduleState = vi.fn();
    const onSaved = vi.fn();

    render(
      <PlantScheduleTab
        plantId="plant-1"
        scheduleState={buildScheduleState()}
        loadSchedule={vi.fn()}
        setScheduleState={setScheduleState}
        onSaved={onSaved}
        onApiError={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    const form = screen.getByRole("button", { name: "Zapisz" }).closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith("/api/plants/plant-1/schedules", { schedules: [{ season: "spring" }] });
      expect(setScheduleState).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ready",
          schedules: expect.any(Array),
          lastCheckedAt: expect.any(Number),
        })
      );
      expect(onSaved).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Harmonogram zapisany.");
    });
  });
});
