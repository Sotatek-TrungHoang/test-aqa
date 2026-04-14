import { BrowserContext } from '@playwright/test';

export class StorageHelper {
  static async setLocalStorage(
    context: BrowserContext,
    key: string,
    value: unknown,
  ): Promise<void> {
    await context.addInitScript(
      ({ k, v }: { k: string; v: unknown }) => window.localStorage.setItem(k, JSON.stringify(v)),
      { k: key, v: value },
    );
  }

  static async clearLocalStorage(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => window.localStorage.clear());
  }

  static async setCookie(
    context: BrowserContext,
    name: string,
    value: string,
    domain: string,
  ): Promise<void> {
    await context.addCookies([
      {
        name,
        value,
        domain,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86_400 * 30,
      },
    ]);
  }
}
