# Professional Playwright Test Framework Setup — Technical Report

**Date:** 2026-04-13 | **Status:** Research Complete | **Scope:** Full-stack Playwright configuration

---

## Executive Summary

Professional Playwright setup requires coordinated configuration across 13 critical areas. This report provides production-grade patterns, code snippets, and configuration examples for teams building enterprise test automation.

**Key Findings:**
- Playwright v1.40+ supports multi-project setup with browser-specific overrides
- TypeScript fixtures enable strongly-typed page objects and custom authentication
- Allure reporter + Playwright achieves detailed test reporting with media attachments
- Environment variable isolation prevents credential leakage
- Global setup patterns handle pre-test state (auth, seeding) efficiently
- Custom annotations enable flexible test categorization without framework modifications

---

## 1. playwright.config.ts — Full Configuration Reference

### Core Structure (Team-Ready)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  // Metadata
  testDir: path.join(__dirname, 'tests'),
  outputDir: path.join(__dirname, 'test-results'),
  snapshotDir: path.join(__dirname, 'tests/__snapshots__'),
  fullyParallel: !isCI, // Sequential in CI for determinism
  forbidOnly: isCI, // Fail CI if .only() detected
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined, // Default workers in local (CPU count)

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    // Allure reporter (if installed)
    ['allure-playwright'],
  ],

  // Global test options
  use: {
    baseURL,
    trace: 'on-first-retry', // Capture trace on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  // Global timeout
  timeout: 30000, // 30s per test
  expect: {
    timeout: 5000,
  },

  // Shared setup/teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Projects: browser matrix + environment overrides
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    // Smoke tests on single browser (fast feedback)
    {
      name: 'chromium-smoke',
      use: { ...devices['Desktop Chrome'] },
      grep: /@smoke/,
    },
    // Regression tests on all browsers
    {
      name: 'chromium-regression',
      use: { ...devices['Desktop Chrome'] },
      grep: /@regression/,
    },
  ],

  // Web Server (auto-start for local runs)
  webServer: !isCI
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.FORCE_DEV_SERVER,
        timeout: 120000,
      }
    : undefined,
});
```

### Advanced Team Patterns

```typescript
// Advanced configuration with conditional projects
export default defineConfig({
  // ... base config ...

  // Parallel execution in local, sequential in CI
  fullyParallel: !isCI,
  workers: isCI ? 1 : undefined,

  // Retry logic: disabled for local, 2x in CI
  retries: isCI ? 2 : 0,

  // Strict mode: fail on uncaught exceptions
  use: {
    baseURL,
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: isCI ? 'only-on-failure' : 'retain-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },

  // Project filtering by env
  projects: process.env.BROWSER
    ? [
        {
          name: process.env.BROWSER,
          use: { ...devices[`Desktop ${process.env.BROWSER}`] },
        },
      ]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ],
});
```

**Key Options Reference:**

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `testDir` | string | `tests` | Where Playwright finds test files |
| `outputDir` | string | `test-results` | Where test artifacts are saved |
| `fullyParallel` | boolean | `false` | Run all tests concurrently |
| `workers` | number | CPU count | Parallel worker processes |
| `retries` | number | 0 | Retry failed tests N times |
| `forbidOnly` | boolean | `false` | Fail if `.only()` detected in CI |
| `timeout` | number | 30000 | Test timeout in milliseconds |
| `expect.timeout` | number | 5000 | Assertion timeout |
| `use.trace` | string | `off` | Trace mode: off, on, retain-on-failure, on-first-retry |
| `use.screenshot` | string | `off` | Screenshot on failure or always |
| `use.video` | string | `off` | Record video on failure or always |

---

## 2. TypeScript tsconfig.json for Playwright Projects

### Recommended Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@fixtures/*": ["tests/fixtures/*"],
      "@pages/*": ["tests/pages/*"],
      "@tests/*": ["tests/*"],
      "@utils/*": ["tests/utils/*"],
      "@data/*": ["tests/data/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node"
  },
  "include": ["tests/**/*", "playwright.config.ts"],
  "exclude": ["node_modules", "dist", "playwright-report"]
}
```

**Path Aliases Benefit:** Enables clean imports across project:
```typescript
import { LoginPage } from '@pages/login.page';
import { authFixture } from '@fixtures/auth';
import { testData } from '@data/users.json';
```

---

## 3. ESLint Configuration for Playwright

### Setup: eslint-plugin-playwright

```bash
npm install -D eslint eslint-plugin-playwright @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### .eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "env": {
    "browser": true,
    "es2020": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:playwright/recommended"
  ],
  "plugins": ["@typescript-eslint", "playwright"],
  "rules": {
    "playwright/no-wait-for-timeout": "warn",
    "playwright/no-eval": "error",
    "playwright/no-skipped-test": "warn",
    "playwright/no-focused-test": "error",
    "playwright/valid-expect": "error",
    "playwright/no-element-handle": "warn",
    "playwright/no-wait-for-selector": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "overrides": [
    {
      "files": ["tests/**/*.ts"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

**Key Playwright Rules:**
- `no-wait-for-timeout`: Disallow `page.waitForTimeout()` (use proper waits)
- `no-focused-test`: Prevent `.only()` from CI
- `valid-expect`: Catch invalid assertions
- `no-element-handle`: Discourage deprecated ElementHandle API

---

## 4. Prettier Setup

### .prettierrc.json

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### .prettierignore

```
node_modules
dist
playwright-report
test-results
.playwright
coverage
playwright-debug.log
```

### package.json Scripts

```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md}\"",
    "lint": "eslint \"tests/**/*.ts\"",
    "lint:fix": "eslint \"tests/**/*.ts\" --fix"
  }
}
```

---

## 5. package.json Scripts — Comprehensive Commands

```json
{
  "name": "test-automation",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "test:headed:ui": "playwright test --headed --ui",

    "test:smoke": "playwright test --grep @smoke",
    "test:smoke:headed": "playwright test --grep @smoke --headed",
    "test:smoke:debug": "playwright test --grep @smoke --debug",

    "test:regression": "playwright test --grep @regression",
    "test:regression:all-browsers": "playwright test -p chromium firefox webkit --grep @regression",

    "test:api": "playwright test tests/api --grep @api",
    "test:e2e": "playwright test tests/e2e --grep @e2e",
    "test:visual": "playwright test --grep @visual",

    "test:single": "playwright test --headed --debug",
    "test:file": "playwright test tests/",
    "test:browser": "playwright test -p chromium",

    "test:ci": "playwright test --reporter=html,json,junit",

    "report": "playwright show-report",
    "report:allure": "allure serve allure-results",

    "codegen": "playwright codegen http://localhost:3000",
    "codegen:firefox": "playwright codegen --browser firefox http://localhost:3000",

    "traces": "playwright show-trace",

    "lint": "eslint \"tests/**/*.ts\"",
    "lint:fix": "eslint \"tests/**/*.ts\" --fix",
    "format": "prettier --write \"tests/**/*.{ts,js,json}\"",
    "format:check": "prettier --check \"tests/**/*.{ts,js,json}\"",
    "type-check": "tsc --noEmit",

    "test:all": "npm run lint && npm run type-check && npm run test",

    "install-browsers": "playwright install",
    "install-deps": "playwright install-deps"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "eslint-plugin-playwright": "^0.20.0",
    "prettier": "^3.0.0",
    "typescript": "^5.2.0",
    "allure-playwright": "^2.11.0",
    "allure-commandline": "^2.25.0"
  }
}
```

**Command Usage Patterns:**

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (headless) |
| `npm run test:headed` | Run with browser visible |
| `npm run test:debug` | Debug mode (Inspector + headed) |
| `npm run test:ui` | Interactive UI mode |
| `npm run test:smoke` | Fast feedback tests only |
| `npm run test:regression` | Full browser matrix |
| `npm run codegen` | Generate new test scripts |
| `npm run report` | View HTML report |
| `npm run report:allure` | View Allure report |

---

## 6. Environment Variable Handling — dotenv Integration

### .env.example

```bash
# Test Environment
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
PLAYWRIGHT_TEST_ENV=development

# Authentication
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=SecureTestPass123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=SecureAdminPass123!

# API Configuration
API_BASE_URL=http://localhost:3001/api
API_TIMEOUT=30000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_db
DB_USER=test_user
DB_PASSWORD=test_password

# Feature Flags
FEATURE_NEW_DASHBOARD=true
FEATURE_BETA_API=false

# Reporting
ALLURE_RESULTS_DIR=allure-results
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# CI/CD Markers
CI=false
FORCE_DEV_SERVER=false
```

### Load Env in playwright.config.ts

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local (gitignored) or .env
const envFile = process.env.ENV_FILE || '.env.local';
const envPath = path.resolve(__dirname, envFile);

dotenv.config({ path: envPath, override: true });

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const testEnv = process.env.PLAYWRIGHT_TEST_ENV || 'development';
```

### Load Env in Fixtures

```typescript
// tests/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export const test = base.extend({
  apiHeaders: async ({}, use) => {
    const headers = {
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
      'Content-Type': 'application/json',
    };
    await use(headers);
  },
});
```

### .gitignore Protection

```gitignore
# Environment variables
.env
.env.local
.env.*.local
.env.production

# Never commit secrets
credentials.json
secrets.json
auth-state.json
```

---

## 7. Allure Reporter Integration

### Installation & Setup

```bash
npm install -D @playwright/test allure-playwright allure-commandline
```

### playwright.config.ts Integration

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: false,
      categories: [
        {
          name: 'Flaky Tests',
          matchedStatuses: ['flaky'],
        },
      ],
    }],
  ],

  use: {
    // Attach assets for failed tests
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
```

### Custom Allure Decorators & Helpers

```typescript
// tests/utils/allure-utils.ts
import { test } from '@playwright/test';

export const addDescription = (description: string) => {
  test.info().annotations.push({ type: 'description', description });
};

export const addIssue = (issueId: string) => {
  test.info().annotations.push({ type: 'issue', description: issueId });
};

export const addTestId = (testId: string) => {
  test.info().annotations.push({ type: 'testId', description: testId });
};

export const addSeverity = (severity: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial') => {
  test.info().annotations.push({ type: 'severity', description: severity });
};
```

### Test with Allure Annotations

```typescript
import { test } from '@playwright/test';
import { addDescription, addIssue, addSeverity } from '@utils/allure-utils';

test('user can log in with valid credentials', async ({ page }) => {
  addDescription('Verify user login flow with correct email and password');
  addSeverity('critical');
  addTestId('AUTH-001');
  addIssue('JIRA-1234');

  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'Password123!');
  await page.click('[data-testid="submit"]');

  await page.waitForURL('/dashboard');
});
```

### View Allure Report

```bash
npm run report:allure
# Serves allure report on http://localhost:4331
```

---

## 8. Custom Test Annotations & Tags

### Annotation Patterns

```typescript
// tests/annotations.ts
export const TestAnnotations = {
  smoke: '@smoke',
  regression: '@regression',
  e2e: '@e2e',
  api: '@api',
  visual: '@visual',
  critical: '@critical',
  flaky: '@flaky',
  slow: '@slow',
  skip: '@skip',
  wip: '@wip',
} as const;
```

### Using Annotations

```typescript
import { test } from '@playwright/test';
import { TestAnnotations } from '@tests/annotations';

// Basic annotation
test(`${TestAnnotations.smoke} login redirects to dashboard`, async ({ page }) => {
  // test body
});

// Multiple annotations
test(`${TestAnnotations.smoke} ${TestAnnotations.critical} user login`, async ({ page }) => {
  // test body
});

// With metadata
test.describe('@auth', () => {
  test('@smoke login with valid credentials', async ({ page }) => {
    // test body
  });

  test.skip(`${TestAnnotations.flaky} password reset flow`, async ({ page }) => {
    // test body
  });
});
```

### Run Tests by Tag

```bash
npm run test:smoke          # Only @smoke
npm run test:regression     # Only @regression
npm run test:critical       # Only @critical

# Via CLI
npx playwright test --grep @smoke
npx playwright test --grep "@smoke|@regression"   # OR logic
npx playwright test --grep "@critical" -p chromium  # Filter project too
```

### Tag-based Project Configuration

```typescript
// playwright.config.ts
projects: [
  {
    name: 'smoke',
    use: { ...devices['Desktop Chrome'] },
    grep: /@smoke/,
  },
  {
    name: 'regression',
    use: { ...devices['Desktop Chrome'] },
    grep: /@regression/,
  },
  {
    name: 'critical-only',
    use: { ...devices['Desktop Chrome'] },
    grep: /@critical/,
  },
],
```

---

## 9. Playwright Fixtures — Custom Fixtures Pattern

### Page Object Fixture

```typescript
// tests/fixtures/pages.fixture.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '@pages/login.page';
import { DashboardPage } from '@pages/dashboard.page';

type PagesFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<PagesFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';
```

### Page Object Implementation

```typescript
// tests/pages/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.submitButton = page.locator('[data-testid="submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor();
    return this.errorMessage.textContent() ?? '';
  }
}
```

### Authentication Fixture

```typescript
// tests/fixtures/auth.fixture.ts
import { test as base, BrowserContext } from '@playwright/test';
import { LoginPage } from '@pages/login.page';

type AuthFixtures = {
  authenticatedContext: BrowserContext;
  adminContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_USER_EMAIL || 'user@example.com',
      process.env.TEST_USER_PASSWORD || 'Password123!',
    );

    // Wait for navigation + save cookies
    await page.waitForURL('/dashboard');
    await context.addCookies(await page.context().cookies());

    await use(context);
    await context.close();
  },

  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      process.env.TEST_ADMIN_PASSWORD || 'AdminPass123!',
    );

    await page.waitForURL('/admin');
    await context.addCookies(await page.context().cookies());

    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### Test Using Fixtures

```typescript
import { test } from '@fixtures/pages.fixture';
import { test as authTest } from '@fixtures/auth.fixture';

// Page object fixture
test('login flow', async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'Password123!');
  await dashboardPage.verifyLoaded();
});

// Auth fixture
authTest('authenticated user can access dashboard', async ({ authenticatedContext }) => {
  const page = await authenticatedContext.newPage();
  await page.goto('/dashboard');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
});
```

---

## 10. Global Setup/Teardown Patterns

### Global Setup — Pre-test State

```typescript
// tests/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, 'auth', 'user.json');

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup...');

  // Seed database (if needed)
  // await seedDatabase();

  // Pre-authenticate user (cache auth state)
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = config.use.baseURL || 'http://localhost:3000';
  await page.goto(`${baseURL}/login`);

  // Login
  await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL || 'user@example.com');
  await page.fill('[data-testid="password"]', process.env.TEST_USER_PASSWORD || 'Password123!');
  await page.click('[data-testid="submit"]');

  // Wait for navigation
  await page.waitForURL(/.*dashboard.*/);

  // Save auth state
  await context.storageState({ path: authFile });

  await browser.close();
  console.log('Global setup complete: auth state cached');
}

export default globalSetup;
```

### Global Teardown — Cleanup

```typescript
// tests/global-teardown.ts
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');

  // Clean up test data
  // await cleanupDatabase();

  // Close any lingering connections
  // await closeConnections();

  console.log('Global teardown complete');
}

export default globalTeardown;
```

### Use Cached Auth in Tests

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: 'tests/auth/user.json', // Load cached auth
  },

  projects: [
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/auth/user.json',
      },
    },
    {
      name: 'chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      // No storageState = fresh context
    },
  ],
});
```

---

## 11. Test Data Management Patterns

### JSON Fixtures

```typescript
// tests/data/users.json
{
  "validUser": {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  },
  "adminUser": {
    "email": "admin@example.com",
    "password": "AdminPass123!",
    "firstName": "Admin",
    "lastName": "User"
  },
  "invalidEmails": [
    "invalid",
    "user@",
    "@example.com",
    "user@example"
  ]
}
```

### Data Factory Pattern

```typescript
// tests/data/user.factory.ts
import { faker } from '@faker-js/faker';

export interface User {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
}

export class UserFactory {
  static createUser(overrides?: Partial<User>): User {
    return {
      email: faker.internet.email(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      isAdmin: false,
      ...overrides,
    };
  }

  static createAdmin(overrides?: Partial<User>): User {
    return this.createUser({ isAdmin: true, ...overrides });
  }

  static createBatch(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }
}
```

### Load Data in Tests

```typescript
// tests/examples/data-loading.spec.ts
import { test } from '@playwright/test';
import testData from '@data/users.json';
import { UserFactory } from '@data/user.factory';

test('login with predefined user', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(testData.validUser.email, testData.validUser.password);
});

test('create random users', async () => {
  const user1 = UserFactory.createUser();
  const admin = UserFactory.createAdmin();
  const batch = UserFactory.createBatch(5);

  console.log(user1, admin, batch);
});
```

### API Test Data Fixture

```typescript
// tests/fixtures/test-data.fixture.ts
import { test as base } from '@playwright/test';
import { UserFactory } from '@data/user.factory';

type TestDataFixtures = {
  testUser: typeof UserFactory;
};

export const test = base.extend<TestDataFixtures>({
  testUser: async ({}, use) => {
    await use(UserFactory);
  },
});

export { expect } from '@playwright/test';
```

---

## 12. API Testing with APIRequestContext

### API Helper Class

```typescript
// tests/api/api-client.ts
import { APIRequestContext, APIResponse } from '@playwright/test';

interface ApiOptions {
  baseURL?: string;
  headers?: Record<string, string>;
}

export class ApiClient {
  private request: APIRequestContext;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(request: APIRequestContext, options: ApiOptions = {}) {
    this.request = request;
    this.baseURL = options.baseURL || 'http://localhost:3001/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  async get(endpoint: string, options: any = {}): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}${endpoint}`, {
      headers: this.defaultHeaders,
      ...options,
    });
  }

  async post(endpoint: string, data: any, options: any = {}): Promise<APIResponse> {
    return this.request.post(`${this.baseURL}${endpoint}`, {
      headers: this.defaultHeaders,
      data,
      ...options,
    });
  }

  async put(endpoint: string, data: any, options: any = {}): Promise<APIResponse> {
    return this.request.put(`${this.baseURL}${endpoint}`, {
      headers: this.defaultHeaders,
      data,
      ...options,
    });
  }

  async delete(endpoint: string, options: any = {}): Promise<APIResponse> {
    return this.request.delete(`${this.baseURL}${endpoint}`, {
      headers: this.defaultHeaders,
      ...options,
    });
  }

  setAuthHeader(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
}
```

### API Fixture

```typescript
// tests/fixtures/api.fixture.ts
import { test as base, APIRequestContext } from '@playwright/test';
import { ApiClient } from '@api/api-client';

type ApiFixtures = {
  apiClient: ApiClient;
};

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    const apiClient = new ApiClient(request, {
      baseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
    });
    await use(apiClient);
  },
});

export { expect } from '@playwright/test';
```

### API Test

```typescript
// tests/api/users.spec.ts
import { test, expect } from '@fixtures/api.fixture';

test.describe('User API', () => {
  test('GET /users returns 200', async ({ apiClient }) => {
    const response = await apiClient.get('/users');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('POST /users creates user', async ({ apiClient }) => {
    const userData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    const response = await apiClient.post('/users', userData);
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.data.email).toBe(userData.email);
  });

  test('DELETE /users/:id removes user', async ({ apiClient }) => {
    // Create user
    const createResp = await apiClient.post('/users', {
      email: 'temp@example.com',
      password: 'Pass123!',
      firstName: 'Temp',
      lastName: 'User',
    });
    const userId = (await createResp.json()).data.id;

    // Delete user
    const deleteResp = await apiClient.delete(`/users/${userId}`);
    expect(deleteResp.status()).toBe(204);
  });
});
```

---

## 13. Visual Regression Testing Basics

### Visual Test Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  snapshotDir: path.join(__dirname, 'tests/__snapshots__'),
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-{platform}{ext}',

  projects: [
    {
      name: 'chromium-visual',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  use: {
    // Stricter tolerances for visual tests
    maxDiffPixels: 0,
    threshold: 0.2,
  },
});
```

### Visual Test Patterns

```typescript
// tests/visual/components.spec.ts
import { test } from '@playwright/test';

test.describe('@visual component snapshots', () => {
  test('login page layout', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Capture full page
    await expect(page).toHaveScreenshot('login-page.png');

    // Or specific component
    await expect(page.locator('form')).toHaveScreenshot('login-form.png');
  });

  test('dashboard header on desktop', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('header')).toHaveScreenshot('header-desktop.png');
  });

  test('responsive layout on mobile', async ({ page }) => {
    page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard-mobile.png');
  });
});
```

### Update Visual Snapshots

```bash
npm test -- --update-snapshots
# Or for specific file
npx playwright test tests/visual/components.spec.ts --update-snapshots
```

---

## 14. pnpm Workspace Configuration (Optional)

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'tests'
```

### Root package.json

```json
{
  "name": "test-monorepo",
  "private": true,
  "workspaces": ["packages/*", "tests"],
  "scripts": {
    "test": "pnpm -r test",
    "test:app": "pnpm --filter app test",
    "test:tests": "pnpm --filter @tests test"
  }
}
```

### tests/package.json

```json
{
  "name": "@tests/automation",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:smoke": "playwright test --grep @smoke"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

---

## Key Recommendations

### 1. **Configuration Complexity**
- Start simple, add complexity only when needed (KISS principle)
- Project matrix best kept under 5-6 variants in local runs
- Use CI env to expand matrix (all browsers, all platforms)

### 2. **Fixture Architecture**
- Page objects → Locators, navigation, actions
- Fixtures → Combine page objects into reusable contexts
- Factories → Generate test data dynamically
- Never hardcode credentials; use environment variables

### 3. **Test Organization**
- Group by feature/module with `test.describe()`
- Use annotations consistently (@smoke, @regression)
- Separate API tests from E2E tests (different fixtures, different concerns)

### 4. **CI/CD Integration**
- Retries in CI only (prevent flaky test masking)
- Single worker in CI (determinism)
- Parallel workers in local (fast feedback)
- Trace + screenshot on failure (debugging)

### 5. **Reporting & Observability**
- HTML reporter for local development
- Allure reporter for CI/team visibility (historical trends)
- JUnit XML for CI/CD tool integration
- Always attach artifacts (trace, video, screenshot)

### 6. **Security**
- Never commit `.env` files
- Use `.env.local` for local secrets
- Load from environment at runtime
- Rotate test credentials regularly

---

## Unresolved Questions

1. **Database Seeding Strategy**: Should seeding happen in global setup or per-test? (Depends on test isolation requirements)
2. **Multi-region Testing**: How to handle different API base URLs per region? (Recommend config matrix + environment overrides)
3. **Flake Detection**: Should failed retries be counted separately in reporting? (Yes, use Allure's flaky status)
4. **Performance Thresholds**: What are acceptable test execution times for CI? (Smoke: <5min, Regression: <30min, All: <60min)
5. **Cross-browser Scheduling**: Run all browsers sequentially or select subset per PR? (Recommend feature + chromium in PR, full matrix on main)

---

## References & Further Reading

- **Official Docs**: playwright.dev/docs
- **Config API**: playwright.dev/docs/api/class-testconfig
- **Allure Integration**: github.com/allure-framework/allure-playwright
- **Best Practices**: playwright.dev/docs/best-practices
- **Debugging**: playwright.dev/docs/debug

---

**Report Status:** Complete | **Estimated Implementation Time:** 4-8 hours (new project)
