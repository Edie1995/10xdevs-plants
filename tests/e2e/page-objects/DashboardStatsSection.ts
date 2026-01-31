import type { Page } from "@playwright/test";

type DashboardStatId = "wszystkie" | "pilne" | "na-dzis";

export default class DashboardStatsSection {
  constructor(private readonly page: Page) {}

  get root() {
    return this.page.getByTestId("dashboard-stats");
  }

  getStatValue(statId: DashboardStatId) {
    return this.page.getByTestId(`dashboard-stat-value-${statId}`);
  }
}
