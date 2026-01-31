import type { Locator, Page } from "@playwright/test";

type CareActionType = "watering" | "fertilizing";

export default class PlantCardComponent {
  constructor(
    private readonly page: Page,
    private readonly plantId: string,
    private readonly scope?: Locator
  ) {}

  private get root() {
    return (this.scope ?? this.page).getByTestId(`plant-card-${this.plantId}`);
  }

  get card() {
    return this.root;
  }

  get name() {
    return this.root.getByTestId(`plant-name-${this.plantId}`);
  }

  get statusBadge() {
    return this.root.getByTestId(`plant-status-badge-${this.plantId}`);
  }

  get nextWatering() {
    return this.root.getByTestId(`plant-next-watering-${this.plantId}`);
  }

  get nextFertilizing() {
    return this.root.getByTestId(`plant-next-fertilizing-${this.plantId}`);
  }

  get waterTodayButton() {
    return this.root.getByTestId(`plant-action-water-${this.plantId}`);
  }

  get fertilizeTodayButton() {
    return this.root.getByTestId(`plant-action-fertilize-${this.plantId}`);
  }

  getBackdateModal(action: CareActionType) {
    return this.page.getByTestId(`plant-backdate-${this.plantId}-${action}-modal`);
  }

  getBackdateDateInput(action: CareActionType) {
    return this.page.getByTestId(`plant-backdate-${this.plantId}-${action}-date-input`);
  }

  getBackdateSubmit(action: CareActionType) {
    return this.page.getByTestId(`plant-backdate-${this.plantId}-${action}-submit`);
  }

  async clickWaterToday() {
    await this.waterTodayButton.click();
  }

  async clickFertilizeToday() {
    await this.fertilizeTodayButton.click();
  }

  async holdWaterToday(durationMs = 600) {
    await this.pressAndHold(this.waterTodayButton, durationMs);
  }

  async holdFertilizeToday(durationMs = 600) {
    await this.pressAndHold(this.fertilizeTodayButton, durationMs);
  }

  private async pressAndHold(locator: Locator, durationMs: number) {
    await locator.dispatchEvent("pointerdown");
    await this.page.waitForTimeout(durationMs);
    await locator.dispatchEvent("pointerup");
  }
}
