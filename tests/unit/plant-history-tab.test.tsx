import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PlantHistoryTab from "../../src/components/plants/PlantHistoryTab";
import { useCareActionsList } from "../../src/components/hooks/useCareActionsList";
import { mapCareLogToRow } from "../../src/lib/plants/plant-history-viewmodel";
import { toast } from "sonner";

vi.mock("../../src/components/hooks/useCareActionsList", () => ({
  useCareActionsList: vi.fn(),
}));

vi.mock("../../src/lib/plants/plant-history-viewmodel", () => ({
  mapCareLogToRow: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const useCareActionsListMock = vi.mocked(useCareActionsList);
const mapCareLogToRowMock = vi.mocked(mapCareLogToRow);

describe("PlantHistoryTab", () => {
  beforeEach(() => {
    useCareActionsListMock.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isEmpty: true,
      refetch: vi.fn(),
    });
    mapCareLogToRowMock.mockImplementation((row: any) => ({
      id: row.id,
      actionTypeLabel: "Podlewanie",
      performedAtDisplay: "Dzis",
    }));
  });

  it("renders fallback rows when API returns error", async () => {
    useCareActionsListMock.mockReturnValue({
      data: [],
      error: { code: "error", message: "Oops", httpStatus: 400 },
      isLoading: false,
      isEmpty: false,
      refetch: vi.fn(),
    });

    render(
      <PlantHistoryTab
        plantId="plant-1"
        recentFromDetail={[{ id: "log-1", action_type: "watering", performed_at: "2025-01-01" } as any]}
        onApiError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mapCareLogToRowMock).toHaveBeenCalled();
      expect(screen.getByText("Dzis")).toBeInTheDocument();
    });
  });

  it("shows retry on server error and calls refetch", async () => {
    const refetch = vi.fn();
    const onApiError = vi.fn();
    useCareActionsListMock.mockReturnValue({
      data: [],
      error: { code: "error", message: "Oops", httpStatus: 500 },
      isLoading: false,
      isEmpty: false,
      refetch,
    });

    render(<PlantHistoryTab plantId="plant-1" recentFromDetail={[]} onApiError={onApiError} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Nie udalo sie pobrac historii. Sprobuj ponownie.");
      expect(onApiError).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sprobuj ponownie" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("updates filter when selecting action type", () => {
    const calls: Array<{ plantId: string; filter: any }> = [];
    useCareActionsListMock.mockImplementation((plantId, filter) => {
      calls.push({ plantId, filter });
      return {
        data: [],
        error: null,
        isLoading: false,
        isEmpty: true,
        refetch: vi.fn(),
      };
    });

    render(<PlantHistoryTab plantId="plant-1" recentFromDetail={[]} onApiError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Podlewanie" }));

    const lastCall = calls[calls.length - 1];
    expect(lastCall.filter.actionType).toBe("watering");
  });
});
