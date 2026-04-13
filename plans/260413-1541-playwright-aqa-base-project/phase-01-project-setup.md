# Phase 01 — Project Setup & Configuration

**Status:** ✅ complete
**Priority:** Critical (blocks all other phases)
**Plan:** [plan.md](./plan.md)

---

## Overview

Bootstrap the project with all configuration files: package manager, TypeScript, Playwright config, ESLint, Prettier, environment variables, and `.gitignore`.

---

## Files to Create

```
test-aqa/
├── package.json
├── pnpm-lock.yaml               (auto-generated)
├── tsconfig.json
├── playwright.config.ts
├── .eslintrc.json
├── .prettierrc.json
├── .prettierignore
├── .gitignore
├── .env.example
└── .husky/
    └── pre-commit
```

---

## Implementation Steps

### 1. Initialize pnpm project

```bash
cd /Users/trung.hoang/Desktop/AQA/test-aqa
pnpm init
```

### 2. Install dependencies

```bash
# Core
pnpm add -D @playwright/test typescript

# Linting & Formatting
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-playwright prettier eslint-config-prettier

# Reporting
pnpm add -D allure-playwright allure-commandline

# Test utilities
pnpm add -D dotenv @faker-js/faker

# Git hooks
pnpm add -D husky lint-staged

# Install Playwright browsers
npx playwright install chromium firefox webkit
```

### 3. `package.json`

```json
{
  "name": "test-aqa",
  "version": "1.0.0",
  "private": true,
  "description": "AQA base project — Playwright + TypeScript",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",

    "test:smoke": "playwright test --grep @smoke",
    "test:regression": "playwright test --grep @regression",
    "test:e2e": "playwright test tests/e2e",
    "test:api": "playwright test tests/api",

    "test:chrome": "playwright test -p chromium",
    "test:firefox": "playwright test -p firefox",
    "test:webkit": "playwright test -p webkit",

    "test:ci": "playwright test --reporter=html,json,junit,allure-playwright",

    "report": "playwright show-report playwright-report",
    "report:allure": "allure generate allure-results --clean -o allure-report && allure open allure-report",

    "codegen": "playwright codegen",
    "trace": "playwright show-trace",

    "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\"",
    "lint:fix": "eslint \"src/**/*.ts\" \"tests/**/*.ts\" --fix",
    "format": "prettier --write \"**/*.{ts,js,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md}\"",
    "type-check": "tsc --noEmit",

    "prepare": "husky install"
  },
  "devDependencies": {
    "@faker-js/faker": "^8.4.1",
    "@playwright/test": "^1.42.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "allure-commandline": "^2.27.0",
    "allure-playwright": "^3.0.0",
    "dotenv": "^16.4.4",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-playwright": "^1.6.1",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.2",
    "prettier": "^3.2.5",
    "typescript": "^5.4.2"
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 4. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["src/pages/*"],
      "@fixtures/*": ["src/fixtures/*"],
      "@helpers/*": ["src/helpers/*"],
      "@api/*": ["src/api/*"],
      "@config/*": ["src/config/*"],
      "@utils/*": ["src/utils/*"],
      "@data/*": ["data/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "moduleResolution": "node"
  },
  "include": ["src", "tests", "playwright.config.ts", "data"],
  "exclude": ["node_modules", "dist", "playwright-report", "allure-report"]
}
```

### 5. `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local (gitignored) or .env.example fallback
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env.example') });

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    isCI ? ['github'] : ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Smoke: fast sanity on Chrome only
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
      grep: /@smoke/,
    },
    // Default: Chromium
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@smoke/,
    },
    // Cross-browser (opt-in via `pnpm test:firefox` etc.)
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile emulation
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
});
```

### 6. `.eslintrc.json`

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:playwright/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "playwright"],
  "rules": {
    "playwright/no-wait-for-timeout": "warn",
    "playwright/no-focused-test": "error",
    "playwright/no-skipped-test": "warn",
    "playwright/valid-expect": "error",
    "playwright/no-element-handle": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-types": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error"
  },
  "overrides": [
    {
      "files": ["tests/**/*.ts"],
      "rules": { "no-console": "off" }
    }
  ]
}
```

### 7. `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 8. `.prettierignore`

```
node_modules
dist
playwright-report
allure-results
allure-report
test-results
.auth
```

### 9. `.gitignore`

```
node_modules/
dist/

# Test artifacts
playwright-report/
test-results/
allure-results/
allure-report/
.auth/

# Environment secrets (never commit)
.env
.env.local
.env.*.local

# OS
.DS_Store
*.log
```

### 10. `.env.example`

```bash
# Environment selector
TEST_ENV=development

# App URLs
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001/api

# Test credentials (replace with real values in .env.local)
TEST_USER_EMAIL=user@example.com
TEST_USER_PASSWORD=Password123!
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPass123!

# Reporting
SLACK_WEBHOOK_URL=

# CI marker (auto-set by GitHub Actions)
CI=false
```

### 11. Git hooks setup

```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

---

## Todo

- [x] Run `pnpm init` in project root
- [x] Install all dependencies
- [x] Create `package.json` with scripts
- [x] Create `tsconfig.json` with path aliases
- [x] Create `playwright.config.ts`
- [x] Create `.eslintrc.json`
- [x] Create `.prettierrc.json` + `.prettierignore`
- [x] Create `.gitignore`
- [x] Create `.env.example`
- [x] Run `npx playwright install` for browsers
- [x] Setup Husky git hooks
- [x] Verify `pnpm lint` passes
- [x] Verify `pnpm type-check` passes

---

## Implementation Deviations & Notes

**Notable changes from plan:**

1. **Added `@types/node ^20.x`** — Required for TypeScript compilation; was missing from original plan
2. **Lint script adjustment** — Added `--no-error-on-unmatched-pattern` flag to both `lint` and `lint:fix` scripts
   - Reason: `src/` directory is empty until Phase 02; flag prevents script failure
3. **Playwright config paths** — Used string paths instead of `require.resolve()` for `globalSetup` and `globalTeardown`
   - Reason: Simpler approach; both work in CommonJS config context
4. **`.env.example` security** — Removed dotenv fallback from playwright.config.ts
   - Reason: Security best practice; credentials changed to `CHANGE_ME` placeholders instead of example values
5. **Husky prepare script** — Changed from `husky install` to `husky` (v9 API change)
   - Reason: Husky v9+ uses different initialization method
6. **ESLint explicit-function-return-types rule removed** — Not available in v7 plugin
   - Reason: Type checking handled by TypeScript directly

**Verification Results:**
- ✓ `pnpm install` completed without errors
- ✓ All config files created successfully
- ✓ Playwright browsers installed (chromium, firefox, webkit)
- ✓ Husky pre-commit hook configured
- ✓ `pnpm type-check` PASSED
- ✓ `pnpm lint` PASSED
- ✓ `pnpm format:check` PASSED

---

## Success Criteria

- [x] `pnpm install` succeeds without errors
- [x] `pnpm type-check` produces no errors
- [x] `pnpm lint` reports no errors (warnings OK)
- [x] `pnpm format:check` passes
- [x] `playwright.config.ts` loads without errors
