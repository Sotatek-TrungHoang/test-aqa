# Codebase Summary

## Overview

**test-aqa** is a Playwright + TypeScript test automation framework with ~1,100 lines of code across 27 source files. It implements a layered architecture: configuration → helpers/utils → pages → fixtures → tests, with API-based authentication caching for reliability.

## Directory Structure

```
src/
├── api/                    # API client layer
│   ├── api-client.ts       # Generic REST client (64 LOC)
│   └── endpoints/
│       └── users.endpoint.ts  # Typed /users endpoint wrapper (34 LOC)
├── config/                 # Configuration layer
│   ├── environments.ts     # .env.local loader, credentials (25 LOC)
│   └── timeouts.ts         # Centralized timeout constants (13 LOC)
├── fixtures/               # Playwright custom fixtures
│   ├── pages.fixture.ts    # POM instances (19 LOC)
│   ├── auth.fixture.ts     # Auth state fixtures (45 LOC)
│   ├── api.fixture.ts      # API client fixture (46 LOC)
│   └── index.ts            # Fixture composition via mergeTests (8 LOC)
├── helpers/                # Utility helpers
│   ├── assertion.helper.ts # AssertionHelper class (26 LOC)
│   ├── browser.helper.ts   # BrowserHelper class (24 LOC)
│   ├── data.helper.ts      # DataHelper class (32 LOC)
│   ├── storage.helper.ts   # StorageHelper class (35 LOC)
│   └── wait.helper.ts      # WaitHelper class (28 LOC)
├── pages/                  # Page Object Models
│   ├── base.page.ts        # Abstract BasePage (40 LOC)
│   ├── login.page.ts       # LoginPage extends BasePage (44 LOC)
│   └── dashboard.page.ts   # DashboardPage extends BasePage (32 LOC)
└── utils/                  # Utilities
    ├── allure-utils.ts     # Allure annotation helpers (27 LOC)
    ├── logger.ts           # Simple logger (14 LOC)
    └── retry.ts            # Generic async retry (17 LOC)

tests/
├── smoke/
│   └── auth.smoke.spec.ts  # 2 smoke tests (26 LOC)
├── regression/
│   └── auth/
│       ├── login.spec.ts   # 5 regression tests (60 LOC)
│       └── login-data-driven.spec.ts  # 4 data-driven tests (59 LOC)
├── e2e/
│   └── user-onboarding.e2e.spec.ts  # E2E registration flow (36 LOC)
├── api/
│   └── users.api.spec.ts   # 2 API tests (28 LOC)
├── annotations.ts          # Test tag constants (12 LOC)
├── global-setup.ts         # Auth caching via API (106 LOC)
└── global-teardown.ts      # Post-suite cleanup (5 LOC)

data/
├── test-data.json          # Static test data
└── user.factory.ts         # UserFactory class (30 LOC)

Configuration Files
├── playwright.config.ts    # 5 projects, reporters, global setup (70 LOC)
├── tsconfig.json           # ES2020, strict mode, path aliases
├── package.json            # 14 devDependencies, npm scripts
├── .eslintrc.json          # TypeScript ESLint + Playwright plugin
└── .prettierrc.json        # Prettier config
```

## Module Descriptions

### API Layer (`src/api/`)

**api-client.ts** — Generic REST client wrapping Playwright's APIRequestContext
- Methods: `get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`
- Bearer token auth support via `setAuthToken(token)`
- Typed generic responses with error handling
- Used by fixtures and tests for API calls

**users.endpoint.ts** — Typed wrapper for `/users` API
- Methods: `getAll()`, `getById(id)`
- Returns `ApiResponse<T>` wrapper: `{ success, message, data }`
- Depends on ApiClient for HTTP operations

### Configuration Layer (`src/config/`)

**environments.ts** — Loads `.env.local` via dotenv
- Exports `env` object with: `baseURL`, `apiBaseURL`, `testUser`, `testAdmin`
- Credentials: email, password for standard and admin users
- Used by fixtures and tests for environment-specific values

**timeouts.ts** — Centralized timeout constants
- `action: 10s` — Element interactions
- `navigation: 30s` — Page navigation
- `test: 30s` — Test timeout
- `longTest: 120s` — Long-running tests
- `assertion: 5s` — Assertion timeout
- Used by playwright.config.ts and BasePage

### Fixtures (`src/fixtures/`)

**pages.fixture.ts** — Provides POM instances
- Fixtures: `loginPage`, `dashboardPage`
- Instantiates POM classes with Playwright page context

**auth.fixture.ts** — Provides authenticated browser contexts
- Fixtures: `userContext`, `adminContext`
- Reads cached storage state from `.auth/user.json`, `.auth/admin.json`
- Created by global-setup.ts via API login

**api.fixture.ts** — Provides authenticated API client
- Fixture: `apiClient`
- Reads JWT from cached localStorage (enterprise-auth Zustand key)
- Sets Bearer token on ApiClient instance

**index.ts** — Fixture composition
- Merges all fixtures via `mergeTests()`
- Single import point for tests: `import { test } from '@fixtures'`

### Helpers (`src/helpers/`)

**assertion.helper.ts** — AssertionHelper class
- Methods: `fieldsMatch()`, `tableContains()`, `noErrors()`
- Provides reusable assertion logic for common patterns

**browser.helper.ts** — BrowserHelper class
- Methods: `captureScreenshot()`, `getPerformanceMetrics()`
- Metrics: DNS, TCP, TTFB, DOM load time

**data.helper.ts** — DataHelper class
- Methods: `generateRandomUser()`, `generateRandomEmail()`
- Uses Faker.js for realistic test data generation

**storage.helper.ts** — StorageHelper class
- Methods: `setLocalStorage()`, `getLocalStorage()`, `clearCookies()`
- Manipulates browser storage on BrowserContext

**wait.helper.ts** — WaitHelper class
- Methods: `forVisible()`, `forHidden()`, `forUrl()`, `forResponse()`, `forNetworkIdle()`
- Wrapper around Playwright's wait methods with centralized timeouts

### Page Object Models (`src/pages/`)

**base.page.ts** — Abstract BasePage
- Methods: `goto()`, `fill()`, `assertVisible()`, `assertText()`, `assertUrl()`, `waitForResponse()`
- Uses centralized Timeouts
- Base for all page objects

**login.page.ts** — LoginPage extends BasePage
- Locators: `emailInput`, `passwordInput`, `submitButton`, `errorAlert`
- Methods: `login(email, password)`, `getErrorMessage()`
- Handles login flow with navigation wait

**dashboard.page.ts** — DashboardPage extends BasePage
- Locators: `heading`, `userMenu`, `logoutButton`
- Methods: `navigate()`, `isLoaded()`, `logout()`
- Represents authenticated dashboard state

### Utils (`src/utils/`)

**allure-utils.ts** — Allure annotation helpers
- Functions: `description()`, `issue()`, `testId()`, `severity()`, `feature()`, `story()`
- Decorates tests with rich metadata for Allure reports

**logger.ts** — Simple logger
- Methods: `info()` (suppressed in CI), `warn()`, `error()`
- Provides consistent logging across tests

**retry.ts** — Generic async retry
- Function: `retry<T>(fn, attempts, delay)`
- Configurable retry logic for flaky operations

### Test Suites (`tests/`)

**annotations.ts** — Test tag constants
- Tags: `@smoke`, `@regression`, `@e2e`, `@api`, `@visual`, `@critical`, `@slow`, `@flaky`, `@wip`
- Used with `test.describe.configure({ tag: [...] })`

**global-setup.ts** — API-based auth caching
- Calls `/auth/login` endpoint directly (no browser)
- Writes Playwright storage state to `.auth/user.json`, `.auth/admin.json`
- Stores JWT in localStorage (enterprise-auth key)
- Runs once before all tests

**global-teardown.ts** — Post-suite cleanup
- Placeholder for cleanup logic

**smoke/auth.smoke.spec.ts** — 2 smoke tests
- Login redirects to dashboard
- Login page loads

**regression/auth/login.spec.ts** — 5 regression tests
- Valid login succeeds
- Invalid password fails
- Empty email fails
- Empty password fails
- Logout clears session

**regression/auth/login-data-driven.spec.ts** — 4 data-driven tests
- Parameterized login cases: valid, wrong creds, invalid email, empty fields

**e2e/user-onboarding.e2e.spec.ts** — E2E user registration
- Register new user
- Verify redirect to dashboard
- Verify user info displayed

**api/users.api.spec.ts** — 2 API tests
- GET /users returns array
- GET /users/:id returns specific user

### Test Data (`data/`)

**test-data.json** — Static test data
- Valid/admin users, invalid emails, weak passwords

**user.factory.ts** — UserFactory class
- Methods: `create()`, `createAdmin()`, `createBatch()`
- Uses Faker.js for realistic data generation

## Key Architectural Patterns

### 1. Page Object Model (POM)
- Abstract `BasePage` with common methods
- Concrete pages (LoginPage, DashboardPage) extend BasePage
- Locators encapsulated in page classes
- Tests interact with pages, not selectors

### 2. Fixture Composition
- Separate fixtures for pages, auth, API
- Merged via `mergeTests()` in `fixtures/index.ts`
- Tests import single fixture: `import { test } from '@fixtures'`
- Provides: `test.page`, `test.loginPage`, `test.dashboardPage`, `test.userContext`, `test.adminContext`, `test.apiClient`

### 3. API-Based Auth Caching
- `global-setup.ts` calls `/auth/login` endpoint
- Caches JWT and Zustand state to `.auth/` files
- Fixtures inject cached state into browser context
- Eliminates flaky browser login, improves reliability

### 4. Centralized Configuration
- Environment variables in `src/config/environments.ts`
- Timeouts in `src/config/timeouts.ts`
- Used throughout codebase via imports

### 5. Helper Utilities
- Reusable logic in helper classes
- Assertion, browser, data, storage, wait helpers
- Reduces duplication across tests

### 6. Tag-Based Test Filtering
- Tests tagged with `@smoke`, `@regression`, `@e2e`, `@api`
- Playwright config projects filter by tag
- CI runs different suites based on trigger

### 7. Data Factory Pattern
- `UserFactory` generates realistic test data
- Faker.js for random values
- Batch creation for data-driven tests

### 8. Typed API Client
- Generic `ApiClient<T>` with typed responses
- Endpoint wrappers (e.g., `UsersEndpoint`)
- Bearer token auth support

## Dependency Graph

```
Tests
  ├── Fixtures (pages, auth, api)
  │   ├── Pages (POM)
  │   │   └── BasePage
  │   │       └── Helpers (assertion, browser, wait)
  │   ├── Auth Fixture
  │   │   └── Config (environments)
  │   └── API Fixture
  │       ├── API Client
  │       │   └── Endpoints (users)
  │       └── Config (environments)
  ├── Helpers (data, storage)
  ├── Utils (allure, logger, retry)
  └── Config (environments, timeouts)
```

## Code Statistics

| Category | Count | LOC |
|----------|-------|-----|
| Source files | 19 | ~550 |
| Test files | 8 | ~350 |
| Config files | 4 | ~200 |
| Total | 31 | ~1,100 |

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Test Framework | Playwright | 1.42+ |
| Language | TypeScript | 5.4+ |
| Runtime | Node.js | 20+ |
| Package Manager | pnpm | 9+ |
| Data Generation | Faker.js | 8.4+ |
| Reporting | Allure | 2.27+ |
| Linting | ESLint | 8.57+ |
| Formatting | Prettier | 3.2+ |
| Git Hooks | Husky | 9.0+ |

## Integration Points

### External APIs
- `/auth/login` — JWT authentication
- `/users` — User management endpoints
- `/users/:id` — User details endpoint

### CI/CD Integration
- GitHub Actions workflows (4 total)
- Self-hosted runner for test execution
- Allure report generation and deployment
- Google Chat webhook notifications

### Storage
- `.auth/` directory — Cached authentication state
- `playwright-report/` — HTML test reports
- `allure-results/` — Allure report data
- `test-results/` — JSON/JUnit test results

## Key Files to Understand

1. **playwright.config.ts** — Test configuration, projects, reporters
2. **tests/global-setup.ts** — Auth caching mechanism
3. **src/fixtures/index.ts** — Fixture composition entry point
4. **src/pages/base.page.ts** — POM base class
5. **src/api/api-client.ts** — API client implementation
6. **src/config/environments.ts** — Configuration loader
