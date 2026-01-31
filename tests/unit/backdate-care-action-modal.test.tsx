import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { ApiErrorViewModel } from "../../src/lib/api/api-client";
import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import BackdateCareActionModal from "../../src/components/plants/BackdateCareActionModal";
import { apiPost } from "../../src/lib/api/api-client";
import { isFertilizingDisabledForDate } from "../../src/lib/dashboard/schedule.utils";
import { toast } from "sonner";

const apiPostMock = vi.mocked(apiPost);
const isFertilizingDisabledForDateMock = vi.mocked(isFertilizingDisabledForDate);

vi.mock("../../src/lib/api/api-client", () => ({
  apiPost: vi.fn(),
}));

vi.mock("../../src/lib/dashboard/schedule.utils", () => ({
  isFertilizingDisabledForDate: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderModal = ({
  actionType,
  scheduleState,
  onOpenChange,
  onSubmitted,
  onError,
}: {
  actionType: "watering" | "fertilizing";
  scheduleState: PlantScheduleStateVM;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
  onError: (error: ApiErrorViewModel) => void;
}) =>
  render(
    <BackdateCareActionModal
      open
      actionType={actionType}
      plantId="plant-1"
      scheduleState={scheduleState}
      onOpenChange={onOpenChange}
      onSubmitted={onSubmitted}
      onError={onError}
    />
  );

describe("BackdateCareActionModal", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    isFertilizingDisabledForDateMock.mockReset().mockReturnValue(false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  it("shows validation error for invalid date format", () => {
    renderModal({
      actionType: "watering",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      onError: vi.fn(),
    });

    const dateInput = screen.getByLabelText("Data") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2025-02-30" } });

    const form = screen.getByRole("button", { name: "Zapisz" }).closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    expect(screen.getByText("Podaj poprawna date.")).toBeInTheDocument();
  });

  it("blocks future dates", () => {
    renderModal({
      actionType: "watering",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      onError: vi.fn(),
    });

    const dateInput = screen.getByLabelText("Data") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2025-01-02" } });

    const form = screen.getByRole("button", { name: "Zapisz" }).closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    expect(screen.getByText("Nie mozna wybrac przyszlej daty.")).toBeInTheDocument();
  });

  it("requires schedule when status is missing", () => {
    renderModal({
      actionType: "watering",
      scheduleState: { status: "missing", schedules: [] },
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      onError: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(screen.getByText("Ustaw harmonogram, aby korzystac z akcji.")).toBeInTheDocument();
  });

  it("blocks fertilizing when disabled for selected date", () => {
    isFertilizingDisabledForDateMock.mockReturnValue(true);
    renderModal({
      actionType: "fertilizing",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      onError: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(screen.getByText("Nawozenie jest wylaczone w tym sezonie.")).toBeInTheDocument();
  });

  it("maps api errors to inline messages", async () => {
    apiPostMock.mockResolvedValue({
      data: null,
      error: { code: "performed_at_in_future", message: "future" },
      httpStatus: 400,
      response: null,
    });
    renderModal({
      actionType: "watering",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      onError: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await vi.runAllTimersAsync();

    expect(screen.getByText("Nie mozna wybrac przyszlej daty.")).toBeInTheDocument();
  });

  it("forwards unknown api errors to onError", async () => {
    const onError = vi.fn();
    apiPostMock.mockResolvedValue({
      data: null,
      error: { code: "unknown_error", message: "Oops" },
      httpStatus: 400,
      response: null,
    });
    renderModal({
      actionType: "watering",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange: vi.fn(),
      onSubmitted: vi.fn(),
      onError,
    });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await vi.runAllTimersAsync();

    expect(onError).toHaveBeenCalledWith({ code: "unknown_error", message: "Oops" });
  });

  it("submits action and closes modal on success", async () => {
    apiPostMock.mockResolvedValue({
      data: { id: "action-1" },
      error: null,
      httpStatus: 200,
      response: null,
    });
    const onOpenChange = vi.fn();
    const onSubmitted = vi.fn();

    renderModal({
      actionType: "watering",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange,
      onSubmitted,
      onError: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await vi.runAllTimersAsync();

    expect(apiPostMock).toHaveBeenCalledWith("/api/plants/plant-1/care-actions", {
      action_type: "watering",
      performed_at: "2025-01-01",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalledWith("Akcja zostala zapisana.");
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("closes modal when cancel is clicked", () => {
    const onOpenChange = vi.fn();
    renderModal({
      actionType: "watering",
      scheduleState: { status: "ready", schedules: [] },
      onOpenChange,
      onSubmitted: vi.fn(),
      onError: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
