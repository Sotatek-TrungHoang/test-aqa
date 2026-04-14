import { Locator, Page } from '@playwright/test';

export class WaitHelper {
  static async forVisible(locator: Locator, timeout = 5_000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  static async forHidden(locator: Locator, timeout = 5_000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  static async forUrl(page: Page, pattern: string | RegExp, timeout = 30_000): Promise<void> {
    await page.waitForURL(pattern, { timeout });
  }

  static async forResponse(
    page: Page,
    urlPattern: string | RegExp,
    timeout = 30_000,
  ): Promise<void> {
    await page.waitForResponse(r => !!r.url().match(urlPattern), { timeout });
  }

  static async forNetworkIdle(page: Page, timeout = 30_000): Promise<void> {
    // eslint-disable-next-line playwright/no-networkidle
    await page.waitForLoadState('networkidle', { timeout });
  }
}
