import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { PlantCardVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import RequiresAttentionSection from "../../src/components/dashboard/RequiresAttentionSection";

const plantCardPropsRef = vi.hoisted(() => ({
  current: [] as {
    plant: PlantCardVM;
    onCareActionCompleted: () => void;
    onNavigateToSchedule: (id: string) => void;
  }[],
}));

vi.mock("../../src/components/plants/PlantCard", () => ({
  default: (props: {
    plant: PlantCardVM;
    onCareActionCompleted: () => void;
    onNavigateToSchedule: (id: string) => void;
  }) => {
    plantCardPropsRef.current.push(props);
    return <div data-testid="PlantCard" />;
  },
}));

const buildPlant = (id: string): PlantCardVM => ({
  id,
  name: `Plant ${id}`,
  icon_key: null,
  color_hex: null,
  schedule: null,
  is_favorite: false,
  urgent_actions: [],
  warning_actions: [],
});

describe("RequiresAttentionSection", () => {
  it("returns null when there are no items", () => {
    const { container } = render(
      <RequiresAttentionSection items={[]} onCareActionCompleted={vi.fn()} onOpenScheduleCta={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders plant cards and passes callbacks", () => {
    const onCareActionCompleted = vi.fn();
    const onOpenScheduleCta = vi.fn();
    plantCardPropsRef.current = [];

    render(
      <RequiresAttentionSection
        items={[buildPlant("p1"), buildPlant("p2")]}
        onCareActionCompleted={onCareActionCompleted}
        onOpenScheduleCta={onOpenScheduleCta}
      />
    );

    expect(screen.getAllByTestId("PlantCard")).toHaveLength(2);
    expect(plantCardPropsRef.current[0].plant.id).toBe("p1");
    expect(plantCardPropsRef.current[0].onCareActionCompleted).toBe(onCareActionCompleted);
    expect(plantCardPropsRef.current[0].onNavigateToSchedule).toBe(onOpenScheduleCta);
  });
});
