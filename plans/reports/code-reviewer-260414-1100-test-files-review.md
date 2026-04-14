# Code Review: Playwright Test Files (5 files)

**Date:** 2026-04-14
**Reviewer:** code-reviewer
**Scope:** 5 newly created test files + supporting context

---

## Scope

| File | LOC |
|------|-----|
| `tests/smoke/auth.smoke.spec.ts` | 25 |
| `tests/regression/auth/login.spec.ts` | 55 |
| `tests/regression/auth/login-data-driven.spec.ts` | 56 |
| `tests/e2e/user-onboarding.e2e.spec.ts` | 36 |
| `tests/api/users.api.spec.ts` | 63 |

Context read: `src/fixtures/index.ts`, all fixture files, `login.page.ts`, `users.endpoint.ts`, `user.factory.ts`, `api-client.ts`, `base.page.ts`, `allure-utils.ts`, `environments.ts`, `tsconfig.json`, `playwright.config.ts`, `annotations.ts`.

---

## Overall Assessment

The test suite is well-structured with consistent patterns, proper fixture usage, and clean separation of concerns. TypeScript compilation is clean. Three blocking issues exist: an unsafe `beforeEach` fixture leak in the logout test, unguarded empty-string credentials flowing to a real auth endpoint, and cleanup code that is not teardown-safe. Several medium/low issues are documented below.

---

## Critical Issues

### C1 - `login.spec.ts` line 42: `userContext` fixture mixed into `loginPage`-scoped describe block — logout test bypasses `beforeEach` in a misleading way

**File:** `tests/regression/auth/login.spec.ts`, line 42

**Problem:** All tests in the `describe('Login')` block share a `test.beforeEach` that calls `loginPage.navigate()`. The `logout clears session` test (AUTH-005) does **not** use `loginPage` at all — it creates a brand-new `BrowserContext` via `userContext`, navigates manually, and closes the page itself. The `beforeEach` still fires and performs a `page.goto('/login')` on the default `page` fixture that this test never uses. This causes:

1. A wasted navigation that can mask slow-env failures as unrelated timeouts.
2. `page` and `loginPage` fixtures are instantiated for this test even though they are unused — this will trip `noUnusedParameters` if the fixture destructure is ever narrowed, and it already violates the spirit of fixture isolation.
3. More critically: the logout test opens a **new page** via `userContext.newPage()` but closes it manually (`page.close()`). If the assertions on lines 47 or 52 fail, `page.close()` is never reached, leaking an open page inside the auth context for the rest of the worker's lifetime.

**Fix:** Extract AUTH-005 into a separate `test.describe` block (or a standalone test) that does **not** share the `beforeEach`. Guard the teardown unconditionally:

```typescript
// Separate describe — no beforeEach entanglement
test.describe('Logout', () => {
  test(`${Tag.regression} logout clears session`, async ({ userContext }) => {
    allure.testId('AUTH-005');
    const logoutPage = await userContext.newPage();
    try {
      await logoutPage.goto('/dashboard');
      await expect(logoutPage).toHaveURL(/dashboard/);
      await logoutPage.locator('[data-testid="user-menu"]').click();
      await logoutPage.locator('[data-testid="logout"]').click();
      await expect(logoutPage).toHaveURL(/login/);
    } finally {
      await logoutPage.close();
    }
  });
});
```

---

### C2 - `users.api.spec.ts`: `beforeEach` callback is missing `async` — `users` variable set in a synchronous callback but typed as `UsersEndpoint`

**File:** `tests/api/users.api.spec.ts`, line 10

**Problem:**
```typescript
test.beforeEach(({ apiClient }) => {   // ← no async
  users = new UsersEndpoint(apiClient);
});
```
The callback is synchronous and the assignment completes before the test, which _happens_ to work because `UsersEndpoint` constructor is synchronous. However:

1. `apiClient` is an async fixture resolved by Playwright's DI. The destructuring `{ apiClient }` works because Playwright passes the already-resolved fixture object to the callback. This is safe today but the pattern breaks if `apiClient` is ever made lifecycle-async (e.g., needs token refresh on setup).
2. `noUnusedParameters` is enabled. The parameter `{ apiClient }` is used, so no immediate compile error — but if someone later adds a second fixture to the destructure "just to have it available," it will silently compile and then fail the linter in a separate pass. Marking the callback `async` is a Playwright best-practice baseline.

**Fix:**
```typescript
test.beforeEach(async ({ apiClient }) => {
  users = new UsersEndpoint(apiClient);
});
```

---

### C3 - `users.api.spec.ts` lines 27-37 and 43-51: Cleanup in test body is not teardown-safe

**File:** `tests/api/users.api.spec.ts`

**Problem:** POST and GET-by-id tests create a user and then call `await users.delete(created.id)` at the bottom of the test body. If any assertion between creation and deletion throws, the cleanup is skipped. Over repeated CI runs this accumulates orphaned test users in the target environment.

**Fix:** Use `test.afterEach` with a tracked ID, or wrap in try/finally:

```typescript
test(`${Tag.api} POST /users creates new user`, async () => {
  allure.testId('API-USERS-002');
  const payload = UserFactory.create();
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
});
```

Alternatively, push created IDs to an array and delete in `test.afterEach`.

---

## High Priority

### H1 - `login.spec.ts` / `auth.smoke.spec.ts`: Empty-string credentials reach the real endpoint

**Files:** `tests/regression/auth/login.spec.ts` lines 31, 38; `tests/regression/auth/login-data-driven.spec.ts` case AUTH-DD-004

**Problem:** `env.testUser.email` and `env.testUser.password` fall back to `''` when env vars are absent (see `environments.ts` lines 18-19). The tests for "empty email" and "empty password" pass `''` or `env.testUser.password` (which could itself be `''`), meaning in a misconfigured environment the "valid credentials" test and the "empty X" tests become identical. No guard or skip is applied.

The data-driven case AUTH-DD-004 deliberately submits `email: '', password: ''` — which is correct for a form-validation test — but if the base URL points to a real staging environment, every CI run fires a login attempt with empty credentials against the real auth service.

**Recommendation:** Add a `test.skip` guard at the top of the smoke/regression describe blocks for missing credentials, and add a `test.use({ baseURL })` override or use a `mockRoute` for the empty-credential validation cases:

```typescript
test.beforeAll(() => {
  if (!env.testUser.email || !env.testUser.password) {
    test.skip(true, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');
  }
});
```

---

### H2 - `login-data-driven.spec.ts`: `page` fixture is destructured but never used in the error-only branches

**File:** `tests/regression/auth/login-data-driven.spec.ts`, line 42

```typescript
async ({ loginPage, page }) => {   // `page` used only when !c.expectError
```

With `noUnusedLocals: true` and `noUnusedParameters: true` enabled, TypeScript currently passes because `page` **is** referenced (line 53 `await expect(page).toHaveURL(...)`). However, for test cases where `c.expectError === true` (3 of 4 cases), `page` is allocated but its fixture cost (a new browser page) is paid by all iterations. This is a minor performance concern in a large data-driven suite.

More importantly: the `page` fixture is provided by Playwright regardless of use, so no runtime impact today — but if the suite grows to hundreds of data rows, each iteration holding an open `page` during the assertion phase adds memory pressure.

**Recommendation:** Restructure so that success-path and error-path assertions share the `loginPage.assertUrl` / `loginPage.errorAlert` helpers rather than importing the raw `page` fixture:

```typescript
// In LoginPage:
async assertRedirectedToDashboard(): Promise<void> {
  await this.assertUrl(/dashboard/);
}
```

Then `page` can be removed from the destructure entirely.

---

### H3 - `users.api.spec.ts` line 8: module-level mutable `let users` shared across tests

**File:** `tests/api/users.api.spec.ts`, line 8

```typescript
let users: UsersEndpoint;
```

This is a module-level variable assigned in `beforeEach`. With `fullyParallel: true` in `playwright.config.ts`, each worker runs its own module instance so there is no cross-worker race. However, within a single worker the pattern means all tests in the describe block share one mutable slot. If Playwright ever runs hooks out of expected order (e.g., skipped test, retry), `users` could be the wrong instance.

**Preferred pattern:** Declare inside each test via a helper, or pass through a fixture:

```typescript
// Option A: local variable per test
test(`${Tag.api} GET /users returns array`, async ({ apiClient }) => {
  const users = new UsersEndpoint(apiClient);
  ...
});
```

This is more verbose but perfectly isolated. Given only 4 tests share this context, the repetition is acceptable under KISS.

---

## Medium Priority

### M1 - `auth.smoke.spec.ts` line 23: raw `page.locator` used instead of the `loginPage` fixture

**File:** `tests/smoke/auth.smoke.spec.ts`, line 23

```typescript
await expect(page.locator('[data-testid="submit"]')).toBeVisible();
```

The `loginPage` fixture is available (imported via `@fixtures/index`) and `LoginPage.submitButton` already wraps this exact locator. Using the raw locator in a test duplicates a selector string and bypasses the Page Object Model abstraction. If the selector changes, this test will be missed.

**Fix:**
```typescript
test(`${Tag.smoke} login page loads`, async ({ loginPage }) => {
  // ...
  await loginPage.navigate();
  await expect(loginPage.submitButton).toBeVisible();
});
```

Note: `page` fixture can then be removed from the destructure, eliminating one unused fixture allocation.

---

### M2 - `login.spec.ts` line 24-25: mixing `await loginPage.getErrorMessage()` with non-awaited `expect`

**File:** `tests/regression/auth/login.spec.ts`, lines 24-25

```typescript
const error = await loginPage.getErrorMessage();
expect(error).toContain('Invalid');
```

`getErrorMessage()` internally calls `waitFor()` (blocking) then `textContent()`. This is correct. However, `expect(error).toContain(...)` is a synchronous Jest-style assertion on a plain string — it does not use Playwright's `expect` with retry/auto-wait semantics. For a string that is already resolved, this is fine. But it is inconsistent with the rest of the suite, which uses `await expect(locator).toBeVisible()` / `toContainText()`. The `loginPage.errorAlert` locator is available; prefer:

```typescript
await expect(loginPage.errorAlert).toContainText('Invalid');
```

This is shorter, uses Playwright's retry logic, and removes the intermediate variable (avoiding a potential `noUnusedLocals` flag if someone removes the `expect` line).

---

### M3 - `user-onboarding.e2e.spec.ts`: No cleanup of the registered user after test

**File:** `tests/e2e/user-onboarding.e2e.spec.ts`

The test registers a new user via the UI but does not clean up the created account. Over time this pollutes the staging DB. If the test is retried (CI retries: 2), it will attempt to register the same email twice — `faker.internet.email()` is re-called per test run so retry would get a different email, but if the **same** worker retries without re-running the factory, the second attempt uses the same `user` local variable and may fail at the email-uniqueness check.

**Recommendation:** Either use the `UsersEndpoint` in an `afterEach`/`afterAll` to delete the user via API, or route through a test-admin API that bulk-deletes by email pattern after each run.

---

### M4 - `login-data-driven.spec.ts`: No `allure.testId` on dynamically generated tests

**File:** `tests/regression/auth/login-data-driven.spec.ts`

The `id` field in each `LoginCase` is defined but never passed to `allure.testId()`. The test title includes `[AUTH-DD-001]` etc., which appears in Playwright's HTML reporter, but the Allure report will not link these tests to their IDs. Consistent with how all other tests call `allure.testId(c.id)` inside the test body:

```typescript
test(`${Tag.regression} [${c.id}] login email="${c.email}"`, async ({ loginPage, page }) => {
  allure.testId(c.id);   // ← add this
  await loginPage.navigate();
  ...
```

---

### M5 - `user-onboarding.e2e.spec.ts`: `test.setTimeout` set at describe-level affects all workers globally in Playwright ≥ 1.38

**File:** `tests/e2e/user-onboarding.e2e.spec.ts`, line 7

`test.setTimeout(120_000)` inside a `test.describe` block is valid Playwright API, but it sets the timeout for **all tests in the describe block**, not just the one E2E test inside it. If more tests are added to this describe in the future without needing the extended timeout, they will silently inherit 120s. Prefer setting timeout per-test:

```typescript
test(`${Tag.e2e} ...`, async ({ page }) => {
  test.setTimeout(120_000);
  ...
```

Or keep at describe level with a comment explaining it applies to all tests in the block.

---

## Low Priority

### L1 - `auth.smoke.spec.ts` line 9: `allure.severity('critical')` alongside `Tag.critical` in title is redundant

Both `${Tag.critical}` in the test name and `allure.severity('critical')` in the body encode the same signal. This is not wrong, but the Allure severity annotation is the canonical place; the title tag is for grep-based filtering. Consider either:
- Keeping both (current approach) but documenting the distinction in a comment.
- Removing `allure.severity` from tests that already carry `Tag.critical` in the title if the Allure reporter picks up `@critical` from test names via its label extractor.

---

### L2 - `login-data-driven.spec.ts`: Test title leaks `email` value including empty string

Line 42:
```typescript
test(`${Tag.regression} [${c.id}] login email="${c.email}"`, ...)
```

For case AUTH-DD-004 this renders as `login email=""` which is fine, but for case AUTH-DD-002 it renders `login email="wrong@example.com"` — a real-looking email in test reports. If this suite is run against production-adjacent infra with audit logging, test titles containing email-like strings may show up in access logs. Low risk in a test project, but worth being aware of.

---

### L3 - `users.api.spec.ts` line 61: `rejects.toThrow()` is permissive

```typescript
await expect(users.getById(created.id)).rejects.toThrow();
```

This passes for any thrown error, including network timeouts, DNS failures, or 500s. Prefer asserting on the specific 404 message emitted by `ApiClient.parseResponse`:

```typescript
await expect(users.getById(created.id)).rejects.toThrow(/404/);
```

---

## Positive Observations

- Fixture architecture is clean: `mergeTests` composition in `@fixtures/index` is idiomatic and avoids fixture re-declaration.
- `LoginPage` lazy locators (getter pattern) follow Playwright best practices — no stale element references.
- `BasePage.fill` correctly calls `clear()` before `fill()` to prevent stale-value accumulation in inputs.
- `UserFactory.create(overrides)` with a fixed password (`TestPass123!`) is pragmatic; avoids test fragility from random passwords while still randomising identity fields.
- `allure-utils.ts` wrapper over `test.info().annotations` is a clean approach — avoids the heavier `allure-js` integration while still producing Allure-compatible annotation data.
- `auth.fixture.ts` throws a descriptive error when the auth cache is missing, which surfaces misconfiguration quickly rather than silently proceeding with an empty context.
- `playwright.config.ts` correctly uses `fullyParallel: true` with `grep`-based project separation for smoke vs regression.
- Data-driven loop using `for...of` outside `test.describe` is a valid Playwright pattern and keeps test titles indexable.
- `noUnusedLocals` / `noUnusedParameters` are both enabled and the current code passes — good discipline.

---

## Recommended Actions (Prioritised)

1. **[C1]** Extract AUTH-005 (`logout clears session`) out of the shared `beforeEach` describe block; wrap `logoutPage.close()` in `finally`.
2. **[C2]** Add `async` to the `beforeEach` callback in `users.api.spec.ts`.
3. **[C3]** Wrap `users.delete` cleanup in `try/finally` in API tests or move to `afterEach`.
4. **[H1]** Add `test.skip` guard for missing `env.testUser` credentials in smoke and regression suites.
5. **[H3]** Consider replacing the module-level `let users` with a per-test local variable.
6. **[M1]** Use `loginPage.submitButton` instead of raw `page.locator` in `auth.smoke.spec.ts` second test.
7. **[M2]** Replace `expect(string).toContain()` with `await expect(locator).toContainText()` in login.spec.ts AUTH-002.
8. **[M4]** Add `allure.testId(c.id)` inside the data-driven test body.
9. **[M3]** Add API-based cleanup for the registered user in the onboarding E2E test.
10. **[L3]** Narrow `rejects.toThrow()` to `rejects.toThrow(/404/)` in DELETE test.

---

## Metrics

| Metric | Value |
|--------|-------|
| TypeScript compile | Pass (confirmed by prompt) |
| Blocking issues | 3 (C1, C2, C3) |
| High priority | 3 (H1, H2, H3) |
| Medium priority | 5 (M1–M5) |
| Low priority | 3 (L1–L3) |
| Test isolation violations | 1 (C1 — page leak on assertion failure) |
| Cleanup safety gaps | 2 (C3, M3) |

---

## Unresolved Questions

1. Does the Allure reporter for this project pick up `@critical` / `@smoke` tags from test names as Allure labels, or only via `allure.severity()`? If the former, L1 (double-annotation) is a real deduplication concern.
2. Is there a global-setup teardown that purges test users created during E2E runs? If yes, M3 (onboarding cleanup) may already be covered.
3. The `chromium` project uses `grepInvert: /@smoke/` — this means `@api` tests run under the `chromium` browser project even though they are purely HTTP tests. Is there a headless/API-only project intended, or is this by design (browser project provides the `request` fixture)?

---

**Status:** DONE_WITH_CONCERNS
**Summary:** 5 test files reviewed; overall structure is solid. Three blocking issues (page leak on test failure, missing async on beforeEach, unsafe cleanup) must be fixed before merging.
**Concerns:** C1 page-leak and C3 orphaned-data could cause flakiness and environment pollution in CI; both are straightforward fixes.
