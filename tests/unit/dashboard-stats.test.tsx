import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { DashboardStatsVM } from "../../src/lib/dashboard/dashboard-viewmodel";
import DashboardStats from "../../src/components/dashboard/DashboardStats";

const stats: DashboardStatsVM = {
  totalPlants: 12,
  urgent: 3,
  warning: 5,
};

describe("DashboardStats", () => {
  it("renders each tile with value", () => {
    render(<DashboardStats stats={stats} />);

    expect(screen.getByText("Wszystkie")).toBeInTheDocument();
    expect(screen.getByText("Pilne")).toBeInTheDocument();
    expect(screen.getByText("Na dzis")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders placeholders when loading", () => {
    render(<DashboardStats stats={stats} isLoading />);

    const placeholders = screen.getAllByText("—");
    expect(placeholders).toHaveLength(3);
  });
});
