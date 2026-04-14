# System Architecture

## Overview

**test-aqa** follows a layered architecture with clear separation of concerns: configuration → helpers/utils → pages → fixtures → tests. This design enables maintainability, reusability, and scalability.

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Suites                             │
│  (smoke, regression, e2e, api)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Fixture Composition                             │
│  (pages, auth, api fixtures merged via mergeTests)          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──┐  ┌──────▼──┐  ┌─────▼──────┐
│  Pages   │  │   Auth  │  │   API      │
│  (POM)   │  │ Fixture │  │  Fixture   │
└───────┬──┘  └──────┬──┘  └─────┬──────┘
        │           │            │
        └───────────┼────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼──┐  ┌─────▼──┐  ┌────▼────┐
│ Helpers  │  │  Utils │  │   API   │
│(assertion│  │(allure,│  │  Client │
│ browser, │  │logger, │  │         │
│ data,    │  │retry)  │  │         │
│ storage, │  │        │  │         │
│ wait)    │  │        │  │         │
└───────┬──┘  └─────┬──┘  └────┬────┘
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────▼───────────┐
        │   Configuration       │
        │ (environments,        │
        │  timeouts)            │
        └───────────────────────┘
```

## Layer Descriptions

### Configuration Layer

**Purpose:** Centralize environment-specific settings and constants.

**Components:**
- `src/config/environments.ts` — Loads `.env.local` via dotenv, exports `env` object
- `src/config/timeouts.ts` — Centralized timeout constants

**Responsibilities:**
- Load environment variables at startup
- Validate required configuration
- Provide typed access to settings
- Support multiple environments (dev, staging, prod)

**Usage:**
```typescript
import { env } from '@config/environments';
import { Timeouts } from '@config/timeouts';

const baseURL = env.baseURL;
const timeout = Timeouts.action;
```

### Helpers & Utils Layer

**Purpose:** Provide reusable utility functions and helper classes.

**Helpers (src/helpers/):**
- `assertion.helper.ts` — Common assertion patterns
- `browser.helper.ts` — Browser operations (screenshots, metrics)
- `data.helper.ts` — Test data generation
- `storage.helper.ts` — LocalStorage/cookie manipulation
- `wait.helper.ts` — Wait conditions with centralized timeouts

**Utils (src/utils/):**
- `allure-utils.ts` — Allure report annotations
- `logger.ts` — Structured logging
- `retry.ts` — Generic async retry logic

**Responsibilities:**
- Encapsulate common operations
- Reduce code duplication
- Provide consistent interfaces
- Handle error cases

**Usage:**
```typescript
import { AssertionHelper } from '@helpers/assertion.helper';
import { DataHelper } from '@helpers/data.helper';

const helper = new AssertionHelper(page);
await helper.fieldsMatch(expectedData);

const user = DataHelper.generateRandomUser();
```

### Pages Layer (POM)

**Purpose:** Encapsulate page-specific locators and interactions.

**Components:**
- `src/pages/base.page.ts` — Abstract base class with common methods
- `src/pages/login.page.ts` — Login page interactions
- `src/pages/dashboard.page.ts` — Dashboard page interactions

**Responsibilities:**
- Define page locators (private)
- Implement page-specific methods
- Handle page navigation and waits
- Provide clean API for tests

**Architecture:**
```
BasePage (abstract)
├── goto(url)
├── fill(locator, value)
├── click(locator)
├── getText(locator)
├── assertVisible(locator)
├── assertText(locator, text)
├── assertUrl(pattern)
└── waitForResponse(urlPattern)

LoginPage extends BasePage
├── emailInput: Locator
├── passwordInput: Locator
├── submitButton: Locator
├── errorAlert: Locator
├── login(email, password)
└── getErrorMessage()

DashboardPage extends BasePage
├── heading: Locator
├── userMenu: Locator
├── logoutButton: Locator
├── navigate()
├── isLoaded()
└── logout()
```

**Usage:**
```typescript
import { LoginPage } from '@pages/login.page';

const loginPage = new LoginPage(page);
await loginPage.login('user@example.com', 'password');
```

### Fixtures Layer

**Purpose:** Provide test-scoped resources (pages, auth, API client).

**Components:**
- `src/fixtures/pages.fixture.ts` — Page Object Model instances
- `src/fixtures/auth.fixture.ts` — Authenticated browser contexts
- `src/fixtures/api.fixture.ts` — Authenticated API client
- `src/fixtures/index.ts` — Fixture composition

**Fixture Types:**

| Fixture | Type | Scope | Purpose |
|---------|------|-------|---------|
| `loginPage` | Page | test | LoginPage instance |
| `dashboardPage` | Page | test | DashboardPage instance |
| `userContext` | BrowserContext | test | Authenticated user context |
| `adminContext` | BrowserContext | test | Authenticated admin context |
| `apiClient` | ApiClient | test | Authenticated API client |

**Architecture:**
```typescript
// pages.fixture.ts
export const pageFixtures = test.extend({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

// auth.fixture.ts
export const authFixtures = test.extend({
  userContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: '.auth/user.json',
    });
    await use(context);
    await context.close();
  },
});

// api.fixture.ts
export const apiFixtures = test.extend({
  apiClient: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext();
    const client = new ApiClient(apiContext);
    // Read JWT from cached storage state
    const token = readTokenFromStorage();
    client.setAuthToken(token);
    await use(client);
    await apiContext.dispose();
  },
});

// index.ts
export const test = mergeTests(pageFixtures, authFixtures, apiFixtures);
```

**Usage:**
```typescript
import { test } from '@fixtures';

test('user can login', async ({ loginPage, userContext }) => {
  // loginPage and userContext are automatically initialized
  await loginPage.login('user@example.com', 'password');
});
```

### API Client Layer

**Purpose:** Provide typed HTTP client for API testing.

**Components:**
- `src/api/api-client.ts` — Generic REST client
- `src/api/endpoints/users.endpoint.ts` — /users endpoint wrapper

**Architecture:**
```typescript
// api-client.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiClient {
  constructor(private apiContext: APIRequestContext) {}

  setAuthToken(token: string): void {
    this.apiContext.setExtraHTTPHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.apiContext.get(url);
    return response.json();
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await this.apiContext.post(url, { data });
    return response.json();
  }
}

// endpoints/users.endpoint.ts
export class UsersEndpoint {
  constructor(private client: ApiClient) {}

  async getAll(): Promise<ApiResponse<User[]>> {
    return this.client.get('/users');
  }

  async getById(id: string): Promise<ApiResponse<User>> {
    return this.client.get(`/users/${id}`);
  }
}
```

**Usage:**
```typescript
import { ApiClient } from '@api/api-client';
import { UsersEndpoint } from '@api/endpoints/users.endpoint';

const endpoint = new UsersEndpoint(apiClient);
const response = await endpoint.getAll();
```

### Test Layer

**Purpose:** Define test scenarios using fixtures and helpers.

**Test Categories:**

| Category | Location | Tags | Speed | Frequency |
|----------|----------|------|-------|-----------|
| Smoke | `tests/smoke/` | @smoke | <5s | Every commit |
| Regression | `tests/regression/` | @regression | 30-60s | Every PR |
| E2E | `tests/e2e/` | @e2e | 60-120s | Nightly |
| API | `tests/api/` | @api | <2s | Every commit |

**Test Structure:**
```typescript
import { test } from '@fixtures';
import { allure } from '@utils/allure-utils';

test.describe.configure({ tag: '@smoke' });

test('user can login with valid credentials', async ({ loginPage }) => {
  allure.feature('Authentication');
  allure.story('User login');
  allure.severity('critical');

  // Arrange
  const email = 'user@example.com';
  const password = 'Demo@1234';

  // Act
  await loginPage.login(email, password);

  // Assert
  await expect(loginPage.page).toHaveURL(/\/dashboard/);
});
```

## Authentication Flow

### Global Setup (API-Based)

**File:** `tests/global-setup.ts`

**Flow:**
```
1. Load credentials from env
   ↓
2. Call POST /auth/login endpoint
   ↓
3. Extract JWT token from response
   ↓
4. Extract Zustand state from response
   ↓
5. Write storage state to .auth/user.json
   ├── cookies
   ├── localStorage (enterprise-auth key)
   └── sessionStorage
   ↓
6. Repeat for admin user → .auth/admin.json
   ↓
7. Tests start with cached auth state
```

**Benefits:**
- No browser login overhead
- Reliable (no UI flakiness)
- Fast (API call vs browser automation)
- Reusable across all tests

**Implementation:**
```typescript
// tests/global-setup.ts
async function globalSetup(config: FullConfig) {
  const apiContext = await chromium.connectOverCDP();
  const client = new ApiClient(apiContext);

  // Login as user
  const userResponse = await client.post('/auth/login', {
    email: env.testUser.email,
    password: env.testUser.password,
  });

  // Extract and cache auth state
  const storageState = {
    cookies: [],
    origins: [{
      origin: env.baseURL,
      localStorage: [{
        name: 'enterprise-auth',
        value: JSON.stringify(userResponse.data),
      }],
    }],
  };

  fs.writeFileSync('.auth/user.json', JSON.stringify(storageState));
}
```

### Fixture Injection

**File:** `src/fixtures/auth.fixture.ts`

**Flow:**
```
1. Test requests userContext fixture
   ↓
2. Fixture reads .auth/user.json
   ↓
3. Creates browser context with cached storage state
   ↓
4. Injects cookies and localStorage
   ↓
5. Test runs with authenticated session
   ↓
6. Context closed after test
```

## CI/CD Pipeline Architecture

### Workflow Triggers

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Test CI | Push/PR to main/develop | Lint → Smoke + Regression + API |
| Nightly | Daily 01:00 UTC | Full suite across all browsers |
| Report | After Test CI | Deploy Allure report to GitHub Pages |
| Notify | After Test CI/Nightly | Send Google Chat notification |

### Test CI Pipeline

```
┌─────────────────────────────────────────┐
│ Push/PR to main or develop              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│ Lint (ESLint + Prettier)                │
│ Type Check (TypeScript)                 │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼────────┐
│ Smoke Tests  │  │ Regression    │
│ (chromium)   │  │ Tests (4      │
│ 1 shard      │  │ shards)       │
└───────┬──────┘  └──────┬────────┘
        │                │
        └────────┬───────┘
                 │
        ┌────────▼────────┐
        │ API Tests       │
        │ (parallel)      │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Merge Allure    │
        │ Reports         │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Upload Results  │
        │ to Artifacts    │
        └─────────────────┘
```

### Reporting Pipeline

```
┌──────────────────────────────────┐
│ Test CI Completes                │
└────────────┬─────────────────────┘
             │
┌────────────▼─────────────────────┐
│ Generate Allure Report           │
│ (from allure-results/)           │
└────────────┬─────────────────────┘
             │
┌────────────▼─────────────────────┐
│ Deploy to GitHub Pages           │
│ (gh-pages branch)                │
└────────────┬─────────────────────┘
             │
┌────────────▼─────────────────────┐
│ Comment PR with Report Link      │
│ (if PR trigger)                  │
└──────────────────────────────────┘
```

### Notification Pipeline

```
┌──────────────────────────────────┐
│ Test CI or Nightly Completes     │
└────────────┬─────────────────────┘
             │
┌────────────▼─────────────────────┐
│ Collect Test Results             │
│ (status, duration, commit)       │
└────────────┬─────────────────────┘
             │
┌────────────▼─────────────────────┐
│ Format Google Chat Card          │
│ (title, status, metrics)         │
└────────────┬─────────────────────┘
             │
┌────────────▼─────────────────────┐
│ Send to Google Chat Webhook      │
│ (via secrets.GOOGLE_CHAT_WEBHOOK)│
└──────────────────────────────────┘
```

## Data Flow

### Test Execution Flow

```
1. Global Setup
   ├── Load .env.local
   ├── Call /auth/login API
   └── Cache auth state to .auth/

2. Test Initialization
   ├── Load fixtures
   ├── Inject cached auth state
   └── Initialize pages and API client

3. Test Execution
   ├── Arrange (setup test data)
   ├── Act (perform actions)
   └── Assert (verify results)

4. Test Cleanup
   ├── Close browser context
   ├── Dispose API context
   └── Collect results

5. Report Generation
   ├── Merge Allure results
   ├── Generate HTML report
   └── Deploy to GitHub Pages
```

### Authentication State Flow

```
.env.local (credentials)
    ↓
global-setup.ts (API login)
    ↓
.auth/user.json (cached state)
    ├── cookies
    ├── localStorage (enterprise-auth)
    └── sessionStorage
    ↓
auth.fixture.ts (inject into context)
    ↓
Test (authenticated session)
    ├── Page interactions
    └── API calls with JWT
```

## Scalability Considerations

### Parallel Execution
- **Smoke tests:** 1 shard (fast feedback)
- **Regression tests:** 4 shards (CI parallelization)
- **API tests:** Parallel execution (no browser overhead)
- **E2E tests:** Sequential (resource intensive)

### Performance Optimization
- **Global setup caching:** Eliminates per-test login overhead
- **Fixture composition:** Lazy initialization of resources
- **Centralized timeouts:** Consistent wait strategies
- **Trace on first retry:** Minimal overhead, useful debugging

### Maintainability
- **POM pattern:** Locator changes isolated to page classes
- **Fixture composition:** Reusable test resources
- **Helper utilities:** Common logic extracted
- **Path aliases:** Clear module organization

## Security Architecture

### Credential Management
- **Environment variables:** `.env.local` (gitignored)
- **GitHub Secrets:** API keys, webhook URLs
- **Storage state caching:** JWT stored locally, not in code
- **Logger masking:** Sensitive data suppressed in CI

### API Security
- **Bearer token auth:** JWT in Authorization header
- **HTTPS only:** All API calls use HTTPS
- **Token refresh:** Handled in global-setup
- **No hardcoded credentials:** All from environment

## Error Handling Strategy

### Test Failures
- **Retry logic:** 2 retries in CI, 0 locally
- **Trace on first retry:** Captures browser state
- **Screenshot on failure:** Visual debugging
- **Video on failure:** Full test recording

### API Errors
- **Status code validation:** Check response status
- **Error message logging:** Log API errors
- **Retry with backoff:** Generic retry utility
- **Timeout handling:** Centralized timeout constants

## Monitoring & Observability

### Allure Reporting
- **Test metadata:** Feature, story, severity annotations
- **Test history:** Track pass/fail trends
- **Failure analysis:** Screenshots, traces, videos
- **Performance metrics:** Test duration tracking

### CI/CD Monitoring
- **GitHub Actions logs:** Workflow execution details
- **Artifact storage:** Test results and reports
- **Google Chat notifications:** Real-time status updates
- **PR comments:** Report links on pull requests

## Future Architecture Enhancements

### Planned Improvements
1. **Visual regression testing** — Screenshot comparison
2. **Accessibility testing** — WCAG compliance checks
3. **Performance testing** — Lighthouse integration
4. **Load testing** — API endpoint stress testing
5. **Centralized reporting** — Allure Report Server integration
