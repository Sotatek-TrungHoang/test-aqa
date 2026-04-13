# Code Review: Phase 01 — AQA Project Setup

**Date:** 2026-04-13
**Reviewer:** code-reviewer
**Scope:** 7 config files (Phase 01 setup)
**Score: 8.5 / 10**

---

## Overall Assessment

Solid foundation. Config choices are sensible, dependency versions are current, and the security posture is good. Two blocking issues prevent a higher score: a runtime resolution bug with `require.resolve` on `.ts` files, and weak placeholder credentials in `.env.example` that could mislead contributors. Several smaller issues noted below.

---

## Critical Issues (Blocking)

### 1. `require.resolve` on `.ts` paths will fail at runtime

**File:** `playwright.config.ts` lines 68-69

```ts
globalSetup: require.resolve('./tests/global-setup.ts'),
globalTeardown: require.resolve('./tests/global-teardown.ts'),
```

`require.resolve` resolves against Node's CommonJS module system, which cannot natively resolve `.ts` files unless `ts-node`/`tsx` is on the path. Playwright recommends using a plain string path instead:

```ts
globalSetup: './tests/global-setup.ts',
globalTeardown: './tests/global-teardown.ts',
```

Playwright's runner handles the TypeScript compilation internally when given a string path. Using `require.resolve` is a leftover pattern from pre-1.x configs and fails or gives misleading errors in strict Node environments.

**Impact:** All test runs that rely on globalSetup/globalTeardown will fail or skip setup silently.

---

### 2. Weak example credentials committed to repository

**File:** `.env.example` lines 9-12

```
TEST_USER_EMAIL=user@example.com
TEST_USER_PASSWORD=Password123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPass123!
```

These look like real credential patterns (not obviously fake like `CHANGE_ME` or `<your-password>`). If developers copy this file to `.env.local` as-is, or if a staging environment is misconfigured to use these, it creates a predictable credential vector. More importantly, `playwright.config.ts` already loads `.env.example` as a fallback (line 7), which means these values are active by default in any environment where `.env.local` is absent.

**Recommendation:** Replace values with explicit `CHANGE_ME` placeholders, and add a comment warning that the `.env.example` fallback in `playwright.config.ts` means these run live unless overridden.

---

## High Priority

### 3. `.env.example` loaded as runtime fallback — expands attack surface

**File:** `playwright.config.ts` line 7

```ts
dotenv.config({ path: path.resolve(__dirname, '.env.example') });
```

`.env.example` is a documentation file, not an operational config. Loading it as a live fallback means any developer who forgets `.env.local` will silently run tests against `localhost:3000` with the example credentials rather than getting a clear config error. Prefer failing loudly with a missing-config error or use only `.env.local`.

### 4. `@types/node` version mismatch with Node runtime

**File:** `package.json` line 33

```json
"@types/node": "^25.6.0"
```

`@types/node` v25 corresponds to Node.js 25 (current unstable). Most CI environments run Node 18 or 20 LTS. If the runtime Node version is lower, `@types/node` v25 type definitions may expose APIs that do not exist at runtime, causing silent failures. Align `@types/node` with the Node version in CI (recommend `^20.x` or `^22.x`).

### 5. `allure-playwright` v3 vs `allure-commandline` v2 mismatch

**File:** `package.json` lines 36-37

```json
"allure-commandline": "^2.27.0",
"allure-playwright": "^3.0.0"
```

`allure-playwright` v3 produces Allure 2 results format but the toolchain versions across major releases can diverge in schema. Verify the generated `allure-results/` from v3 are correctly consumed by `allure-commandline` v2. If not, either pin both to a compatible pair or upgrade `allure-commandline` to v3 (beta available).

---

## Medium Priority

### 6. `noUnusedLocals`/`noUnusedParameters` conflicts with global setup stubs

**File:** `tsconfig.json` lines 27-28, `global-setup.ts` line 4

```ts
// tsconfig.json
"noUnusedLocals": true,
"noUnusedParameters": true,

// global-setup.ts
async function globalSetup(_config: FullConfig): Promise<void> {
```

The underscore prefix on `_config` satisfies `@typescript-eslint/no-unused-vars` but `noUnusedParameters` in tsconfig is a compiler flag that also fires — and it does NOT honor the underscore convention by default. Add `"noUnusedLocals": false` at override level or ensure `tsconfig` also has the underscore exemption. Run `tsc --noEmit` to confirm no errors before merging.

### 7. ESLint `env` block missing

**File:** `.eslintrc.json`

There is no `"env"` field. Without `"env": { "node": true }` (or `"browser": true`), ESLint won't recognize globals like `process`, `__dirname`, `console` outside of `eslint:recommended`'s limited set. While `@typescript-eslint/recommended` fills some gaps, adding an explicit env block is safer and removes potential false positives.

### 8. `lint` script scope doesn't include `playwright.config.ts`

**File:** `package.json` line 23

```json
"lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\""
```

`playwright.config.ts` is in the root and is not covered. It imports `dotenv` and constructs paths — any issues there go undetected by lint. Extend to `\"*.ts\"` or add `\"playwright.config.ts\"` explicitly.

### 9. Cross-browser projects all run by default

**File:** `playwright.config.ts` lines 53-66

Firefox, WebKit, and mobile-chrome projects have no opt-in mechanism — they run on every `playwright test` invocation. For a base AQA setup this produces 5x test time with no CI guard. Consider tagging them with a `grep` filter or using `--project` CLI opt-in. The comment says "opt-in via `pnpm test:firefox`" but the project definition does not enforce this.

---

## Low Priority

### 10. `package.json` uses `pnpm` terminology in comments but no lockfile or engine constraint

Comments in `playwright.config.ts` reference `pnpm test:firefox` but the repo has no `pnpm-lock.yaml` visible and no `"engines"` or `"packageManager"` field. If npm or yarn are used, scripts still work, but contributor experience is inconsistent. Add `"packageManager": "pnpm@9.x"` or replace the comment reference.

### 11. `arrowParens: "avoid"` (Prettier) vs common TypeScript style

`arrowParens: "avoid"` omits parens for single-arg arrows: `x => x`. While valid, it conflicts with most TypeScript linting norms and can produce diffs when adding/removing parameters. `"always"` is the Prettier default and more consistent with TS codebases — low impact but worth aligning before the project scales.

---

## Positive Observations

- Security: `.gitignore` correctly excludes `.env`, `.env.local`, `.env.*.local`, `.auth/`. No secrets in committed files.
- `forbidOnly: isCI` prevents accidental `test.only` commits in CI.
- `trace: 'on-first-retry'` + `screenshot: 'only-on-failure'` + `video: 'retain-on-failure'` is a well-balanced artifact strategy.
- `strict: true` + `noImplicitAny` + `strictNullChecks` explicit redundancy is harmless and signals intent.
- `eslint-plugin-playwright` with `no-focused-test: "error"` is excellent CI safety.
- `lint-staged` + `husky` pre-commit integration is correctly wired.
- Faker, dotenv, allure as devDependencies only — no production bloat.

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Replace `require.resolve('./tests/global-setup.ts')` with `'./tests/global-setup.ts'` (string path).
2. **[CRITICAL]** Replace example credentials with `CHANGE_ME` placeholders and add a warning comment about `.env.example` being loaded as a live fallback.
3. **[HIGH]** Remove or guard the `.env.example` fallback dotenv load in `playwright.config.ts`.
4. **[HIGH]** Downgrade `@types/node` to match CI Node LTS version (e.g., `^20.x`).
5. **[HIGH]** Verify `allure-playwright@3` + `allure-commandline@2` compatibility or pin to matching major versions.
6. **[MEDIUM]** Validate `tsc --noEmit` passes with `noUnusedParameters: true` against current stubs.
7. **[MEDIUM]** Add `"env": { "node": true }` to `.eslintrc.json`.
8. **[MEDIUM]** Extend `lint` script to cover `playwright.config.ts`.
9. **[MEDIUM]** Add opt-in mechanism to cross-browser projects (or document clearly).
10. **[LOW]** Add `"packageManager"` field or remove `pnpm`-specific comment.

---

## Unresolved Questions

- What Node.js version is targeted for CI? Needed to confirm `@types/node` alignment.
- Is `pnpm` the intended package manager? No lockfile was observed.
- Is `allure-commandline` v2 confirmed compatible with `allure-playwright` v3 output schema?
