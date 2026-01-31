import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { PlantScheduleStateVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import QuickActions from "../../src/components/plants/QuickActions";
import { apiPost } from "../../src/lib/api/api-client";
import { isFertilizingDisabledForDate } from "../../src/lib/dashboard/schedule.utils";
import { toast } from "sonner";

interface BackdateModalProps {
  open: boolean;
  actionType: "watering" | "fertilizing";
}

const modalPropsRef = vi.hoisted(() => ({ current: null as BackdateModalProps | null }));

vi.mock("../../src/components/plants/BackdateCareActionModal", () => ({
  default: (props: BackdateModalProps) => {
    modalPropsRef.current = props;
    return <div data-testid="BackdateCareActionModal" />;
  },
}));

vi.mock("../../src/lib/api/api-client", () => ({
  apiPost: vi.fn(),
}));

vi.mock("../../src/lib/dashboard/schedule.utils", () => ({
  isFertilizingDisabledForDate: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

const apiPostMock = vi.mocked(apiPost);
const isFertilizingDisabledForDateMock = vi.mocked(isFertilizingDisabledForDate);

const renderActions = (overrides: Partial<PlantScheduleStateVM> = {}, onError = vi.fn(), onSuccess = vi.fn()) =>
  render(
    <QuickActions
      plantId="plant-1"
      scheduleState={{ status: "ready", schedules: [], ...overrides }}
      onLoadSchedule={vi.fn().mockResolvedValue({ status: "ready", schedules: [] })}
      onSuccess={onSuccess}
      onError={onError}
    />
  );

describe("QuickActions", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    isFertilizingDisabledForDateMock.mockReset().mockReturnValue(false);
    vi.useRealTimers();
  });

  it("blocks actions when schedule is missing", async () => {
    const onError = vi.fn();
    renderActions({ status: "missing" }, onError);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Podlano dzis" }));
    fireEvent.pointerUp(screen.getByRole("button", { name: "Podlano dzis" }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "schedule_missing",
        })
      );
    });
  });

  it("disables fertilizing when disabled for today", () => {
    isFertilizingDisabledForDateMock.mockReturnValue(true);
    renderActions();

    expect(screen.getByRole("button", { name: "Nawozono dzis" })).toBeDisabled();
  });

  it("submits watering action successfully", async () => {
    apiPostMock.mockResolvedValue({
      data: { id: "action-1" },
      error: null,
      httpStatus: 200,
      response: null,
    });
    const onSuccess = vi.fn();

    renderActions({}, vi.fn(), onSuccess);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Podlano dzis" }));
    fireEvent.pointerUp(screen.getByRole("button", { name: "Podlano dzis" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/api/plants/plant-1/care-actions", {
        action_type: "watering",
      });
      expect(toast.success).toHaveBeenCalledWith("Akcja zostala zapisana.");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("opens backdate modal on long press", () => {
    vi.useFakeTimers();
    renderActions();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Podlano dzis" }));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const modalProps = modalPropsRef.current;
    expect(modalProps).not.toBeNull();
    expect(modalProps?.open).toBe(true);
    expect(modalProps?.actionType).toBe("watering");

    vi.useRealTimers();
  });
});
