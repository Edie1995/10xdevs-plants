import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { DashboardQueryState } from "../../src/lib/dashboard/dashboard-viewmodel";
import DashboardToolbar from "../../src/components/dashboard/DashboardToolbar";

vi.mock("../../src/components/ui/select", () => {
  const React = require("react");
  const SelectContext = React.createContext(() => {});

  const Select = ({ onValueChange, children }: { onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <SelectContext.Provider value={onValueChange}>{children}</SelectContext.Provider>
  );

  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const onValueChange = React.useContext(SelectContext);
    return (
      <button type="button" onClick={() => onValueChange(value)}>
        {children}
      </button>
    );
  };

  const SelectTrigger = ({ children, id }: { children: React.ReactNode; id?: string }) => <div id={id}>{children}</div>;
  const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;
  const SelectContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

const buildQuery = (overrides: Partial<DashboardQueryState> = {}): DashboardQueryState => ({
  page: 1,
  limit: 8,
  search: undefined,
  sort: "priority",
  direction: "asc",
  ...overrides,
});

describe("DashboardToolbar", () => {
  it("submits trimmed search value", () => {
    const onSubmit = vi.fn();
    render(
      <DashboardToolbar
        query={buildQuery()}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onClear={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Szukaj"), { target: { value: "  Kaktus  " } });
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(onSubmit).toHaveBeenCalledWith("Kaktus");
  });

  it("blocks submit when search is longer than 50 characters", () => {
    const onSubmit = vi.fn();
    render(
      <DashboardToolbar
        query={buildQuery()}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onClear={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Szukaj"), { target: { value: "x".repeat(51) } });
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Maksymalnie 50 znakow.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears search input and error on clear", () => {
    const onClear = vi.fn();
    render(
      <DashboardToolbar
        query={buildQuery()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onClear={onClear}
      />
    );

    fireEvent.change(screen.getByLabelText("Szukaj"), { target: { value: "x".repeat(51) } });
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));
    fireEvent.click(screen.getByRole("button", { name: "Wyczysc" }));

    expect(onClear).toHaveBeenCalled();
    expect(screen.getByLabelText("Szukaj")).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("syncs input with query.search changes", () => {
    const { rerender } = render(
      <DashboardToolbar
        query={buildQuery({ search: "Aloes" })}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Szukaj")).toHaveValue("Aloes");

    rerender(
      <DashboardToolbar
        query={buildQuery({ search: "Palma" })}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Szukaj")).toHaveValue("Palma");
  });

  it("calls onChange when sort or direction changes", () => {
    const onChange = vi.fn();
    render(
      <DashboardToolbar
        query={buildQuery()}
        onChange={onChange}
        onSubmit={vi.fn()}
        onClear={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Nazwa" }));
    fireEvent.click(screen.getByRole("button", { name: "Malejaco" }));

    expect(onChange).toHaveBeenCalledWith({ sort: "name" });
    expect(onChange).toHaveBeenCalledWith({ direction: "desc" });
  });
});
