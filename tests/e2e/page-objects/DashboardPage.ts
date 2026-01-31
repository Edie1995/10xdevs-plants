import type { Page } from "@playwright/test";

import DashboardStatsSection from "./DashboardStatsSection";
import PlantCardComponent from "./PlantCardComponent";
import RequiresAttentionSection from "./RequiresAttentionSection";

export default class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/app/dashboard");
  }

  get stats() {
    return new DashboardStatsSection(this.page);
  }

  get requiresAttention() {
    return new RequiresAttentionSection(this.page);
  }

  plantCard(plantId: string) {
    return new PlantCardComponent(this.page, plantId);
  }
}
