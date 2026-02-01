import type { Page } from "@playwright/test";

import type { Season } from "../../../src/types";

interface BasicsFields {
  name?: string;
  difficulty?: "easy" | "medium" | "hard";
  soil?: string;
  pot?: string;
  position?: string;
}

interface DiseaseFields {
  name?: string;
  symptoms?: string;
  advice?: string;
}

export default class NewPlantPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/app/plants/new");
  }

  get form() {
    return this.page.getByTestId("new-plant-form");
  }

  get nameInput() {
    return this.page.getByTestId("new-plant-name-input");
  }

  get difficultySelect() {
    return this.page.getByTestId("new-plant-difficulty-select");
  }

  get soilInput() {
    return this.page.getByTestId("new-plant-soil-input");
  }

  get potInput() {
    return this.page.getByTestId("new-plant-pot-input");
  }

  get positionInput() {
    return this.page.getByTestId("new-plant-position-input");
  }

  get scheduleToggle() {
    return this.page.getByTestId("new-plant-schedule-toggle");
  }

  get diseasesToggle() {
    return this.page.getByTestId("new-plant-diseases-toggle");
  }

  get addDiseaseButton() {
    return this.page.getByTestId("new-plant-add-disease-button");
  }

  get saveButton() {
    return this.page.getByTestId("new-plant-save-button");
  }

  async fillBasics(fields: BasicsFields) {
    if (fields.name !== undefined) {
      await this.nameInput.fill(fields.name);
    }
    if (fields.difficulty !== undefined) {
      await this.difficultySelect.click();
      await this.page.getByRole("option", { name: this.getDifficultyLabel(fields.difficulty) }).click();
    }
    if (fields.soil !== undefined) {
      await this.soilInput.fill(fields.soil);
    }
    if (fields.pot !== undefined) {
      await this.potInput.fill(fields.pot);
    }
    if (fields.position !== undefined) {
      await this.positionInput.fill(fields.position);
    }
  }

  async setScheduleEnabled(enabled: boolean) {
    if (enabled) {
      await this.scheduleToggle.check();
    } else {
      await this.scheduleToggle.uncheck();
    }
  }

  async fillSchedule(season: Season, values: { watering?: number; fertilizing?: number }) {
    if (values.watering !== undefined) {
      await this.page.getByTestId(`new-plant-schedule-${season}-watering`).fill(String(values.watering));
    }
    if (values.fertilizing !== undefined) {
      await this.page.getByTestId(`new-plant-schedule-${season}-fertilizing`).fill(String(values.fertilizing));
    }
  }

  async setDiseasesEnabled(enabled: boolean) {
    if (enabled) {
      await this.diseasesToggle.check();
    } else {
      await this.diseasesToggle.uncheck();
    }
  }

  async addDisease() {
    await this.addDiseaseButton.click();
  }

  async fillDisease(index: number, fields: DiseaseFields) {
    if (fields.name !== undefined) {
      await this.page.getByTestId(`new-plant-disease-name-${index}`).fill(fields.name);
    }
    if (fields.symptoms !== undefined) {
      await this.page.getByTestId(`new-plant-disease-symptoms-${index}`).fill(fields.symptoms);
    }
    if (fields.advice !== undefined) {
      await this.page.getByTestId(`new-plant-disease-advice-${index}`).fill(fields.advice);
    }
  }

  async save() {
    await this.saveButton.click();
  }

  private getDifficultyLabel(value: BasicsFields["difficulty"]) {
    switch (value) {
      case "easy":
        return "Latwy";
      case "medium":
        return "Sredni";
      case "hard":
        return "Trudny";
      default:
        return "";
    }
  }
}
