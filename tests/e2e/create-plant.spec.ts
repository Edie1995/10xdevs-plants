import { expect, test } from "@playwright/test";

import type { Season } from "../../src/types";
import AuthLoginPage from "./page-objects/AuthLoginPage";
import NewPlantPage from "./page-objects/NewPlantPage";
import PlantsListPage from "./page-objects/PlantsListPage";

const getCredentials = () => ({
  email: process.env.E2E_USER_EMAIL ?? "",
  password: process.env.E2E_PASSWORD ?? "",
});

test("user can create plant with schedule and diseases", async ({ page }) => {
  const { email, password } = getCredentials();

  if (!email || !password) {
    test.skip(true, "Missing E2E credentials in environment variables.");
  }

  // Arrange
  const authPage = new AuthLoginPage(page);
  const plantsListPage = new PlantsListPage(page);
  const newPlantPage = new NewPlantPage(page);
  const plantName = `E2E Monstera ${Date.now()}`;

  await authPage.goto("/app/dashboard");
  await authPage.loginAndWaitForRedirect(email, password);

  // Act
  await page.goto("/app/plants");
  await expect(page).toHaveURL(/\/app\/plants/);

  await plantsListPage.clickAddPlant();
  await expect(page).toHaveURL(/\/app\/plants\/new/);
  await expect(newPlantPage.form).toBeVisible();
  if (!process.env.CI) {
    await expect(newPlantPage.form).toHaveScreenshot("new-plant-form.png", { maxDiffPixelRatio: 0.02 });
  }

  await newPlantPage.fillBasics({
    name: plantName,
    difficulty: "medium",
    soil: "Ziemia uniwersalna",
    pot: "Ceramiczna, 18 cm",
    position: "Polnocny parapet",
  });

  await newPlantPage.setScheduleEnabled(true);
  await newPlantPage.fillSchedule("spring" as Season, { watering: 7, fertilizing: 30 });
  await newPlantPage.fillSchedule("summer" as Season, { watering: 5, fertilizing: 21 });

  await newPlantPage.setDiseasesEnabled(true);
  await newPlantPage.addDisease();
  await newPlantPage.fillDisease(0, {
    name: "Maczniak",
    symptoms: "Bialy nalot na lisciach",
    advice: "Usun porazone liscie i zmniejsz wilgotnosc",
  });

  await newPlantPage.save();

  // Assert
  await expect(page).toHaveURL(/\/app\/plants\/[^/]+\?tab=basic/);
  await expect(page.getByRole("heading", { name: plantName })).toBeVisible();

  await page.getByRole("link", { name: "Wroc do listy" }).click();
  await expect(page).toHaveURL(/\/app\/plants/);
  await expect(page.locator('[data-slot="card-title"]', { hasText: plantName })).toBeVisible();
});
