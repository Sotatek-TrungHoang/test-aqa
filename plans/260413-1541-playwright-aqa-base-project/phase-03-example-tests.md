# Phase 03 — Example Tests

**Status:** ✅ complete
**Priority:** High
**Blocked by:** Phase 02 (fixtures/pages must exist)
**Plan:** [plan.md](./plan.md)

---

## Overview

Scaffold representative tests for each test type: smoke, regression, e2e, and api.
These serve as working examples and templates for the team.

---

## Files to Create

```
tests/
├── smoke/
│   └── auth.smoke.spec.ts
│
├── regression/
│   └── auth/
│       ├── login.spec.ts
│       └── login-data-driven.spec.ts
│
├── e2e/
│   └── user-onboarding.e2e.spec.ts
│
└── api/
    └── users.api.spec.ts
```

---

## Implementation Steps

### 1. `tests/smoke/auth.smoke.spec.ts`

Quick sanity checks. Should run in < 2 min. Chrome only (matches `smoke` project in playwright.config.ts).

```typescript
import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { env } from '@config/environments';

test.describe('Auth Smoke', () => {
  test(`${Tag.smoke} ${Tag.critical} login redirects to dashboard`, async ({ loginPage, page }) => {
    allure.feature('Authentication');
    allure.severity('critical');
    allure.testId('AUTH-SMOKE-001');

    await loginPage.navigate();
    await loginPage.login(env.testUser.email, env.testUser.password);

    await expect(page).toHaveURL(/dashboard/);
  });

  test(`${Tag.smoke} login page loads`, async ({ page }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-SMOKE-002');

    await page.goto('/login');
    await expect(page.locator('[data-testid="submit"]')).toBeVisible();
  });
});
```

### 2. `tests/regression/auth/login.spec.ts`

Full coverage of the login feature.

```typescript
import { test, expect } from '@fixtures/index';
import { Tag } from '../../annotations';
import { allure } from '@utils/allure-utils';
import { env } from '@config/environments';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test(`${Tag.regression} valid credentials → dashboard`, async ({ loginPage, page }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-001');

    await loginPage.login(env.testUser.email, env.testUser.password);
    await expect(page).toHaveURL(/dashboard/);
  });

  test(`${Tag.regression} invalid password → error message`, async ({ loginPage }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-002');

    await loginPage.login(env.testUser.email, 'wrong-password');
    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Invalid');
  });

  test(`${Tag.regression} empty email → validation error`, async ({ loginPage }) => {
    allure.testId('AUTH-003');

    await loginPage.login('', env.testUser.password);
    await expect(loginPage.errorAlert).toBeVisible();
  });

  test(`${Tag.regression} empty password → validation error`, async ({ loginPage }) => {
    allure.testId('AUTH-004');

    await loginPage.login(env.testUser.email, '');
    await expect(loginPage.errorAlert).toBeVisible();
  });

  test(`${Tag.regression} logout clears session`, async ({ userContext }) => {
    allure.testId('AUTH-005');

    const page = await userContext.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);

    // Simulate logout via UI
    await page.locator('[data-testid="user-menu"]').click();
    await page.locator('[data-testid="logout"]').click();
    await expect(page).toHaveURL(/login/);
    await page.close();
  });
});
```

### 3. `tests/regression/auth/login-data-driven.spec.ts`

Data-driven login validation using inline table.

```typescript
import { test, expect } from '@fixtures/index';
import { Tag } from '../../annotations';
import { env } from '@config/environments';

interface LoginCase {
  id: string;
  email: string;
  password: string;
  expectError: boolean;
  errorContains?: string;
}

const cases: LoginCase[] = [
  {
    id: 'AUTH-DD-001',
    email: env.testUser.email,
    password: env.testUser.password,
    expectError: false,
  },
  {
    id: 'AUTH-DD-002',
    email: 'wrong@example.com',
    password: 'badpass',
    expectError: true,
    errorContains: 'Invalid',
  },
  {
    id: 'AUTH-DD-003',
    email: 'notanemail',
    password: 'any',
    expectError: true,
  },
  {
    id: 'AUTH-DD-004',
    email: '',
    password: '',
    expectError: true,
  },
];

for (const c of cases) {
  test(`${Tag.regression} [${c.id}] login email="${c.email}"`, async ({ loginPage, page }) => {
    await loginPage.navigate();
    await loginPage.login(c.email, c.password);

    if (c.expectError) {
      await expect(loginPage.errorAlert).toBeVisible();
      if (c.errorContains) {
        const msg = await loginPage.getErrorMessage();
        expect(msg).toContain(c.errorContains);
      }
    } else {
      await expect(page).toHaveURL(/dashboard/);
    }
  });
}
```

### 4. `tests/e2e/user-onboarding.e2e.spec.ts`

Multi-step user journey. Runs in the `chromium` project with extended timeout.

```typescript
import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { UserFactory } from '@data/user.factory';

test.describe('User Onboarding', () => {
  test.setTimeout(120_000); // Extended timeout for E2E flow

  test(`${Tag.e2e} ${Tag.critical} new user can register and access dashboard`, async ({
    page,
  }) => {
    allure.feature('Onboarding');
    allure.story('User Registration');
    allure.testId('E2E-001');

    const user = UserFactory.create();

    // Step 1: Navigate to register
    await page.goto('/register');
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();

    // Step 2: Fill registration form
    await page.fill('[data-testid="first-name"]', user.firstName);
    await page.fill('[data-testid="last-name"]', user.lastName);
    await page.fill('[data-testid="email"]', user.email);
    await page.fill('[data-testid="password"]', user.password);
    await page.fill('[data-testid="confirm-password"]', user.password);
    await page.click('[data-testid="submit"]');

    // Step 3: Verify redirect to onboarding or dashboard
    await expect(page).toHaveURL(/dashboard|onboarding/);

    // Step 4: Verify user info displayed
    await expect(page.locator('[data-testid="user-name"]')).toContainText(user.firstName);
  });
});
```

### 5. `tests/api/users.api.spec.ts`

Direct API tests using `ApiClient` fixture.

```typescript
import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { UsersEndpoint } from '@api/endpoints/users.endpoint';
import { UserFactory } from '@data/user.factory';

test.describe('Users API', () => {
  let users: UsersEndpoint;

  test.beforeEach(({ apiClient }) => {
    users = new UsersEndpoint(apiClient);
  });

  test(`${Tag.api} ${Tag.smoke} GET /users returns array`, async ({ apiClient }) => {
    allure.feature('Users API');
    allure.testId('API-USERS-001');

    const result = await users.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  test(`${Tag.api} POST /users creates new user`, async () => {
    allure.testId('API-USERS-002');

    const payload = UserFactory.create();
    const created = await users.create(payload);

    expect(created).toMatchObject({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    });
    expect(created.id).toBeDefined();

    // Cleanup
    await users.delete(created.id);
  });

  test(`${Tag.api} GET /users/:id returns specific user`, async () => {
    allure.testId('API-USERS-003');

    // Create via API
    const payload = UserFactory.create();
    const created = await users.create(payload);

    // Fetch by ID
    const fetched = await users.getById(created.id);
    expect(fetched.email).toBe(payload.email);

    // Cleanup
    await users.delete(created.id);
  });

  test(`${Tag.api} DELETE /users/:id removes user`, async () => {
    allure.testId('API-USERS-004');

    const created = await users.create(UserFactory.create());
    await users.delete(created.id);

    // Verify gone (expect 404 or empty)
    await expect(users.getById(created.id)).rejects.toThrow();
  });
});
```

---

## Todo

- [x] Create `tests/smoke/auth.smoke.spec.ts`
- [x] Create `tests/regression/auth/login.spec.ts`
- [x] Create `tests/regression/auth/login-data-driven.spec.ts`
- [x] Create `tests/e2e/user-onboarding.e2e.spec.ts`
- [x] Create `tests/api/users.api.spec.ts`
- [x] Verify `pnpm type-check` passes for all test files
- [x] Confirm `pnpm test:smoke` selects only smoke tests
- [x] Confirm `pnpm test:api` selects only api tests

---

## Success Criteria

- `pnpm test:smoke --dry-run` lists smoke tests without errors
- `pnpm test:regression --dry-run` lists regression tests
- `pnpm test:api --dry-run` lists api tests
- Test files import cleanly from `@fixtures/index`
- No TypeScript errors in any test file
