# Phase 05 — Documentation

**Status:** ⬜ pending
**Priority:** Medium
**Can run parallel with:** Phase 04
**Plan:** [plan.md](./plan.md)

---

## Overview

Create essential documentation for AQA team onboarding and daily usage.
Keep docs concise — team members should be productive in < 10 minutes.

---

## Files to Create

```
README.md                    # Root: getting started, commands, structure
docs/
├── pom-guidelines.md        # Page Object Model conventions for the team
├── test-patterns.md         # Tags, data-driven, fixtures patterns
└── ci-cd-guide.md           # GitHub Actions setup, secrets, report access
```

---

## Implementation Steps

### 1. `README.md` (project root)

````markdown
# test-aqa

Playwright-based AQA framework for the QA engineering team.

**Stack:** TypeScript · Playwright · pnpm · Allure · GitHub Actions

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Install browsers
npx playwright install

# 3. Copy and fill environment variables
cp .env.example .env.local
# Edit .env.local with real credentials
```

### Run Tests

```bash
# Smoke tests (fast, ~2 min)
pnpm test:smoke

# Regression tests
pnpm test:regression

# E2E tests
pnpm test:e2e

# API tests
pnpm test:api

# All tests, headed (visible browser)
pnpm test:headed

# Interactive debug mode
pnpm test:debug

# Playwright UI mode (visual runner)
pnpm test:ui
```

### Reports

```bash
# Open Playwright HTML report
pnpm report

# Open Allure report
pnpm report:allure

# Generate new test code via Playwright Codegen
pnpm codegen
```

### Code Quality

```bash
pnpm lint          # ESLint
pnpm format        # Prettier
pnpm type-check    # TypeScript
```

---

## Project Structure

```
test-aqa/
├── src/
│   ├── config/       # Env config, timeouts
│   ├── pages/        # Page Object Model classes
│   ├── fixtures/     # Playwright fixtures (auth, api, pages)
│   ├── helpers/      # Reusable helpers (wait, data, assertions)
│   ├── api/          # API client and endpoint wrappers
│   └── utils/        # Logger, retry, allure helpers
│
├── tests/
│   ├── smoke/        # @smoke — quick sanity (~2 min, Chrome only)
│   ├── regression/   # @regression — full feature coverage
│   ├── e2e/          # @e2e — multi-step user journeys
│   └── api/          # @api — direct API validation
│
├── data/             # Test data: JSON fixtures + factories
├── .github/
│   └── workflows/    # CI/CD pipelines
└── docs/             # Team guidelines
```

---

## Tags

Use tags in test titles to control which tests run:

| Tag | Purpose | Runs in CI |
|-----|---------|-----------|
| `@smoke` | Critical path, < 2 min | Every push |
| `@regression` | Full feature coverage | Every push (sharded) |
| `@e2e` | Multi-step flows | Nightly |
| `@api` | API-only tests | Every push |
| `@critical` | Business-critical, never skip | Every push |
| `@slow` | Long-running, intentionally excluded from fast runs | Nightly |

Run by tag:
```bash
npx playwright test --grep @smoke
npx playwright test --grep "@smoke|@critical"
```

---

## Docs

- [Page Object Model Guidelines](docs/pom-guidelines.md)
- [Test Patterns](docs/test-patterns.md)
- [CI/CD Guide](docs/ci-cd-guide.md)
````

---

### 2. `docs/pom-guidelines.md`

````markdown
# Page Object Model Guidelines

## Rules

1. **One class per page/feature** — `LoginPage`, `DashboardPage`, not `AuthPage` doing everything
2. **Lazy locators** — use `get` accessors, not constructor assignments
3. **Business methods only** — expose `login(email, pass)`, not raw `fill()` calls
4. **No assertions in page classes** — assertions belong in tests
5. **No test logic** — no conditionals, loops, or expectations inside page classes
6. **Extend `BasePage`** — inherit shared `goto()`, `fill()`, `assertVisible()`

## File naming

```
src/pages/login.page.ts
src/pages/checkout.page.ts
src/pages/user-profile.page.ts
```

## Template

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MyFeaturePage extends BasePage {
  // Lazy locators — evaluated on access, not on construction
  get primaryAction() { return this.page.locator('[data-testid="primary-action"]'); }
  get statusMessage() { return this.page.locator('[data-testid="status"]'); }

  // Navigation
  async navigate(): Promise<void> {
    await this.goto('/my-feature');
  }

  // Business actions (hide implementation details from tests)
  async performAction(input: string): Promise<void> {
    await this.primaryAction.fill(input);
    await this.primaryAction.press('Enter');
  }
}
```

## Adding a new page

1. Create `src/pages/my-feature.page.ts` extending `BasePage`
2. Add fixture in `src/fixtures/pages.fixture.ts`:
   ```typescript
   myFeaturePage: async ({ page }, use) => {
     await use(new MyFeaturePage(page));
   },
   ```
3. Import in tests: `import { test } from '@fixtures/index';`
````

---

### 3. `docs/test-patterns.md`

````markdown
# Test Patterns

## Import convention

Always import `test` and `expect` from the central fixture:

```typescript
import { test, expect } from '@fixtures/index';
```

## Tag pattern

Tags go at the start of the test title:

```typescript
test('@smoke @critical login works', async ({ loginPage, page }) => { ... });
test('@regression invalid password shows error', async ({ loginPage }) => { ... });
```

## Data-driven tests

Use an array of cases + `for...of`:

```typescript
const cases = [
  { email: 'valid@example.com', expectSuccess: true },
  { email: 'bad-email', expectSuccess: false },
];

for (const c of cases) {
  test(`@regression login with "${c.email}"`, async ({ loginPage, page }) => {
    await loginPage.login(c.email, 'Password123!');
    if (c.expectSuccess) {
      await expect(page).toHaveURL(/dashboard/);
    } else {
      await expect(loginPage.errorAlert).toBeVisible();
    }
  });
}
```

## Authenticated tests

Use `userContext` fixture for tests requiring a logged-in user:

```typescript
test('@regression dashboard loads', async ({ userContext }) => {
  const page = await userContext.newPage();
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.close();
});
```

## API tests

Use `apiClient` fixture for direct API calls:

```typescript
test('@api GET /users returns list', async ({ apiClient }) => {
  const users = await apiClient.get('/users');
  expect(Array.isArray(users)).toBe(true);
});
```

## Random test data

Use `DataHelper` or `UserFactory` for dynamic data:

```typescript
import { DataHelper } from '@helpers/data.helper';
import { UserFactory } from '@data/user.factory';

const user = DataHelper.user(); // random user
const admin = UserFactory.createAdmin();
```

## Allure annotations

```typescript
import { allure } from '@utils/allure-utils';

test('@regression create order', async ({ page }) => {
  allure.feature('Orders');
  allure.story('Create Order');
  allure.testId('ORD-001');
  allure.severity('critical');
  // ...
});
```
````

---

### 4. `docs/ci-cd-guide.md`

````markdown
# CI/CD Guide

## Pipelines

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test-ci.yml` | Push / PR to `main`, `develop` | Lint + Smoke + Regression (sharded) + API |
| `test-schedule.yml` | Daily 01:00 UTC + manual | Full suite on all browsers |
| `test-report.yml` | After `Test CI` completes | Publish Allure to GitHub Pages |

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Example |
|--------|---------|
| `BASE_URL` | `https://staging.example.com` |
| `API_BASE_URL` | `https://staging.example.com/api` |
| `TEST_USER_EMAIL` | `qa-user@example.com` |
| `TEST_USER_PASSWORD` | `(from password manager)` |
| `TEST_ADMIN_EMAIL` | `qa-admin@example.com` |
| `TEST_ADMIN_PASSWORD` | `(from password manager)` |

## Enable GitHub Pages

1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `gh-pages` / `/ (root)`
4. Reports will be at: `https://<org>.github.io/<repo>/reports/<run-number>`

## Running CI manually

Go to **Actions → Nightly Full Suite → Run workflow** to trigger manually.

## Viewing reports

- **PR comments** — auto-posted with report link when GitHub Pages is enabled
- **Artifacts** — download from Actions run → Artifacts section
- **Local** — `pnpm report` or `pnpm report:allure` after a local run

## Adding a new browser to CI

Edit `.github/workflows/test-schedule.yml`, add to `matrix.browser`:
```yaml
matrix:
  browser: [chromium, firefox, webkit, mobile-chrome]
```
````

---

## Todo

- [ ] Create `README.md`
- [ ] Create `docs/pom-guidelines.md`
- [ ] Create `docs/test-patterns.md`
- [ ] Create `docs/ci-cd-guide.md`

---

## Success Criteria

- New team member can run first test within 10 minutes following README
- `docs/pom-guidelines.md` clearly defines team conventions
- `docs/test-patterns.md` covers all fixture usage patterns
- `docs/ci-cd-guide.md` explains secrets and report access
