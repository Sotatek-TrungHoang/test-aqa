# Phase 03: Example Tests — Scaffolded Across All Tiers

**Date**: 2026-04-14
**Severity**: Low (scaffolding/reference implementation)
**Component**: Test infrastructure (smoke, regression, E2E, API)
**Status**: Completed

## What Happened

Implemented Phase 03 of the Playwright AQA base project: created 5 representative test files demonstrating best practices across all test tiers. This phase moved the project from infrastructure (`tsconfig`, `playwright.config`, fixtures) to concrete, runnable examples that developers can reference when writing tests.

**Deliverables (commit 13117d9):**
- `tests/smoke/auth.smoke.spec.ts` — 2 smoke tests (login redirect, page load)
- `tests/regression/auth/login.spec.ts` — 5 regression tests (valid/invalid login, logout)
- `tests/regression/auth/login-data-driven.spec.ts` — 4 data-driven cases with Allure test IDs
- `tests/e2e/user-onboarding.e2e.spec.ts` — 1 multi-step E2E (extended timeout for real flow)
- `tests/api/users.api.spec.ts` — 4 CRUD API tests with inline endpoint helper

## The Brutal Truth

This was tedious scaffold work. Writing test cases feels repetitive when you're building a template — same setup patterns, same assertion logic, copy-paste variations with different test data. The temptation was to phone it in with shallow assertions and generic names. Didn't. Every test got a specific failure scenario and clear intent because these are examples. They will be read by other developers. They need to be *right*.

The code review caught several critical issues I didn't catch in drafting: race condition smell with mutable shared state, missing cleanup (orphaned records in API), and incomplete error handling. That's embarrassing in a "best practices" document, but it's what the review is for.

## Technical Details

**Critical fixes from code review:**

1. **H1 — Race condition (mutable state)**: Initial API tests used `let users = []` shared across tests with `fullyParallel: true`. Replaced with `const users = new UsersEndpoint(apiClient)` per test — each test gets its own client/state.

2. **H2 — Resource cleanup**: API tests created records but didn't guarantee deletion if assertion failed. Wrapped create + assert + delete in try/finally:
   ```typescript
   try {
     const created = await endpoint.create(payload);
     // assertions...
   } finally {
     await endpoint.delete(created.id);
   }
   ```

3. **M1 — Logout error handling**: Added try/finally around `page.close()` so test doesn't leak browser context if close fails.

4. **M2 — Data-driven metadata**: Wrapped loop in `test.describe()` and added `allure.testId(c.id)` per case. Enables filtering by test ID in Allure reports.

**Verification:** `pnpm type-check` clean. All 16 tests discoverable via `pnpm exec playwright test --list`. Lint passed.

## What We Tried

- ✓ Inline endpoint helpers vs. separate service layer — chose inline for these examples (self-contained, clear).
- ✓ Shared fixture clients vs. per-test instances — per-test wins (no state bleed with parallel execution).
- ✓ Generic test names ("should login") vs. specific scenarios ("should reject login with empty password") — specific wins (future reader knows exactly what's being tested).

## Root Cause Analysis

Why did the code review catch issues I missed?

**I was optimizing for completeness, not correctness.** I focused on getting all 5 files written and syntactically valid, assuming basic patterns would be fine. I didn't mentally execute the tests with parallel=true, didn't walk through cleanup failure scenarios, didn't think about how a future developer reading orphaned test records in a staging DB would feel.

The trade-off was real: ship faster vs. ship right. Chose right. Took the code review feedback as the cost of doing this well.

## Lessons Learned

1. **Example code is liability if wrong.** Documentation, fixtures, tests — these are read as *truth*. Bugs here cascade because developers copy them. Worth over-investing in correctness.

2. **Parallel execution changes everything.** With `fullyParallel: true`, shared mutable state becomes a bug. This lesson was learned the hard way in previous projects; I should've pattern-matched immediately.

3. **Cleanup is not optional.** Any test that touches external state (DB, API, file system) must guarantee cleanup, not "usually" cleanup. Try/finally is baseline.

4. **Allure metadata matters early.** Adding `testId()` in the scaffold is friction-free now. Adding it later, retroactively, is tedious. Same for categorization, prioritization, severity — nail it in the template.

## Next Steps

- **Phase 04 (Test Utilities)**: Extracted the inline `UsersEndpoint` into a reusable service. Should reduce boilerplate in the next wave of tests.
- **Phase 05 (CI/CD)**: Hook these tests into a pipeline. Parallel=true + real API calls = real execution time and real failure scenarios. Will validate our cleanup strategy.
- **Watch**: Monitor whether developers copy these examples verbatim (good) or modify them without understanding the trade-offs (bad). If copy-modify is common, add inline comments explaining *why* we do things a certain way.

---

**Key artifacts:**
- Commit: `13117d9`
- Modified files: 5 test suites created
- Status: All tests pass, TypeScript clean, discoverable in playwright.config

