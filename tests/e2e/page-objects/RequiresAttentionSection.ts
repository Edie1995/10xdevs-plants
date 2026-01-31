import type { Page } from "@playwright/test";

import PlantCardComponent from "./PlantCardComponent";

export default class RequiresAttentionSection {
  constructor(private readonly page: Page) {}

  get root() {
    return this.page.getByTestId("requires-attention-section");
  }

  get title() {
    return this.page.getByTestId("requires-attention-title");
  }

  get list() {
    return this.page.getByTestId("requires-attention-list");
  }

  plantCard(plantId: string) {
    return new PlantCardComponent(this.page, plantId, this.root);
  }
}
