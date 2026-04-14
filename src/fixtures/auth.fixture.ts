import { test as base, Browser, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), '.auth');
const USER_AUTH_FILE = path.join(AUTH_DIR, 'user.json');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');

type AuthFixtures = {
  /** Browser context with regular user pre-authenticated */
  userContext: BrowserContext;
  /** Browser context with admin user pre-authenticated */
  adminContext: BrowserContext;
};

function loadCachedContext(
  browser: Browser,
  storageFile: string,
  role: string,
): Promise<BrowserContext> {
  if (!fs.existsSync(storageFile)) {
    throw new Error(
      `Auth cache missing for ${role}: ${storageFile}. ` +
        'Ensure credentials are set in .env.local and global-setup ran successfully.',
    );
  }
  return browser.newContext({ storageState: storageFile });
}

export const test = base.extend<AuthFixtures>({
  // Auth contexts are read-only from files cached by global-setup (single-process, no race condition)
  userContext: async ({ browser }, use) => {
    const ctx = await loadCachedContext(browser, USER_AUTH_FILE, 'user');
    await use(ctx);
    await ctx.close();
  },

  adminContext: async ({ browser }, use) => {
    const ctx = await loadCachedContext(browser, ADMIN_AUTH_FILE, 'admin');
    await use(ctx);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
