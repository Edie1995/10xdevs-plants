import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { PlantCardDetailDto } from "../../src/types";
import type { ApiErrorViewModel } from "../../src/lib/api/api-client";
import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import PlantView from "../../src/components/plants/PlantView";
import { usePlantDetailData } from "../../src/components/hooks/usePlantDetailData";
import { usePlantTabState } from "../../src/components/hooks/usePlantTabState";
import { usePlantSchedulesCache } from "../../src/components/hooks/usePlantSchedulesCache";
import { mapPlantDetailToHeader } from "../../src/lib/plants/plant-viewmodel";
import { toast } from "sonner";

const headerPropsRef = vi.hoisted(() => ({ current: null as any }));
const deleteDialogPropsRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("../../src/components/hooks/usePlantDetailData", () => ({
  usePlantDetailData: vi.fn(),
}));

vi.mock("../../src/components/hooks/usePlantTabState", () => ({
  usePlantTabState: vi.fn(),
}));

vi.mock("../../src/components/hooks/usePlantSchedulesCache", () => ({
  usePlantSchedulesCache: vi.fn(),
}));

vi.mock("../../src/lib/plants/plant-viewmodel", () => ({
  mapPlantDetailToHeader: vi.fn(),
}));

vi.mock("../../src/components/plants/PlantHeader", () => ({
  default: (props: any) => {
    headerPropsRef.current = props;
    return <div data-testid="PlantHeader" />;
  },
}));

vi.mock("../../src/components/plants/PlantTabs", () => ({
  default: vi.fn(() => <div data-testid="PlantTabs" />),
}));

vi.mock("../../src/components/plants/PlantTabPanel", () => ({
  default: vi.fn(() => <div data-testid="PlantTabPanel" />),
}));

vi.mock("../../src/components/plants/PlantBackLink", () => ({
  default: vi.fn(() => <div data-testid="PlantBackLink" />),
}));

vi.mock("../../src/components/plants/ConfirmDeletePlantDialog", () => ({
  default: (props: any) => {
    deleteDialogPropsRef.current = props;
    return (
      <button type="button" onClick={() => props.onDeleted()}>
        ConfirmDelete
      </button>
    );
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const usePlantDetailDataMock = vi.mocked(usePlantDetailData);
const usePlantTabStateMock = vi.mocked(usePlantTabState);
const usePlantSchedulesCacheMock = vi.mocked(usePlantSchedulesCache);
const mapPlantDetailToHeaderMock = vi.mocked(mapPlantDetailToHeader);

const buildPlantDetail = (overrides?: Partial<PlantCardDetailDto>) =>
  ({
    id: "plant-1",
    name: "Monstera",
    diseases: [],
    schedules: [],
    recent_care_logs: [],
    ...overrides,
  }) as PlantCardDetailDto;

const setWindowLocation = (href: string) => {
  const parsed = new URL(href);
  Object.defineProperty(window, "location", {
    value: {
      href: parsed.toString(),
      origin: parsed.origin,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    },
    writable: true,
  });
};

describe("PlantView", () => {
  beforeEach(() => {
    headerPropsRef.current = null;
    deleteDialogPropsRef.current = null;
    vi.clearAllMocks();
    setWindowLocation("http://localhost/app/plants/plant-1");

    usePlantTabStateMock.mockReturnValue({ tab: "basic", setTab: vi.fn() });
    usePlantSchedulesCacheMock.mockReturnValue({
      getState: vi.fn(() => ({ status: "ready", schedules: [] } as PlantScheduleStateVM)),
      getOrLoad: vi.fn().mockResolvedValue({ status: "ready", schedules: [] }),
      setState: vi.fn(),
    });
    usePlantDetailDataMock.mockReturnValue({
      data: buildPlantDetail(),
      error: null,
      isLoading: false,
      authRequired: false,
      notFound: false,
      refetch: vi.fn(),
    });
    mapPlantDetailToHeaderMock.mockReturnValue({ id: "plant-1", name: "Monstera" } as never);
  });

  it("renders empty state when plant is not found", () => {
    usePlantDetailDataMock.mockReturnValue({
      data: null,
      error: { code: "plant_not_found", message: "missing", httpStatus: 404 },
      isLoading: false,
      authRequired: false,
      notFound: true,
      refetch: vi.fn(),
    });

    render(<PlantView plantId="plant-1" initialUrl="http://localhost/app/plants/plant-1" />);

    expect(screen.getByText("Nie znaleziono rosliny.")).toBeInTheDocument();
  });

  it("renders a retry state for server errors", () => {
    const refetch = vi.fn();
    usePlantDetailDataMock.mockReturnValue({
      data: null,
      error: { code: "server_error", message: "oops", httpStatus: 500 },
      isLoading: false,
      authRequired: false,
      notFound: false,
      refetch,
    });

    render(<PlantView plantId="plant-1" initialUrl="http://localhost/app/plants/plant-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Sprobuj ponownie" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("redirects to login when auth is required", async () => {
    usePlantDetailDataMock.mockReturnValue({
      data: null,
      error: { code: "auth_required", message: "auth", httpStatus: 401 },
      isLoading: false,
      authRequired: true,
      notFound: false,
      refetch: vi.fn(),
    });

    render(<PlantView plantId="plant-1" initialUrl="http://localhost/app/plants/plant-1?tab=basic" />);

    await waitFor(() => {
      expect(window.location.href).toBe(
        "/auth/login?redirectTo=http%3A%2F%2Flocalhost%2Fapp%2Fplants%2Fplant-1%3Ftab%3Dbasic",
      );
    });
  });

  it("handles not found errors from child components", () => {
    const refetch = vi.fn();
    usePlantDetailDataMock.mockReturnValue({
      data: buildPlantDetail(),
      error: null,
      isLoading: false,
      authRequired: false,
      notFound: false,
      refetch,
    });

    render(<PlantView plantId="plant-1" initialUrl="http://localhost/app/plants/plant-1" />);

    const error: ApiErrorViewModel = {
      code: "plant_not_found",
      message: "missing",
      httpStatus: 404,
    };

    headerPropsRef.current?.onApiError(error);

    expect(toast.error).toHaveBeenCalledWith("Nie znaleziono rosliny. Odswiezam dane.");
    expect(refetch).toHaveBeenCalled();
  });

  it("marks schedule state as missing when schedule is missing", () => {
    const setState = vi.fn();
    usePlantSchedulesCacheMock.mockReturnValue({
      getState: vi.fn(() => ({ status: "ready", schedules: [] } as PlantScheduleStateVM)),
      getOrLoad: vi.fn(),
      setState,
    });

    render(<PlantView plantId="plant-1" initialUrl="http://localhost/app/plants/plant-1" />);

    const error: ApiErrorViewModel = {
      code: "schedule_missing",
      message: "missing",
      httpStatus: 400,
    };

    headerPropsRef.current?.onApiError(error);

    expect(setState).toHaveBeenCalledWith(
      "plant-1",
      expect.objectContaining({
        status: "missing",
        error,
        lastCheckedAt: expect.any(Number),
      }),
    );
  });

  it("updates schedule state when fertilizing is disabled", () => {
    const setState = vi.fn();
    const scheduleState: PlantScheduleStateVM = {
      status: "ready",
      schedules: [],
      lastCheckedAt: 123,
    };
    usePlantSchedulesCacheMock.mockReturnValue({
      getState: vi.fn(() => scheduleState),
      getOrLoad: vi.fn(),
      setState,
    });

    render(<PlantView plantId="plant-1" initialUrl="http://localhost/app/plants/plant-1" />);

    const error: ApiErrorViewModel = {
      code: "fertilizing_disabled",
      message: "disabled",
      httpStatus: 400,
    };

    headerPropsRef.current?.onApiError(error);

    expect(setState).toHaveBeenCalledWith(
      "plant-1",
      expect.objectContaining({
        status: "ready",
        schedules: [],
        error,
        lastCheckedAt: expect.any(Number),
      }),
    );
  });

  it("redirects to safe return path after delete", () => {
    render(
      <PlantView
        plantId="plant-1"
        initialUrl="http://localhost/app/plants/plant-1"
        returnTo="https://example.com/evil"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ConfirmDelete" }));

    expect(deleteDialogPropsRef.current?.plant).toEqual({ id: "plant-1", name: "Monstera" });
    expect(window.location.href).toBe("/app/plants");
  });
});
