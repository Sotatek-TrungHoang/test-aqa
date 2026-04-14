import { Locator, Page, expect } from '@playwright/test';

export class AssertionHelper {
  /** Assert all values in a record match their corresponding locators */
  static async fieldsMatch(
    locators: Record<string, Locator>,
    expected: Record<string, string>,
  ): Promise<void> {
    for (const [key, value] of Object.entries(expected)) {
      const locator = locators[key];
      if (!locator) throw new Error(`No locator for field: ${key}`);
      await expect(locator).toHaveValue(value);
    }
  }

  /** Assert table contains all expected values */
  static async tableContains(table: Locator, values: string[]): Promise<void> {
    const text = (await table.textContent()) ?? '';
    values.forEach(v => expect(text).toContain(v));
  }

  /** Assert no visible error messages on page */
  static async noErrors(page: Page): Promise<void> {
    await expect(page.locator('[role="alert"].error, .alert-danger')).toHaveCount(0);
  }
}
