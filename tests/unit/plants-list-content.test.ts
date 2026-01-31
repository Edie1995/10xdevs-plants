import { describe, expect, it } from "vitest";

import type { PlantCardVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import { buildSections, shouldShowSkeletons } from "../../src/components/plants/PlantsListContent";

const buildPlant = (overrides: Partial<PlantCardVM>): PlantCardVM => ({
  id: "plant-1",
  name: "Monstera",
  iconKey: null,
  colorHex: null,
  difficulty: "easy",
  statusPriority: 2,
  statusLabel: "OK",
  statusTone: "neutral",
  nextWateringAt: null,
  nextFertilizingAt: null,
  nextWateringDisplay: "-",
  nextFertilizingDisplay: "-",
  dueDatesTone: {
    watering: "none",
    fertilizing: "none",
  },
  links: {
    detailsHref: "/app/plants/plant-1",
    scheduleHref: "/app/plants/plant-1?tab=schedule",
  },
  ...overrides,
});

describe("PlantsListContent.buildSections", () => {
  it("returns an empty array for empty input", () => {
    const result = buildSections([]);

    expect(result).toEqual([]);
  });

  it("groups items by statusPriority and keeps section order", () => {
    const items: PlantCardVM[] = [
      buildPlant({ id: "urgent-1", statusPriority: 0, statusLabel: "Pilne", statusTone: "danger" }),
      buildPlant({ id: "ok-1", statusPriority: 2, statusLabel: "OK", statusTone: "neutral" }),
      buildPlant({ id: "today-1", statusPriority: 1, statusLabel: "Na dziś", statusTone: "warning" }),
      buildPlant({ id: "urgent-2", statusPriority: 0, statusLabel: "Pilne", statusTone: "danger" }),
    ];

    const result = buildSections(items);

    expect(
      result.map((section) => ({
        id: section.id,
        title: section.title,
        items: section.items.map((plant) => plant.id),
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "urgent",
          "items": [
            "urgent-1",
            "urgent-2",
          ],
          "title": "Pilne",
        },
        {
          "id": "today",
          "items": [
            "today-1",
          ],
          "title": "Na dzis",
        },
        {
          "id": "ok",
          "items": [
            "ok-1",
          ],
          "title": "OK",
        },
      ]
    `);
  });

  it("filters out empty sections when only one priority exists", () => {
    const items: PlantCardVM[] = [
      buildPlant({ id: "today-1", statusPriority: 1, statusLabel: "Na dziś", statusTone: "warning" }),
      buildPlant({ id: "today-2", statusPriority: 1, statusLabel: "Na dziś", statusTone: "warning" }),
    ];

    const result = buildSections(items);

    expect(result.map((section) => section.id)).toEqual(["today"]);
    expect(result[0]?.items.map((plant) => plant.id)).toEqual(["today-1", "today-2"]);
  });
});

describe("PlantsListContent.shouldShowSkeletons", () => {
  it("returns true when loading, empty list, and no empty state", () => {
    const result = shouldShowSkeletons({
      isLoading: true,
      items: [],
      emptyState: undefined,
    });

    expect(result).toBe(true);
  });

  it("returns false when items exist even if loading", () => {
    const result = shouldShowSkeletons({
      isLoading: true,
      items: [buildPlant({ id: "plant-1" })],
      emptyState: undefined,
    });

    expect(result).toBe(false);
  });

  it("returns false when not loading", () => {
    const result = shouldShowSkeletons({
      isLoading: false,
      items: [],
      emptyState: undefined,
    });

    expect(result).toBe(false);
  });

  it("returns false when empty state is provided", () => {
    const result = shouldShowSkeletons({
      isLoading: true,
      items: [],
      emptyState: {
        title: "Brak roslin",
        primaryAction: {
          label: "Dodaj",
          href: "/app/plants/new",
        },
      },
    });

    expect(result).toBe(false);
  });
});
