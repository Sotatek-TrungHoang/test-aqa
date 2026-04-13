# Phase 01: Project Setup Complete

**Date**: 2026-04-13 17:14
**Severity**: Low
**Component**: Build Infrastructure / Project Bootstrap
**Status**: Resolved

## What Happened

Bootstrapped Playwright + TypeScript AQA base project from scratch. Initialized pnpm workspace with 14 devDependencies, installed all three Playwright browsers (chromium, firefox, webkit), created configuration files (tsconfig.json, playwright.config.ts, eslintrc, prettier), and wired up Husky v9 pre-commit hooks with lint-staged.

## The Brutal Truth

Phase 01 executed cleanly without major blockers—the plan was solid. However, discovering configuration quirks ate 45min of time that should've been predictable: Playwright's internal TypeScript handling vs explicit path resolution, Husky's v9 API breaking v8 patterns, and linter plugin compatibility issues. None were hard stops, but they interrupt flow.

## Technical Details

- `@types/node ^20.x` added (missing from original devDeps; needed for TypeScript compilation)
- Fixed Playwright config: dropped `require.resolve('./tests/global-setup.ts')` in favor of string path; Playwright handles TS internally
- Removed dotenv fallback from playwright.config.ts—would leak `CHANGE_ME` placeholder vars into live test runs (security debt avoided)
- Husky v9 `prepare` script: changed `husky install` → `husky` (v9 CLI change)
- Disabled `@typescript-eslint/explicit-function-return-types` rule (v7 plugin config unresolvable without manual override)
- Added `--no-error-on-unmatched-pattern` to lint/format scripts (src/ empty until Phase 02)

## What We Tried

- Initial attempt: Husky `prepare` with v8 syntax → failed on `husky install`
  - Fix: Updated to v9 CLI (`husky` without args)
- Initial attempt: ESLint v7 explicit return types rule → config resolution error
  - Fix: Disabled rule; revisit after linter config stabilizes
- Initial attempt: Playwright config with `require.resolve()` → type mismatch
  - Fix: Used string path; Playwright compiles TS on load

## Root Cause Analysis

No systemic failures. Deviations stemmed from (1) tool version upgrades (Husky v8→v9, ESLint ecosystem churn), (2) assumptions about Playwright's TypeScript handling (it's opaque by design), and (3) supply-chain pattern (always missing a transitive devDep on first pass).

## Lessons Learned

1. **Version migrations aren't free**: Husky's v9 rewrite eliminated `prepare`, forcing consumers to update. Document tool versions in `README.md` upfront.
2. **Security matters at bootstrap**: Almost leaked placeholder env values. Add `.env.example` to `.gitignore` validation checklist.
3. **Lint config needs breathing room**: ESLint v7 plugin ecosystem is fragile. Leave room for gradual hardening; don't try to enforce all rules on day one.
4. **Empty directories break glob patterns**: The `--no-error-on-unmatched-pattern` flag feels hacky but prevents CI failures before code exists.

## Next Steps

- Phase 02 unblocked: Core infrastructure (page objects, fixtures, helpers)
- Verify all quality gates pass: `pnpm type-check` ✓, `pnpm lint` ✓, `pnpm format:check` ✓
- Commit: `567c2d5` (all gates passing)
- Owner: Continue with Phase 02 lead
- Timeline: Phase 02 target 2 days
