# Code Review — Phase 02 Core Infrastructure

**Date:** 2026-04-14
**Reviewer:** code-reviewer
**Scope:** Phase 02 AQA infrastructure — config, POM, fixtures, API client, helpers, global setup

---

## Scope

| File | LOC | Status |
|---|---|---|
| `src/config/environments.ts` | 25 | Reviewed |
| `src/config/timeouts.ts` | 13 | Reviewed |
| `src/pages/base.page.ts` | 35 | Reviewed |
| `src/pages/login.page.ts` | 37 | Reviewed |
| `src/pages/dashboard.page.ts` | 32 | Reviewed |
| `src/fixtures/index.ts` | 8 | Reviewed |
| `src/fixtures/pages.fixture.ts` | 17 | Reviewed |
| `src/fixtures/auth.fixture.ts` | 69 | Reviewed |
| `src/fixtures/api.fixture.ts` | 16 | Reviewed |
| `src/api/api-client.ts` | 64 | Reviewed |
| `src/helpers/data.helper.ts` | 32 | Reviewed |
| `src/utils/allure-utils.ts` | 27 | Reviewed |
| `tests/global-setup.ts` | 32 | Reviewed |
| `tests/annotations.ts` | 12 | Reviewed |
| `playwright.config.ts` | 69 | Reviewed |

Total: ~488 LOC

---

## Overall Assessment

Solid, well-structured Phase 02 implementation. POM hierarchy, fixture composition, and API client all follow Playwright best-practice patterns. No hardcoded credentials. The main production-readiness gaps are in the auth caching race condition, an empty-credential silent failure path, and inconsistent timeout contract between `BasePage` assertions and `playwright.config.ts` globals.

**Score: 7.5 / 10**

---

## Critical Issues

### C1 — Race condition in `auth.fixture.ts` session caching (HIGH)

`createAuthContext` checks `fs.existsSync(storageFile)` then proceeds to create or reuse. Under `fullyParallel: true` (enabled in config) with `workers: undefined` (local = max CPUs), two workers can both pass the `existsSync` check simultaneously and both attempt fresh login, with the second write corrupting or overwriting the first.

```typescript
// auth.fixture.ts:25-29  — not safe under parallel workers
if (fs.existsSync(storageFile)) {
  return browser.newContext({ storageState: storageFile });
}
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
// <-- both workers can reach here simultaneously
```

**Fix:** Move all auth caching to `global-setup.ts` (single-process, already the Playwright-recommended pattern). `auth.fixture.ts` should unconditionally load from the file, which `global-setup` guarantees exists. If the file is absent at fixture time, throw a clear error rather than silently re-logging-in and racing.

```typescript
// auth.fixture.ts — safe pattern
if (!fs.existsSync(storageFile)) {
  throw new Error(`Auth cache missing: ${storageFile}. Run globalSetup first.`);
}
return browser.newContext({ storageState: storageFile });
```

---

### C2 — `global-setup.ts` only caches user, not admin (MEDIUM-HIGH)

`global-setup.ts` authenticates only `testUser` and writes `user.json`. It never authenticates `testAdmin`, so `admin.json` never exists before tests run. When `adminContext` fixture runs, it falls into the fresh-login path — again subject to the race described in C1 if multiple workers request `adminContext`.

**Fix:** Add admin auth to `global-setup.ts` alongside user auth. Both sessions are cached before any worker starts.

---

### C3 — Empty credentials produce silent test failures (MEDIUM)

`environments.ts` falls back to empty strings for credentials:

```typescript
email: process.env.TEST_USER_EMAIL || '',
password: process.env.TEST_USER_PASSWORD || '',
```

`global-setup.ts` correctly warns and exits early when credentials are missing. However, `auth.fixture.ts` uses the credentials directly without the same guard — if `global-setup` skips and a fixture tries to login, `loginPage.login('', '')` will be called, producing a misleading auth failure rather than a "credentials not configured" error.

**Fix:** Add a guard in `createAuthContext` or validate credentials at startup with a clear thrown error.

---

## High Priority

### H1 — `BasePage.assertUrl` uses `navigation` timeout; `playwright.config.ts` also sets `navigationTimeout`

`assertUrl` in `base.page.ts` passes `Timeouts.navigation` (30 s) explicitly. But `playwright.config.ts` sets `navigationTimeout: 30_000` globally. When the config timeout differs from the constant the assertion will use whichever Playwright resolves first. This is currently consistent, but the two sources of truth will diverge if either is changed independently.

**Fix:** Remove the explicit `timeout` from `assertUrl` and let the Playwright global `navigationTimeout` govern, or ensure constants in `timeouts.ts` are the single source referenced from `playwright.config.ts` as well.

```typescript
// playwright.config.ts — derive from constants
import { Timeouts } from './src/config/timeouts';
use: {
  actionTimeout: Timeouts.action,
  navigationTimeout: Timeouts.navigation,
}
```

---

### H2 — `ApiClient.parseResponse` casts without validation (`res.json() as Promise<T>`)

```typescript
return res.json() as Promise<T>;
```

This is a TypeScript lie — the runtime value is not validated against `T`. Any shape mismatch will produce silent runtime errors surfacing far from the API call. Acceptable for test code if callers understand it, but documenting this caveat explicitly prevents false confidence.

**Recommendation:** Add a JSDoc note: `// Caller is responsible for verifying the response shape matches T`. For critical endpoints, callers should use a type guard or schema validator (e.g., Zod).

---

### H3 — `DataHelper.user` hardcodes test password as plain string

```typescript
password: 'TestPass123!',
```

For an AQA project this is common and acceptable. However, it creates a false expectation that `password` will always be the static value — if overrides spread after the defaults, the password override does work correctly (good), but if the consuming code assumes the hardcoded password for pre-created accounts the test becomes brittle. This is a low-security risk in test code but worth noting.

---

## Medium Priority

### M1 — `allure-utils.ts` uses `test.info()` at module scope risk

`test.info()` is only valid inside a running test. The `allure` helpers themselves are functions (safe), but if any consuming code calls them outside a test body (e.g., in a `beforeAll` or at module load), Playwright throws an opaque error. A defensive check or JSDoc warning would help.

---

### M2 — `DashboardPage.isLoaded()` races with dynamic content

```typescript
async isLoaded(): Promise<boolean> {
  return this.heading.isVisible();
}
```

`isVisible()` is a snapshot check (returns immediately). If called before the heading renders, it returns `false` non-deterministically. The method name implies a readiness guarantee but doesn't provide one.

**Fix:** Use `this.assertVisible(this.heading)` (which waits) or rename to `checkIsLoaded()` and document its snapshot nature.

---

### M3 — `waitForResponse` in `BasePage` uses `.match()` on a string pattern

```typescript
await this.page.waitForResponse(res => !!res.url().match(urlPattern), ...)
```

`String.prototype.match` with a `string` argument treats it as a `RegExp` constructor argument. Special regex characters in URL paths (e.g., dots in domain names) will be treated as wildcards. Use `res.url().includes(urlPattern)` for string patterns and reserve `.match` for `RegExp` inputs only, or guard by type.

---

### M4 — `global-setup.ts` leaves browser open on login failure

If `page.waitForURL(/dashboard/)` times out, `browser.close()` is never called. The process eventually terminates but stale browser processes can accumulate in CI.

**Fix:** Wrap in try/finally:

```typescript
const browser = await chromium.launch();
try {
  // ... login flow ...
} finally {
  await browser.close();
}
```

---

## Low Priority

### L1 — `Tag` object in `annotations.ts` uses value-prefixed strings

`Tag.smoke = '@smoke'` means tests must include the `@` in titles: `test('login @smoke', ...)`. This is fine but non-standard. Playwright's `--grep` flag works directly on the tag string — document the expected usage to avoid `@@smoke` double-prefix mistakes.

### L2 — `auth.fixture.ts` exports `expect` re-export unnecessarily

Each fixture file re-exports `expect`. Only `fixtures/index.ts` needs to export it; individual fixture files exporting it is harmless but adds noise.

### L3 — `mergeTests` import not verified for fixture name collision

`mergeTests(pagesTest, authTest, apiTest)` will throw at runtime if any two fixtures share the same property key. No collision exists currently, but adding new fixtures without consulting the merged set can cause silent overwrite. A comment in `index.ts` listing all fixture keys would prevent this.

---

## Positive Observations

- No hardcoded credentials anywhere in source (env-driven correctly).
- Lazy locator getters (`get emailInput()`) follow the recommended Playwright pattern — no premature locator evaluation.
- `mergeTests` usage is correct — three independently-testable fixture slices composed at one point.
- `ApiClient` typed generics with centralized error handling is clean; `delete` path correctly avoids JSON parse on void response.
- `Timeouts` constants object with `as const` provides full IDE autocomplete and prevents mutation.
- `BasePage` abstract class with `readonly page` correctly blocks direct instantiation and signals intent.
- `fullyParallel`, `forbidOnly: isCI`, `retries: isCI ? 2 : 0` config is production-appropriate.
- `dotenv.config` called in both `environments.ts` and `playwright.config.ts` — harmless double-load but consistent.

---

## Recommended Actions (Priority Order)

1. **[C1+C2]** Move all auth caching (user + admin) exclusively into `global-setup.ts`. Remove re-login fallback from `auth.fixture.ts`. Fail fast with clear error if cache file missing.
2. **[C3]** Add credential presence guard in `auth.fixture.ts` matching the one in `global-setup.ts`.
3. **[M4]** Wrap `global-setup.ts` browser lifecycle in try/finally.
4. **[H1]** Import `Timeouts` constants into `playwright.config.ts` to create single source of truth.
5. **[M3]** Fix `waitForResponse` pattern matching to handle string vs RegExp correctly.
6. **[M2]** Fix or rename `DashboardPage.isLoaded()` — use waiting assertion or document snapshot behavior.
7. **[H2]** Add JSDoc caveat on `parseResponse` about unchecked cast.

---

## Metrics

| Metric | Value |
|---|---|
| Files reviewed | 15 |
| Critical issues | 2 |
| High issues | 3 |
| Medium issues | 4 |
| Low issues | 3 |
| Hardcoded credentials | 0 |
| TypeScript `any` usages | 0 |
| Score | 7.5 / 10 |

---

## Unresolved Questions

1. Is `global-setup.ts` running `adminContext` auth intentionally omitted (admin tests not yet scoped) or an oversight?
2. Is there a `global-teardown.ts` that cleans `.auth/` files? Referenced in `playwright.config.ts` but not provided for review.
3. Are there plans to parameterize environments (staging, prod) beyond the single `.env.local` file? The current `EnvConfig` interface does not support multi-env switching.

---

**Status:** DONE
**Summary:** Phase 02 infrastructure is well-structured with correct POM/fixture patterns and no credential leaks. Primary blocking concern is the auth caching race under parallel workers — fix by consolidating session creation exclusively in global-setup.
**Concerns:** C1 race condition under fullyParallel=true is the only production-breaking issue.
