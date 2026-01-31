import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PlantDiseasesTab from "../../src/components/plants/PlantDiseasesTab";
import { useDiseasesCrud } from "../../src/components/hooks/useDiseasesCrud";
import { validateDiseaseDraft } from "../../src/lib/plants/plant-diseases-viewmodel";
import { toast } from "sonner";

vi.mock("../../src/components/hooks/useDiseasesCrud", () => ({
  useDiseasesCrud: vi.fn(),
}));

vi.mock("../../src/lib/plants/plant-diseases-viewmodel", () => ({
  validateDiseaseDraft: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const useDiseasesCrudMock = vi.mocked(useDiseasesCrud);
const validateDiseaseDraftMock = vi.mocked(validateDiseaseDraft);

const buildCrud = (overrides?: Partial<ReturnType<typeof useDiseasesCrud>>) => ({
  items: [],
  hasItems: false,
  add: vi.fn().mockResolvedValue({ error: null, validation: null }),
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  updateDraft: vi.fn(),
  save: vi.fn(),
  requestDelete: vi.fn(),
  toggleOpen: vi.fn(),
  ...overrides,
});

describe("PlantDiseasesTab", () => {
  beforeEach(() => {
    useDiseasesCrudMock.mockReturnValue(buildCrud());
    validateDiseaseDraftMock.mockReturnValue(null);
  });

  it("shows empty state when there are no diseases", () => {
    render(<PlantDiseasesTab plantId="plant-1" initialDiseases={[]} onApiError={vi.fn()} />);

    expect(screen.getByText("Brak chorob. Dodaj pierwsza pozycje, aby uzupelnic dane.")).toBeInTheDocument();
  });

  it("shows validation errors before calling add", async () => {
    validateDiseaseDraftMock.mockReturnValue({
      form: null,
      fields: { name: "Wymagane" },
    });

    render(<PlantDiseasesTab plantId="plant-1" initialDiseases={[]} onApiError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dodaj chorobe" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Popraw bledy w formularzu.");
      expect(screen.getByText("Wymagane")).toBeInTheDocument();
    });
  });

  it("shows validation errors returned by API", async () => {
    const add = vi.fn().mockResolvedValue({
      error: null,
      validation: { form: "Blad zapisu", fields: {} },
    });
    useDiseasesCrudMock.mockReturnValue(buildCrud({ add }));

    render(<PlantDiseasesTab plantId="plant-1" initialDiseases={[]} onApiError={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nazwa choroby *"), { target: { value: "Plamki" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj chorobe" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Blad zapisu");
      expect(screen.getByText("Blad zapisu")).toBeInTheDocument();
    });
  });

  it("shows error when API call fails", async () => {
    const add = vi.fn().mockResolvedValue({
      error: { code: "server_error", message: "Oops" },
      validation: null,
    });
    useDiseasesCrudMock.mockReturnValue(buildCrud({ add }));

    render(<PlantDiseasesTab plantId="plant-1" initialDiseases={[]} onApiError={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nazwa choroby *"), { target: { value: "Plamki" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj chorobe" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Nie udalo sie dodac choroby.");
    });
  });

  it("resets draft on successful add", async () => {
    render(<PlantDiseasesTab plantId="plant-1" initialDiseases={[]} onApiError={vi.fn()} />);

    const input = screen.getByLabelText("Nazwa choroby *") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Plamki" } });
    fireEvent.click(screen.getByRole("button", { name: "Dodaj chorobe" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Dodano chorobe.");
      expect(input.value).toBe("");
    });
  });
});
