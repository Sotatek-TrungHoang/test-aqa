import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export class BrowserHelper {
  static async screenshot(page: Page, name: string): Promise<void> {
    const dir = path.join(process.cwd(), 'test-results', 'screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${name}.png`) });
  }

  static async getPerformanceMetrics(page: Page): Promise<Record<string, number>> {
    return page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        ttfb: nav.responseStart - nav.requestStart,
        domLoad: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadTime: nav.loadEventEnd - nav.loadEventStart,
      };
    });
  }
}
