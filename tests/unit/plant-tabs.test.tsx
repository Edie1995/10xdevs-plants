import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { PlantTabKey } from "../../src/types";
import PlantTabs from "../../src/components/plants/PlantTabs";

const tabs: { key: PlantTabKey; label: string }[] = [
  { key: "basic", label: "Podstawy" },
  { key: "schedule", label: "Harmonogram" },
];

describe("PlantTabs", () => {
  it("renders tabs and marks active tab", () => {
    render(<PlantTabs activeTab="basic" onTabChange={vi.fn()} tabs={tabs} />);

    expect(screen.getByRole("tablist", { name: "Zakladki szczegolow rosliny" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Podstawy" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Harmonogram" })).toHaveAttribute("aria-selected", "false");
  });

  it("invokes onTabChange when clicking tab", () => {
    const onTabChange = vi.fn();
    render(<PlantTabs activeTab="basic" onTabChange={onTabChange} tabs={tabs} />);

    fireEvent.click(screen.getByRole("tab", { name: "Harmonogram" }));
    expect(onTabChange).toHaveBeenCalledWith("schedule");
  });
});
