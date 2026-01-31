import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { DiseaseCommand } from "../../src/types";
import DiseaseEntryRow from "../../src/components/plants/DiseaseEntryRow";

const baseValue: DiseaseCommand = {
  name: "Zgnilizna",
  symptoms: "Zolkniecie",
  advice: "Przesadzic",
};

describe("DiseaseEntryRow", () => {
  it("calls onChange for each field", () => {
    const onChange = vi.fn();
    render(<DiseaseEntryRow index={0} value={baseValue} onChange={onChange} onRemove={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nazwa choroby *"), { target: { value: "Nowa" } });
    fireEvent.change(screen.getByLabelText("Objawy"), { target: { value: "Objawy" } });
    fireEvent.change(screen.getByLabelText("Zalecenia"), { target: { value: "Zalecenia" } });

    expect(onChange).toHaveBeenCalledWith({ name: "Nowa" });
    expect(onChange).toHaveBeenCalledWith({ symptoms: "Objawy" });
    expect(onChange).toHaveBeenCalledWith({ advice: "Zalecenia" });
  });

  it("calls onRemove when clicking delete", () => {
    const onRemove = vi.fn();
    render(<DiseaseEntryRow index={1} value={baseValue} onChange={vi.fn()} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "Usun" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders validation errors and aria attributes", () => {
    render(
      <DiseaseEntryRow
        index={2}
        value={baseValue}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        error={{ name: "Podaj nazwe", symptoms: "Za dlugie", advice: "Za dlugie" }}
      />
    );

    expect(screen.getByText("Podaj nazwe")).toBeInTheDocument();
    expect(screen.getAllByText("Za dlugie")).toHaveLength(2);
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getByLabelText("Nazwa choroby *")).toHaveAttribute("aria-invalid", "true");
  });
});
