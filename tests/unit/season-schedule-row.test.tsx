import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SeasonScheduleRow from "../../src/components/plants/SeasonScheduleRow";

describe("SeasonScheduleRow", () => {
  it("sanitizes numeric inputs and defaults empty to zero", () => {
    const onChange = vi.fn();

    render(
      <SeasonScheduleRow
        season="spring"
        seasonLabel="Wiosna"
        value={{ season: "spring", watering_interval: 0, fertilizing_interval: 0 }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Podlewanie (dni)"), { target: { value: "12a" } });
    fireEvent.change(screen.getByLabelText("Nawozenie (dni)"), { target: { value: "" } });

    expect(onChange).toHaveBeenCalledWith({ season: "spring", watering_interval: 12 });
    expect(onChange).toHaveBeenCalledWith({ season: "spring", fertilizing_interval: 0 });
  });
});
