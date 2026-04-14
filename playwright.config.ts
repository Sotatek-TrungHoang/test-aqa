import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { Timeouts } from './src/config/timeouts';

// Load .env.local (gitignored) — copy .env.example to .env.local and fill in real values
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: Timeouts.test,
  expect: { timeout: Timeouts.assertion },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    isCI ? ['github'] : ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: Timeouts.action,
    navigationTimeout: Timeouts.navigation,
  },

  projects: [
    // Smoke: fast sanity on Chrome only
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
      grep: /@smoke/,
    },
    // Default: Chromium
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@smoke/,
    },
    // Cross-browser (opt-in via `pnpm test:firefox` etc.)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile emulation
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
});
