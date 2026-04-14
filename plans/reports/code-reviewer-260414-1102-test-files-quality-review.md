# Code Review: Playwright Test Files Quality Review

**Date:** 2026-04-14
**Reviewer:** code-reviewer
**Report:** code-reviewer-260414-1102-test-files-quality-review.md

---

## Scope

| File | LOC | Type |
|------|-----|------|
| `tests/smoke/auth.smoke.spec.ts` | 25 | Smoke |
| `tests/regression/auth/login.spec.ts` | 55 | Regression |
| `tests/regression/auth/login-data-driven.spec.ts` | 56 | Data-driven regression |
| `tests/e2e/user-onboarding.e2e.spec.ts` | 36 | E2E |
| `tests/api/users.api.spec.ts` | 63 | API |

Context files read: `src/fixtures/index.ts`, `src/fixtures/{auth,api,pages}.fixture.ts`, `tests/annotations.ts`, `tsconfig.json`, `src/api/api-client.ts`, `src/api/endpoints/users.endpoint.ts`, `data/user.factory.ts`, `src/config/environments.ts`, `src/utils/allure-utils.ts`

---

## Overall Assessment

Files are clean, readable, and follow established patterns. TypeScript strictness (`noUnusedLocals`, `noUnusedParameters`, `strict`) is satisfied. No critical blocking issues. Three medium-priority findings and several low-priority observations are noted below.

---

## Critical Issues

None.

---

## High Priority

### H1 — `users.api.spec.ts`: Shared mutable state via module-level `let` (test isolation risk)

**File:** `tests/api/users.api.spec.ts`, lines 8–12

```typescript
let users: UsersEndpoint;        // ← module-level mutable variable

test.beforeEach(({ apiClient }) => {
  users = new UsersEndpoint(apiClient);  // ← re-assigned every beforeEach
});
```

`beforeEach` receives a fresh `apiClient` fixture per test, so functionally it reassigns correctly. However the `let` at module scope is a shared-state smell: if Playwright ever runs tests in the same worker concurrently (e.g. `fullyParallel: true` within a file), the assignment from one test's `beforeEach` can overwrite another's before the test body runs. The idiomatic Playwright pattern avoids this entirely by passing the endpoint via a local fixture or inline construction.

**Fix — use fixture parameter directly:**
```typescript
// Option A: inline construction, zero shared state
test(`${Tag.api} GET /users returns array`, async ({ apiClient }) => {
  const users = new UsersEndpoint(apiClient);
  const result = await users.getAll();
  expect(Array.isArray(result)).toBe(true);
});

// Option B: add UsersEndpoint as a custom fixture in api.fixture.ts
usersEndpoint: async ({ apiClient }, use) => {
  await use(new UsersEndpoint(apiClient));
},
```

Option B (custom fixture) is preferred — keeps test bodies focused and makes the dependency explicit in the fixture graph. Option A is acceptable for a small file.

---

### H2 — `users.api.spec.ts`: Cleanup not guaranteed on assertion failure (data leak risk)

**File:** `tests/api/users.api.spec.ts`, lines 26–37 and 43–51

```typescript
const created = await users.create(payload);
expect(created).toMatchObject({ ... });      // ← if this throws, delete is skipped
await users.delete(created.id);              // ← orphaned test data
```

If any assertion between `create` and `delete` throws, the created record is never deleted. This accumulates test data in the target environment over time and can cause cross-test pollution (e.g. duplicate-email constraints if the factory's `faker.internet.email()` ever collides, or list-count assertions becoming non-deterministic).

**Fix — use try/finally:**
```typescript
const created = await users.create(payload);
try {
  expect(created).toMatchObject({
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
  });
  expect(created.id).toBeDefined();
} finally {
  await users.delete(created.id);
}
```

Alternatively, register cleanup via `test.afterEach` or a fixture teardown to keep the test body free of try/finally.

---

## Medium Priority

### M1 — `login.spec.ts` AUTH-005: Page opened inside test is not closed on failure

**File:** `tests/regression/auth/login.spec.ts`, lines 42–54

```typescript
test(`${Tag.regression} logout clears session`, async ({ userContext }) => {
  const page = await userContext.newPage();
  // ...
  await page.close();   // ← not called if any assertion above throws
});
```

Same pattern as H2. If the URL assertion or locator click fails, `page.close()` is skipped. `userContext` itself is closed by the fixture teardown, so browser resources are eventually reclaimed, but any server-side session left open can interfere with environment state.

**Fix:**
```typescript
const page = await userContext.newPage();
try {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
  await page.locator('[data-testid="user-menu"]').click();
  await page.locator('[data-testid="logout"]').click();
  await expect(page).toHaveURL(/login/);
} finally {
  await page.close();
}
```

---

### M2 — `login-data-driven.spec.ts`: Test cases loop outside `test.describe`, no Allure annotation

**File:** `tests/regression/auth/login-data-driven.spec.ts`, lines 41–56

Two observations:

1. The `for` loop generates tests at module level without a wrapping `test.describe`. All other test files use `describe`. This breaks grouping in Playwright HTML reports and Allure dashboards.

2. None of the generated tests call `allure.testId(c.id)` inside the test body, so the `id` field on each `LoginCase` is unused (except in the title string). The intent seems to be Allure tracking, but without the annotation it won't be picked up by the reporter.

**Fix:**
```typescript
test.describe('Login Data-Driven', () => {
  for (const c of cases) {
    test(`${Tag.regression} [${c.id}] login email="${c.email}"`, async ({ loginPage, page }) => {
      allure.testId(c.id);          // ← wire the id to Allure
      allure.feature('Authentication');
      await loginPage.navigate();
      // ...
    });
  }
});
```

---

## Low Priority

### L1 — `auth.smoke.spec.ts`: Inline locator string duplicates selector used in other tests

**File:** `tests/smoke/auth.smoke.spec.ts`, line 23

```typescript
await expect(page.locator('[data-testid="submit"]')).toBeVisible();
```

The `LoginPage` page object already exposes locators. Bypassing the page object here creates two maintenance points for the same selector. Consistent use of the page object (`loginPage.submitButton`) would be preferable — though the test only uses `{ page }` and not `{ loginPage }` because it intentionally tests raw navigation. Either add `loginPage` to the fixture destructuring, or document why raw `page` is used here.

---

### L2 — `env` config: empty-string credentials silently accepted

**File:** `src/config/environments.ts`, lines 18–21

```typescript
testUser: {
  email: process.env.TEST_USER_EMAIL || '',    // ← falls through to empty string
  password: process.env.TEST_USER_PASSWORD || '',
},
```

If `.env.local` is missing or variables are unset, `env.testUser.email` is `''` and tests like `login.spec.ts AUTH-001` will pass an empty string to the login form and likely fail with a confusing error rather than a clear misconfiguration message. This is not a test-file issue per se, but login tests depend directly on `env.testUser.*`.

**Fix — fail fast at config load time:**
```typescript
function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

testUser: {
  email: requireEnv('TEST_USER_EMAIL'),
  password: requireEnv('TEST_USER_PASSWORD'),
},
```

---

### L3 — `UserFactory.create()`: fixed `password` hardcoded

**File:** `data/user.factory.ts`, line 15

```typescript
password: 'TestPass123!',
```

Password is the same for every factory-created user. If the application enforces password uniqueness or rate-limits repeated use of the same credential pattern, this could cause intermittent failures at scale. Low risk for current test volume but worth noting.

---

### L4 — `allure-utils.ts`: uses `test.info()` outside test context — silent failure risk

**File:** `src/utils/allure-utils.ts`

`test.info()` throws at runtime if called outside an active Playwright test context (e.g. in module-level setup code). The current usages are all inside test bodies, so this is fine today. Consider adding a guard or a JSDoc warning to prevent future misuse:

```typescript
/** Call only from within an active test body — test.info() is unavailable outside. */
export const allure = { ... };
```

---

## Checklist Results

| Item | Status | Notes |
|------|--------|-------|
| TypeScript strictness (noUnusedLocals, noUnusedParameters) | Pass | type-check confirmed zero errors |
| Playwright fixture usage patterns | Pass with note | H1: shared `let` in api spec |
| Test independence / no shared mutable state | Partial | H1, H2, M1 |
| Allure annotation correctness | Partial | M2: data-driven tests missing `allure.testId()` call in body |
| Import paths use correct aliases | Pass | All imports use `@fixtures`, `@utils`, `@config`, `@api`, `@data` |
| DRY / KISS / YAGNI | Pass | No duplication beyond L1 |
| Critical issues blocking merge | None | |

---

## Recommended Actions (Priority Order)

1. **(H1)** Replace `let users` + `beforeEach` assignment with a custom `usersEndpoint` fixture or inline construction in `users.api.spec.ts`.
2. **(H2)** Wrap create→assert→delete sequences in `try/finally` in `users.api.spec.ts` (tests API-USERS-002 and API-USERS-003).
3. **(M1)** Wrap the manual `page` lifecycle in AUTH-005 in `try/finally` in `login.spec.ts`.
4. **(M2)** Wrap data-driven cases in `test.describe` and add `allure.testId(c.id)` inside each generated test body in `login-data-driven.spec.ts`.
5. **(L2)** Add `requireEnv` guard in `src/config/environments.ts` to surface missing credentials at startup.
6. **(L1)** Either add `loginPage` fixture to the second smoke test or add a comment explaining the intentional raw-page approach.

---

## Positive Observations

- Fixture architecture is clean: three orthogonal fixture files merged via `mergeTests`, each under 20 lines. Easy to extend without breaking existing tests.
- `auth.fixture.ts` correctly closes `BrowserContext` in fixture teardown — no browser resource leaks.
- `api-client.ts` centralises status checking in `parseResponse`, so all API tests get consistent error messages automatically.
- `UserFactory.create(overrides)` pattern is idiomatic and composable.
- `Tag` constants as string literals in test titles enables Playwright `--grep` filtering without additional tooling.
- `LoginCase` interface in the data-driven file makes the shape explicit — good TypeScript practice.
- Test IDs are unique and systematically namespaced (`AUTH-`, `AUTH-DD-`, `E2E-`, `API-USERS-`).
- `test.setTimeout(120_000)` in the E2E spec is appropriately scoped to the describe block, not globally.

---

## Unresolved Questions

1. Is `fullyParallel: true` set in `playwright.config.ts`? If so, H1 is an active race condition; if workers are per-file only, it is a latent risk.
2. Does the DELETE endpoint return a 404 on subsequent calls? `users.api.spec.ts` test API-USERS-004 relies on `rejects.toThrow()` — if the API returns 200 with an empty body instead, the test will pass vacuously.
3. Is there a `global-setup.ts` that hydrates `.auth/*.json` files? AUTH-005 uses `userContext` which requires that file to exist — if global setup is skipped (e.g. `--no-global-setup`), the test throws an opaque filesystem error rather than a skip.

---

**Status:** DONE
**Summary:** 5 test files reviewed. No critical blockers. Two high-priority findings (shared mutable state, unguarded cleanup) and two medium-priority findings (missing describe wrapper, missing allure annotation in data-driven tests) should be addressed before merge. All TypeScript strictness checks pass.
