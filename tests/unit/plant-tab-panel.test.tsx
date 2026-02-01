import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import type { PlantCardDetailDto } from "../../src/types";
import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import PlantTabPanel from "../../src/components/plants/PlantTabPanel";
import PlantBasicTab from "../../src/components/plants/PlantBasicTab";
import PlantScheduleTab from "../../src/components/plants/PlantScheduleTab";
import PlantDiseasesTab from "../../src/components/plants/PlantDiseasesTab";
import PlantHistoryTab from "../../src/components/plants/PlantHistoryTab";

vi.mock("../../src/components/plants/PlantBasicTab", () => ({
  default: vi.fn(() => <div data-testid="PlantBasicTab" />),
}));

vi.mock("../../src/components/plants/PlantScheduleTab", () => ({
  default: vi.fn(() => <div data-testid="PlantScheduleTab" />),
}));

vi.mock("../../src/components/plants/PlantDiseasesTab", () => ({
  default: vi.fn(() => <div data-testid="PlantDiseasesTab" />),
}));

vi.mock("../../src/components/plants/PlantHistoryTab", () => ({
  default: vi.fn(() => <div data-testid="PlantHistoryTab" />),
}));

const buildPlantDetail = (overrides?: Partial<PlantCardDetailDto>) =>
  ({
    id: "plant-1",
    name: "Monstera",
    diseases: [],
    schedules: [],
    recent_care_logs: [],
    ...overrides,
  }) as PlantCardDetailDto;

const scheduleState: PlantScheduleStateVM = { status: "ready", schedules: [] };
const PlantBasicTabMock = vi.mocked(PlantBasicTab);
const PlantScheduleTabMock = vi.mocked(PlantScheduleTab);
const PlantDiseasesTabMock = vi.mocked(PlantDiseasesTab);
const PlantHistoryTabMock = vi.mocked(PlantHistoryTab);

describe("PlantTabPanel", () => {
  beforeEach(() => {
    PlantBasicTabMock.mockClear();
    PlantScheduleTabMock.mockClear();
    PlantDiseasesTabMock.mockClear();
    PlantHistoryTabMock.mockClear();
  });

  it("renders loading placeholder when loading and detail is missing", () => {
    const { container } = render(
      <PlantTabPanel
        activeTab="basic"
        plantId="plant-1"
        plantDetail={null}
        isLoading
        onPlantUpdated={vi.fn()}
        onApiError={vi.fn()}
        scheduleState={scheduleState}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        basicEditMode={false}
        setBasicEditMode={vi.fn()}
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("returns null when detail is missing and not loading", () => {
    const { container } = render(
      <PlantTabPanel
        activeTab="basic"
        plantId="plant-1"
        plantDetail={null}
        isLoading={false}
        onPlantUpdated={vi.fn()}
        onApiError={vi.fn()}
        scheduleState={scheduleState}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        basicEditMode={false}
        setBasicEditMode={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders the basic tab with expected props", () => {
    const plantDetail = buildPlantDetail();
    const onApiError = vi.fn();
    const onPlantUpdated = vi.fn();
    const onEditModeChange = vi.fn();

    render(
      <PlantTabPanel
        activeTab="basic"
        plantId="plant-1"
        plantDetail={plantDetail}
        isLoading={false}
        onPlantUpdated={onPlantUpdated}
        onApiError={onApiError}
        scheduleState={scheduleState}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        basicEditMode
        setBasicEditMode={onEditModeChange}
      />
    );

    const props = PlantBasicTabMock.mock.calls[0]?.[0];
    expect(props).toMatchObject({
      plantId: "plant-1",
      plantDetail,
      editMode: true,
      onEditModeChange,
      onSaved: onPlantUpdated,
      onApiError,
    });
  });

  it("renders the schedule tab with expected props", () => {
    const plantDetail = buildPlantDetail();
    const loadSchedule = vi.fn();
    const setScheduleState = vi.fn();
    const onApiError = vi.fn();
    const onPlantUpdated = vi.fn();

    render(
      <PlantTabPanel
        activeTab="schedule"
        plantId="plant-1"
        plantDetail={plantDetail}
        isLoading={false}
        onPlantUpdated={onPlantUpdated}
        onApiError={onApiError}
        scheduleState={scheduleState}
        loadSchedule={loadSchedule}
        setScheduleState={setScheduleState}
        basicEditMode={false}
        setBasicEditMode={vi.fn()}
      />
    );

    const props = PlantScheduleTabMock.mock.calls[0]?.[0];
    expect(props).toMatchObject({
      plantId: "plant-1",
      scheduleState,
      loadSchedule,
      setScheduleState,
      onSaved: onPlantUpdated,
      onApiError,
    });
  });

  it("renders the diseases tab with expected props", () => {
    const diseases = [{ id: "disease-1", name: "Rdzawa plamistosc" }] as PlantCardDetailDto["diseases"];
    const plantDetail = buildPlantDetail({ diseases });
    const onApiError = vi.fn();

    render(
      <PlantTabPanel
        activeTab="diseases"
        plantId="plant-1"
        plantDetail={plantDetail}
        isLoading={false}
        onPlantUpdated={vi.fn()}
        onApiError={onApiError}
        scheduleState={scheduleState}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        basicEditMode={false}
        setBasicEditMode={vi.fn()}
      />
    );

    const props = PlantDiseasesTabMock.mock.calls[0]?.[0];
    expect(props).toMatchObject({
      plantId: "plant-1",
      initialDiseases: diseases,
      onApiError,
    });
  });

  it("renders the history tab with expected props", () => {
    const recentLogs = [
      { id: "log-1", action_type: "watering", performed_at: "2025-01-01" },
    ] as PlantCardDetailDto["recent_care_logs"];
    const plantDetail = buildPlantDetail({ recent_care_logs: recentLogs });
    const onApiError = vi.fn();

    render(
      <PlantTabPanel
        activeTab="history"
        plantId="plant-1"
        plantDetail={plantDetail}
        isLoading={false}
        onPlantUpdated={vi.fn()}
        onApiError={onApiError}
        scheduleState={scheduleState}
        loadSchedule={vi.fn()}
        setScheduleState={vi.fn()}
        basicEditMode={false}
        setBasicEditMode={vi.fn()}
      />
    );

    const props = PlantHistoryTabMock.mock.calls[0]?.[0];
    expect(props).toMatchObject({
      plantId: "plant-1",
      recentFromDetail: recentLogs,
      onApiError,
    });
  });
});
