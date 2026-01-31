import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ApiErrorViewModel } from "../../src/lib/api/api-client";
import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import PlantHeader from "../../src/components/plants/PlantHeader";
import { toast } from "sonner";

const quickActionsPropsRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("../../src/components/plants/QuickActions", () => ({
  default: (props: any) => {
    quickActionsPropsRef.current = props;
    return <button type="button">QuickActions</button>;
  },
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

const buildHeader = () => ({
  id: "plant-1",
  name: "Monstera",
  iconKey: null,
  colorHex: null,
  statusTone: "neutral",
  statusLabel: "OK",
  nextWateringDisplay: "Jutro",
  nextFertilizingDisplay: "Za tydzien",
});

const buildScheduleState = (overrides?: Partial<PlantScheduleStateVM>): PlantScheduleStateVM => ({
  status: "ready",
  schedules: [],
  ...overrides,
});

describe("PlantHeader", () => {
  it("renders schedule blocking message and navigates to schedule", () => {
    const onNavigateToSchedule = vi.fn();

    render(
      <PlantHeader
        plant={buildHeader()}
        scheduleState={buildScheduleState({ status: "missing" })}
        onLoadSchedule={vi.fn()}
        onCareActionCompleted={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onNavigateToSchedule={onNavigateToSchedule}
        onApiError={vi.fn()}
      />,
    );

    expect(screen.getByText("Ustaw harmonogram, aby korzystac z akcji pielegnacyjnych.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ustaw harmonogram" }));
    expect(onNavigateToSchedule).toHaveBeenCalled();
  });

  it("forwards action errors and shows inline message", async () => {
    const onApiError = vi.fn();
    const error: ApiErrorViewModel = {
      code: "fertilizing_disabled",
      message: "Nawozenie jest wylaczone w tym sezonie.",
      httpStatus: 400,
    };

    render(
      <PlantHeader
        plant={buildHeader()}
        scheduleState={buildScheduleState()}
        onLoadSchedule={vi.fn()}
        onCareActionCompleted={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onNavigateToSchedule={vi.fn()}
        onApiError={onApiError}
      />,
    );

    quickActionsPropsRef.current.onError(error);

    await waitFor(() => {
      expect(onApiError).toHaveBeenCalledWith(error);
      expect(screen.getByText("Nawozenie jest wylaczone w tym sezonie.")).toBeInTheDocument();
    });
  });

  it("shows toast when schedule is missing", async () => {
    const error: ApiErrorViewModel = {
      code: "schedule_missing",
      message: "Ustaw harmonogram, aby korzystac z akcji.",
      httpStatus: 400,
    };

    render(
      <PlantHeader
        plant={buildHeader()}
        scheduleState={buildScheduleState()}
        onLoadSchedule={vi.fn()}
        onCareActionCompleted={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onNavigateToSchedule={vi.fn()}
        onApiError={vi.fn()}
      />,
    );

    quickActionsPropsRef.current.onError(error);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("Ustaw harmonogram, aby korzystac z akcji.");
    });
  });

  it("triggers edit and delete actions", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <PlantHeader
        plant={buildHeader()}
        scheduleState={buildScheduleState()}
        onLoadSchedule={vi.fn()}
        onCareActionCompleted={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        onNavigateToSchedule={vi.fn()}
        onApiError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    fireEvent.click(screen.getByRole("button", { name: "Usun" }));

    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
