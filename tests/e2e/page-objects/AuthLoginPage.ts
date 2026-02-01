import type { Page } from "@playwright/test";

export default class AuthLoginPage {
  constructor(private readonly page: Page) {}

  async goto(redirectTo?: string) {
    const url = redirectTo ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/auth/login";
    await this.page.goto(url);
  }

  get emailInput() {
    return this.page.getByLabel("E-mail");
  }

  get passwordInput() {
    return this.page.getByLabel("Haslo");
  }

  get submitButton() {
    return this.page.getByRole("button", { name: "Zaloguj sie" });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForRedirect(email: string, password: string, redirectUrl = /\/app\/dashboard/, timeout = 20_000) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await Promise.all([
      this.page.waitForURL(redirectUrl, { timeout, waitUntil: "domcontentloaded" }),
      this.submitButton.click(),
    ]);
  }
}
