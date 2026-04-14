import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { env } from '../src/config/environments';

const AUTH_DIR = path.join(process.cwd(), '.auth');

async function cacheAuthState(email: string, password: string, outputFile: string): Promise<void> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${env.baseURL}/login`);
    await page.fill('[data-testid="email"]', email);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="submit"]');
    await page.waitForURL(/dashboard/);
    await context.storageState({ path: outputFile });
    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(): Promise<void> {
  // Skip auth caching when credentials are not configured
  if (!env.testUser.email || !env.testUser.password) {
    console.warn(
      '[globalSetup] No credentials configured — skipping auth cache. Copy .env.example to .env.local and fill in real values.',
    );
    return;
  }

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Cache user and admin sessions (single-process, no race condition)
  await cacheAuthState(env.testUser.email, env.testUser.password, path.join(AUTH_DIR, 'user.json'));

  if (env.testAdmin.email && env.testAdmin.password) {
    await cacheAuthState(
      env.testAdmin.email,
      env.testAdmin.password,
      path.join(AUTH_DIR, 'admin.json'),
    );
  }
}
