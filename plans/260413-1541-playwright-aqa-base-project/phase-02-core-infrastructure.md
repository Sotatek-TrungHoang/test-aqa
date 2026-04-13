# Phase 02 — Core Infrastructure

**Status:** ⬜ pending
**Priority:** Critical
**Blocked by:** Phase 01 (tsconfig path aliases must exist first)
**Plan:** [plan.md](./plan.md)

---

## Overview

Build all reusable source modules: config, pages, fixtures, helpers, API client, and utilities.
These are the shared building blocks that all tests will import from.

---

## Files to Create

```
src/
├── config/
│   ├── environments.ts           # Multi-env config (dev/staging/prod)
│   └── timeouts.ts               # Centralized timeout constants
│
├── pages/
│   ├── base.page.ts              # BasePage class (shared actions/assertions)
│   ├── login.page.ts             # Example: Login page object
│   └── dashboard.page.ts         # Example: Dashboard page object
│
├── fixtures/
│   ├── auth.fixture.ts           # Authenticated context (session caching)
│   ├── api.fixture.ts            # API client fixture
│   ├── pages.fixture.ts          # Page objects fixture
│   └── index.ts                  # Merged export (mergeTests)
│
├── helpers/
│   ├── wait.helper.ts            # Smart wait strategies
│   ├── data.helper.ts            # Faker-based test data generators
│   ├── assertion.helper.ts       # Custom assertion helpers
│   ├── storage.helper.ts         # LocalStorage / cookie helpers
│   └── browser.helper.ts         # Screenshot, trace, performance
│
├── api/
│   ├── api-client.ts             # Base API client (GET/POST/PUT/DELETE)
│   └── endpoints/
│       └── users.endpoint.ts     # Example: Users API endpoint wrapper
│
└── utils/
    ├── logger.ts                 # Structured logger
    ├── retry.ts                  # Retry logic utility
    └── allure-utils.ts           # Allure annotation helpers

data/
├── test-data.json                # Static test fixtures
└── user.factory.ts               # UserFactory (Faker-based builder)

tests/
├── global-setup.ts               # Pre-test: cache auth state
├── global-teardown.ts            # Post-test: cleanup
└── annotations.ts                # Test tag constants (@smoke, @regression…)
```

---

## Implementation Steps

### 1. `src/config/environments.ts`

```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.example') });

export interface EnvConfig {
  baseURL: string;
  apiBaseURL: string;
  testUser: { email: string; password: string };
  testAdmin: { email: string; password: string };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env: EnvConfig = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiBaseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'user@example.com',
    password: process.env.TEST_USER_PASSWORD || 'Password123!',
  },
  testAdmin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPass123!',
  },
};
```

### 2. `src/config/timeouts.ts`

```typescript
/** Centralized timeout constants (milliseconds) */
export const Timeouts = {
  /** Short UI interaction (clicks, fills) */
  action: 10_000,
  /** Page navigation */
  navigation: 30_000,
  /** Full test timeout */
  test: 30_000,
  /** Long-running flows (checkout, onboarding) */
  longTest: 120_000,
  /** Quick existence check */
  assertion: 5_000,
} as const;
```

### 3. `src/pages/base.page.ts`

```typescript
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
      res => !!res.url().match(urlPattern),
      { timeout: Timeouts.navigation },
    );
  }
}
```

### 4. `src/pages/login.page.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // Lazy locators (evaluated only when accessed)
  get emailInput() { return this.page.locator('[data-testid="email"]'); }
  get passwordInput() { return this.page.locator('[data-testid="password"]'); }
  get submitButton() { return this.page.locator('[data-testid="submit"]'); }
  get errorAlert() { return this.page.locator('[role="alert"]'); }

  async navigate(): Promise<void> {
    await this.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorAlert.waitFor();
    return (await this.errorAlert.textContent()) ?? '';
  }
}
```

### 5. `src/pages/dashboard.page.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  get heading() { return this.page.getByRole('heading', { name: 'Dashboard' }); }
  get userMenu() { return this.page.locator('[data-testid="user-menu"]'); }
  get logoutButton() { return this.page.locator('[data-testid="logout"]'); }

  async navigate(): Promise<void> {
    await this.goto('/dashboard');
  }

  async isLoaded(): Promise<boolean> {
    return this.heading.isVisible();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.assertUrl('/login');
  }
}
```

### 6. `src/fixtures/pages.fixture.ts`

```typescript
import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/login.page';
import { DashboardPage } from '@pages/dashboard.page';

type PagesFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<PagesFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
```

### 7. `src/fixtures/auth.fixture.ts`

Auth fixture with session caching (avoids re-login for every test).

```typescript
import { test as base, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { env } from '@config/environments';
import { LoginPage } from '@pages/login.page';

const AUTH_DIR = path.join(process.cwd(), '.auth');
const USER_AUTH_FILE = path.join(AUTH_DIR, 'user.json');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');

type AuthFixtures = {
  /** Browser context with regular user pre-authenticated */
  userContext: BrowserContext;
  /** Browser context with admin user pre-authenticated */
  adminContext: BrowserContext;
};

async function createAuthContext(
  browser: Parameters<typeof base.extend>[0]['browser'] extends infer B ? B : never,
  email: string,
  password: string,
  storageFile: string,
): Promise<BrowserContext> {
  // Reuse cached session if file exists
  if (fs.existsSync(storageFile)) {
    return browser.newContext({ storageState: storageFile });
  }

  // Fresh login
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const context = await browser.newContext();
  const page = await context.newPage();
  const loginPage = new LoginPage(page);

  await loginPage.navigate();
  await loginPage.login(email, password);
  await page.waitForURL(/dashboard/);
  await context.storageState({ path: storageFile });
  await page.close();

  return context;
}

export const test = base.extend<AuthFixtures>({
  userContext: async ({ browser }, use) => {
    const ctx = await createAuthContext(
      browser as any,
      env.testUser.email,
      env.testUser.password,
      USER_AUTH_FILE,
    );
    await use(ctx);
    await ctx.close();
  },

  adminContext: async ({ browser }, use) => {
    const ctx = await createAuthContext(
      browser as any,
      env.testAdmin.email,
      env.testAdmin.password,
      ADMIN_AUTH_FILE,
    );
    await use(ctx);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
```

### 8. `src/fixtures/api.fixture.ts`

```typescript
import { test as base } from '@playwright/test';
import { ApiClient } from '@api/api-client';
import { env } from '@config/environments';

type ApiFixtures = {
  apiClient: ApiClient;
};

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, { baseURL: env.apiBaseURL });
    await use(client);
  },
});

export { expect } from '@playwright/test';
```

### 9. `src/fixtures/index.ts`

```typescript
import { mergeTests } from '@playwright/test';
import { test as pagesTest } from './pages.fixture';
import { test as authTest } from './auth.fixture';
import { test as apiTest } from './api.fixture';

/** Merged test with all fixtures: loginPage, dashboardPage, userContext, adminContext, apiClient */
export const test = mergeTests(pagesTest, authTest, apiTest);
export { expect } from '@playwright/test';
```

### 10. `src/helpers/wait.helper.ts`

```typescript
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
    await page.waitForLoadState('networkidle', { timeout });
  }
}
```

### 11. `src/helpers/data.helper.ts`

```typescript
import { faker } from '@faker-js/faker';

export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export class DataHelper {
  static user(overrides: Partial<UserData> = {}): UserData {
    return {
      email: faker.internet.email(),
      password: 'TestPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }

  static randomEmail(): string {
    return faker.internet.email();
  }

  static randomString(length = 8): string {
    return faker.string.alphanumeric(length);
  }

  static randomInt(min = 1, max = 100): number {
    return faker.number.int({ min, max });
  }
}
```

### 12. `src/helpers/assertion.helper.ts`

```typescript
import { Locator, expect } from '@playwright/test';

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
    const text = await table.textContent() ?? '';
    values.forEach(v => expect(text).toContain(v));
  }

  /** Assert no visible error messages on page */
  static async noErrors(page: Parameters<typeof expect>[0]): Promise<void> {
    await expect(
      (page as any).locator('[role="alert"].error, .alert-danger'),
    ).toHaveCount(0);
  }
}
```

### 13. `src/helpers/storage.helper.ts`

```typescript
import { BrowserContext } from '@playwright/test';

export class StorageHelper {
  static async setLocalStorage(
    context: BrowserContext,
    key: string,
    value: unknown,
  ): Promise<void> {
    await context.addInitScript(
      ([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)),
      [key, value],
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
    await context.addCookies([{
      name,
      value,
      domain,
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86_400 * 30,
    }]);
  }
}
```

### 14. `src/helpers/browser.helper.ts`

```typescript
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
```

### 15. `src/api/api-client.ts`

```typescript
import { APIRequestContext, APIResponse } from '@playwright/test';

interface ApiClientOptions {
  baseURL: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private readonly baseURL: string;
  private headers: Record<string, string>;

  constructor(
    private readonly request: APIRequestContext,
    options: ApiClientOptions,
  ) {
    this.baseURL = options.baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  setAuthToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  async get<T = unknown>(endpoint: string): Promise<T> {
    const res = await this.request.get(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
    });
    return this.parseResponse<T>(res);
  }

  async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const res = await this.request.post(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
      data,
    });
    return this.parseResponse<T>(res);
  }

  async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const res = await this.request.put(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
      data,
    });
    return this.parseResponse<T>(res);
  }

  async delete(endpoint: string): Promise<void> {
    const res = await this.request.delete(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
    });
    if (!res.ok()) throw new Error(`DELETE ${endpoint} failed: ${res.status()}`);
  }

  private async parseResponse<T>(res: APIResponse): Promise<T> {
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`API ${res.status()}: ${body}`);
    }
    return res.json() as Promise<T>;
  }
}
```

### 16. `src/api/endpoints/users.endpoint.ts`

```typescript
import { ApiClient } from '@api/api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Typed wrapper for /users API endpoints */
export class UsersEndpoint {
  constructor(private readonly client: ApiClient) {}

  async getAll(): Promise<User[]> {
    return this.client.get<User[]>('/users');
  }

  async getById(id: string): Promise<User> {
    return this.client.get<User>(`/users/${id}`);
  }

  async create(payload: CreateUserPayload): Promise<User> {
    return this.client.post<User>('/users', payload);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete(`/users/${id}`);
  }
}
```

### 17. `src/utils/logger.ts`

```typescript
const isCI = !!process.env.CI;

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    if (!isCI) console.log(`[INFO] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
};
```

### 18. `src/utils/retry.ts`

```typescript
/** Retry an async operation up to `attempts` times with `delayMs` between retries */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
```

### 19. `src/utils/allure-utils.ts`

```typescript
import { test } from '@playwright/test';

export const allure = {
  description: (desc: string) =>
    test.info().annotations.push({ type: 'description', description: desc }),

  issue: (id: string) =>
    test.info().annotations.push({ type: 'issue', description: id }),

  testId: (id: string) =>
    test.info().annotations.push({ type: 'testId', description: id }),

  severity: (level: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial') =>
    test.info().annotations.push({ type: 'severity', description: level }),

  feature: (name: string) =>
    test.info().annotations.push({ type: 'feature', description: name }),

  story: (name: string) =>
    test.info().annotations.push({ type: 'story', description: name }),
};
```

### 20. `data/test-data.json`

```json
{
  "users": {
    "valid": {
      "email": "user@example.com",
      "password": "Password123!",
      "firstName": "John",
      "lastName": "Doe"
    },
    "admin": {
      "email": "admin@example.com",
      "password": "AdminPass123!",
      "firstName": "Admin",
      "lastName": "User"
    }
  },
  "invalidEmails": ["invalid", "user@", "@example.com", "user@example"],
  "weakPasswords": ["123", "password", "abc"]
}
```

### 21. `data/user.factory.ts`

```typescript
import { faker } from '@faker-js/faker';

export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
}

export class UserFactory {
  static create(overrides: Partial<UserData> = {}): UserData {
    return {
      email: faker.internet.email(),
      password: 'TestPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      isAdmin: false,
      ...overrides,
    };
  }

  static createAdmin(overrides: Partial<UserData> = {}): UserData {
    return this.create({ isAdmin: true, ...overrides });
  }

  static createBatch(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

### 22. `tests/annotations.ts`

```typescript
/** Canonical test annotation tags — use in test titles to enable tag-based filtering */
export const Tag = {
  smoke: '@smoke',
  regression: '@regression',
  e2e: '@e2e',
  api: '@api',
  visual: '@visual',
  critical: '@critical',
  slow: '@slow',
  flaky: '@flaky',
  wip: '@wip',
} as const;
```

### 23. `tests/global-setup.ts`

```typescript
import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { env } from '../src/config/environments';

const AUTH_DIR = path.join(process.cwd(), '.auth');

export default async function globalSetup(config: FullConfig): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Cache regular user auth state
  const baseURL = config.use?.baseURL ?? env.baseURL;
  await page.goto(`${baseURL}/login`);
  await page.fill('[data-testid="email"]', env.testUser.email);
  await page.fill('[data-testid="password"]', env.testUser.password);
  await page.click('[data-testid="submit"]');
  await page.waitForURL(/dashboard/);
  await context.storageState({ path: path.join(AUTH_DIR, 'user.json') });

  await browser.close();
}
```

### 24. `tests/global-teardown.ts`

```typescript
import { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Add any post-suite cleanup here (DB reset, temp file removal, etc.)
}
```

---

## Todo

- [ ] Create `src/config/environments.ts`
- [ ] Create `src/config/timeouts.ts`
- [ ] Create `src/pages/base.page.ts`
- [ ] Create `src/pages/login.page.ts`
- [ ] Create `src/pages/dashboard.page.ts`
- [ ] Create `src/fixtures/pages.fixture.ts`
- [ ] Create `src/fixtures/auth.fixture.ts`
- [ ] Create `src/fixtures/api.fixture.ts`
- [ ] Create `src/fixtures/index.ts`
- [ ] Create `src/helpers/wait.helper.ts`
- [ ] Create `src/helpers/data.helper.ts`
- [ ] Create `src/helpers/assertion.helper.ts`
- [ ] Create `src/helpers/storage.helper.ts`
- [ ] Create `src/helpers/browser.helper.ts`
- [ ] Create `src/api/api-client.ts`
- [ ] Create `src/api/endpoints/users.endpoint.ts`
- [ ] Create `src/utils/logger.ts`
- [ ] Create `src/utils/retry.ts`
- [ ] Create `src/utils/allure-utils.ts`
- [ ] Create `data/test-data.json`
- [ ] Create `data/user.factory.ts`
- [ ] Create `tests/annotations.ts`
- [ ] Create `tests/global-setup.ts`
- [ ] Create `tests/global-teardown.ts`
- [ ] Verify `pnpm type-check` passes for all new files

---

## Success Criteria

- All `src/**` and `data/**` files compile without TypeScript errors
- Path aliases (`@pages/*`, `@fixtures/*`, etc.) resolve correctly
- `src/fixtures/index.ts` exports unified `test` and `expect`
- `DataHelper.user()` returns a valid user object
