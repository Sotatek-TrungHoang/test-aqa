# test-aqa

Playwright + TypeScript test automation framework for E2E, API, smoke, and regression testing.

## Project Structure

```
src/
├── api/                  # API client & endpoint wrappers
│   ├── api-client.ts
│   └── endpoints/
├── config/               # Environment configs & timeouts
├── fixtures/             # Playwright fixtures (pages, auth, api)
├── helpers/              # Assertion, browser, data, storage, wait helpers
├── pages/                # Page Object Models (login, dashboard, base)
└── utils/                # Logger, retry, allure utilities

tests/
├── smoke/                # @smoke — fast sanity checks
├── regression/           # @regression — full regression suite
├── e2e/                  # End-to-end user flows
├── api/                  # API-level tests
├── global-setup.ts       # Auth state setup (runs before all tests)
└── global-teardown.ts    # Cleanup after test run

data/                     # Test data & factories
.github/workflows/        # CI/CD pipelines
```

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in real credentials
npx playwright install --with-deps
```

## Running Tests

```bash
# All tests
pnpm test

# By suite
pnpm test:smoke              # @smoke tagged tests (chromium)
pnpm test:regression          # @regression tagged tests
pnpm test:e2e                 # E2E user flows
pnpm test:api                 # API tests

# By browser
pnpm test:chrome
pnpm test:firefox
pnpm test:webkit

# Debug & UI
pnpm test:headed              # Run with browser visible
pnpm test:debug               # Playwright inspector
pnpm test:ui                  # Playwright UI mode
pnpm codegen                  # Code generator
```

## Reports

```bash
pnpm report                   # Open Playwright HTML report
pnpm report:allure            # Generate & open Allure report
```

## Code Quality

```bash
pnpm lint                     # ESLint
pnpm lint:fix                 # ESLint with auto-fix
pnpm format                   # Prettier format
pnpm format:check             # Prettier check
pnpm type-check               # TypeScript type check
```

Pre-commit hooks (via Husky + lint-staged) auto-run ESLint and Prettier on staged `.ts` files.

## CI/CD

All pipelines run on a self-hosted Ubuntu runner.

| Workflow                 | Trigger                     | What it does                                               |
| ------------------------ | --------------------------- | ---------------------------------------------------------- |
| Test CI                  | Push/PR to `main`/`develop` | Lint → Smoke + Regression (4 shards) + API → Allure report |
| Nightly Full Suite       | Daily 01:00 UTC + manual    | Full suite across chromium, firefox, webkit                |
| Publish Allure Report    | After Test CI completes     | Deploys report to GitHub Pages, comments on PR             |
| Google Chat Notification | After Test CI / Nightly     | Sends result card to Google Chat via webhook               |

## Environment Variables

See [`.env.example`](.env.example) for the full list. Copy to `.env.local` and fill in real values.

| Variable              | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `TEST_ENV`            | Environment selector (development, staging, production) |
| `BASE_URL`            | Application base URL                                    |
| `API_BASE_URL`        | API base URL                                            |
| `TEST_USER_EMAIL`     | Standard test user credentials                          |
| `TEST_USER_PASSWORD`  |                                                         |
| `TEST_ADMIN_EMAIL`    | Admin test user credentials                             |
| `TEST_ADMIN_PASSWORD` |                                                         |

## Path Aliases

Configured in `tsconfig.json`:

| Alias         | Path             |
| ------------- | ---------------- |
| `@pages/*`    | `src/pages/*`    |
| `@fixtures/*` | `src/fixtures/*` |
| `@helpers/*`  | `src/helpers/*`  |
| `@api/*`      | `src/api/*`      |
| `@config/*`   | `src/config/*`   |
| `@utils/*`    | `src/utils/*`    |
| `@data/*`     | `data/*`         |
