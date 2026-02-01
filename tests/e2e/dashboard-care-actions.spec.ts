import { expect, test } from "@playwright/test";

import AuthLoginPage from "./page-objects/AuthLoginPage";
import DashboardPage from "./page-objects/DashboardPage";

const getCredentials = () => ({
  email:
    process.env.E2E_USER_EMAIL ??
    process.env.PLAYWRIGHT_USER_EMAIL ??
    process.env.TEST_USER_EMAIL ??
    process.env.E2E_EMAIL ??
    "",
  password:
    process.env.E2E_USER_PASSWORD ??
    process.env.PLAYWRIGHT_USER_PASSWORD ??
    process.env.TEST_USER_PASSWORD ??
    process.env.E2E_PASSWORD ??
    "",
});

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateOnlyUtc = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const formatDisplayDateUtc = (date: Date) =>
  `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;

const addDaysUtc = (date: Date, days: number) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const buildSchedules = (wateringInterval: number, fertilizingInterval = 30) => [
  { season: "spring", watering_interval: wateringInterval, fertilizing_interval: fertilizingInterval },
  { season: "summer", watering_interval: wateringInterval, fertilizing_interval: fertilizingInterval },
  { season: "autumn", watering_interval: wateringInterval, fertilizing_interval: fertilizingInterval },
  { season: "winter", watering_interval: wateringInterval, fertilizing_interval: fertilizingInterval },
];

test("dashboard updates attention list after watering actions", async ({ page }) => {
  const { email, password } = getCredentials();

  if (!email || !password) {
    test.skip(true, "Missing E2E credentials in environment variables.");
  }

  // Arrange
  const authPage = new AuthLoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const createdPlantIds: string[] = [];

  await authPage.goto("/app/dashboard");
  await authPage.loginAndWaitForRedirect(email, password);

  const buildAuthHeaders = async (): Promise<Record<string, string> | undefined> => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    return cookieHeader ? { Cookie: cookieHeader } : undefined;
  };

  const authHeaders = await buildAuthHeaders();
  const todayUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const threeDaysAgo = addDaysUtc(todayUtc, -3);
  const fourDaysAgo = addDaysUtc(todayUtc, -4);
  const yesterday = addDaysUtc(todayUtc, -1);

  const wateringInterval = 3;
  const schedules = buildSchedules(wateringInterval);
  const plantTodayName = `E2E Dashboard Today ${Date.now()}`;
  const plantYesterdayName = `E2E Dashboard Yesterday ${Date.now()}`;

  const createPlant = async (name: string) => {
    const response = await page.request.post("/api/plants", {
      headers: authHeaders,
      data: { name, schedules },
    });
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { success: boolean; data?: { id: string } };
    expect(body.success).toBeTruthy();
    if (!body.data?.id) {
      throw new Error("Missing plant id in create response.");
    }
    createdPlantIds.push(body.data.id);
    return body.data.id;
  };

  const createWateringAction = async (plantId: string, performedAt: Date) => {
    const response = await page.request.post(`/api/plants/${plantId}/care-actions`, {
      headers: authHeaders,
      data: {
        action_type: "watering",
        performed_at: formatDateOnlyUtc(performedAt),
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBeTruthy();
  };

  const plantTodayId = await createPlant(plantTodayName);
  const plantYesterdayId = await createPlant(plantYesterdayName);
  await createWateringAction(plantTodayId, threeDaysAgo);
  await createWateringAction(plantYesterdayId, fourDaysAgo);

  try {
    await dashboardPage.goto();

    const attention = dashboardPage.requiresAttention;
    await expect(attention.root).toBeVisible();
    await expect(attention.plantCard(plantTodayId).card).toBeVisible();
    await expect(attention.plantCard(plantYesterdayId).card).toBeVisible();
    await expect(attention.plantCard(plantTodayId).statusBadge).toHaveText("Na dziś");
    await expect(attention.plantCard(plantYesterdayId).statusBadge).toHaveText("Pilne");

    // Act
    await attention.plantCard(plantTodayId).clickWaterToday();
    const overdueCard = attention.plantCard(plantYesterdayId);
    await overdueCard.holdWaterToday();
    await expect(overdueCard.getBackdateModal("watering")).toBeVisible();
    await overdueCard.getBackdateDateInput("watering").fill(formatDateOnlyUtc(yesterday));
    await overdueCard.getBackdateSubmit("watering").click();

    // Assert
    await expect(attention.root).toHaveCount(0);

    const todayCard = dashboardPage.plantCard(plantTodayId);
    const overdueUpdatedCard = dashboardPage.plantCard(plantYesterdayId);
    const todayNextWatering = addDaysUtc(todayUtc, wateringInterval);
    const overdueNextWatering = addDaysUtc(yesterday, wateringInterval);

    await expect(todayCard.statusBadge).toHaveCount(0);
    await expect(overdueUpdatedCard.statusBadge).toHaveCount(0);
    await expect(todayCard.nextWatering).toHaveText(formatDisplayDateUtc(todayNextWatering));
    await expect(overdueUpdatedCard.nextWatering).toHaveText(formatDisplayDateUtc(overdueNextWatering));
  } finally {
    await Promise.all(
      createdPlantIds.map(async (plantId) => {
        await page.request.delete(`/api/plants/${plantId}`, { headers: authHeaders });
      })
    );
  }
});
