import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { DashboardQueryState } from "../../src/lib/dashboard/dashboard-viewmodel";
import AllPlantsSection from "../../src/components/dashboard/AllPlantsSection";

const toolbarPropsRef = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));

vi.mock("../../src/components/dashboard/DashboardToolbar", () => ({
  default: (props: Record<string, unknown>) => {
    toolbarPropsRef.current = props;
    return <div data-testid="DashboardToolbar" />;
  },
}));

const buildQuery = (overrides: Partial<DashboardQueryState> = {}): DashboardQueryState => ({
  page: 1,
  limit: 8,
  search: undefined,
  sort: "priority",
  direction: "asc",
  ...overrides,
});

describe("AllPlantsSection", () => {
  beforeEach(() => {
    toolbarPropsRef.current = null;
  });

  it("resets page when search changes", () => {
    const onQueryChange = vi.fn();
    render(
      <AllPlantsSection
        items={[]}
        pagination={{ page: 3, limit: 8, total: 0, totalPages: 1 }}
        query={buildQuery({ page: 3, sort: "name", direction: "desc" })}
        onQueryChange={onQueryChange}
        onCareActionCompleted={vi.fn()}
      />
    );

    const props = toolbarPropsRef.current as { onSubmit?: (search?: string) => void } | null;
    props?.onSubmit?.("Monstera");

    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "Monstera",
        page: 1,
        sort: "name",
        direction: "desc",
      })
    );
  });

  it("updates page from pagination without resetting other fields", () => {
    const onQueryChange = vi.fn();
    render(
      <AllPlantsSection
        items={[]}
        pagination={{ page: 1, limit: 8, total: 16, totalPages: 2 }}
        query={buildQuery({ page: 1, search: "Fikus" })}
        onQueryChange={onQueryChange}
        onCareActionCompleted={vi.fn()}
      />
    );

    screen.getByRole("button", { name: "Nastepna" }).click();

    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        search: "Fikus",
      })
    );
  });

  it("renders skeletons when loading with no items and no empty state", () => {
    const { container } = render(
      <AllPlantsSection
        items={[]}
        pagination={{ page: 1, limit: 8, total: 0, totalPages: 1 }}
        query={buildQuery()}
        isLoading
        onQueryChange={vi.fn()}
        onCareActionCompleted={vi.fn()}
      />
    );

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("renders empty state when provided and list is empty", () => {
    render(
      <AllPlantsSection
        items={[]}
        pagination={{ page: 1, limit: 8, total: 0, totalPages: 1 }}
        query={buildQuery()}
        emptyState={{
          title: "Brak roslin",
          primaryAction: { label: "Dodaj", href: "/app/plants/new" },
        }}
        onQueryChange={vi.fn()}
        onCareActionCompleted={vi.fn()}
      />
    );

    expect(screen.getByText("Brak roslin")).toBeInTheDocument();
  });
});
