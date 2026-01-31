import type { Page } from "@playwright/test";

export default class PlantsListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/app/plants");
  }

  get addPlantButton() {
    return this.page.getByTestId("plants-list-add-button");
  }

  async clickAddPlant() {
    await this.addPlantButton.click();
  }
}
