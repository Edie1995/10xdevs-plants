import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { PlantsListQueryState } from "../../src/lib/plants/plants-list-viewmodel";
import PlantsToolbar from "../../src/components/plants/PlantsToolbar";

const baseQuery: PlantsListQueryState = {
  search: undefined,
  sort: "priority",
  direction: "asc",
  page: 1,
};

describe("PlantsToolbar", () => {
  it("blocks submission when search is longer than 50 characters", () => {
    const onSubmit = vi.fn();
    render(<PlantsToolbar query={baseQuery} onChange={vi.fn()} onSubmit={onSubmit} onClear={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Szukaj"), { target: { value: "x".repeat(51) } });
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Maksymalnie 50 znakow.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits undefined when search is empty after trimming", () => {
    const onSubmit = vi.fn();
    render(<PlantsToolbar query={baseQuery} onChange={vi.fn()} onSubmit={onSubmit} onClear={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Szukaj"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(onSubmit).toHaveBeenCalledWith(undefined);
  });

  it("clears value and error on clear", () => {
    const onClear = vi.fn();
    render(<PlantsToolbar query={baseQuery} onChange={vi.fn()} onSubmit={vi.fn()} onClear={onClear} />);

    fireEvent.change(screen.getByLabelText("Szukaj"), { target: { value: "x".repeat(51) } });
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wyczysc" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Szukaj")).toHaveValue("");
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
