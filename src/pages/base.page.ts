import { Page, Locator, expect } from '@playwright/test';
import { Timeouts } from '@config/timeouts';

/** Base class providing shared navigation, interaction, and assertion helpers */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fill(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: Timeouts.action });
    await locator.clear();
    await locator.fill(value);
  }

  async assertVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible({ timeout: Timeouts.assertion });
  }

  async assertText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text, { timeout: Timeouts.assertion });
  }

  async assertUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout: Timeouts.navigation });
  }

  async waitForResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(
      res =>
        typeof urlPattern === 'string'
          ? res.url().includes(urlPattern)
          : urlPattern.test(res.url()),
      { timeout: Timeouts.navigation },
    );
  }
}
