import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Lazy locators (evaluated only when accessed)
  get emailInput() {
    return this.page.locator('#email');
  }
  get passwordInput() {
    return this.page.locator('#password');
  }
  get submitButton() {
    return this.page.locator('button[type="submit"]');
  }
  get errorAlert() {
    return this.page.locator('[role="alert"], .text-destructive, [class*="error"]').first();
  }

  async navigate(): Promise<void> {
    await this.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await Promise.all([
      this.page
        .waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 })
        .catch(() => {
          // Navigation may not occur on failed login — ignore timeout here
        }),
      this.submitButton.click(),
    ]);
  }

  async getErrorMessage(): Promise<string> {
    await this.errorAlert.waitFor();
    return (await this.errorAlert.textContent()) ?? '';
  }
}
