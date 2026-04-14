# Code Standards

## File Naming Conventions

### TypeScript/JavaScript Files
- **Format:** kebab-case with descriptive names
- **Examples:**
  - `api-client.ts` (not `apiClient.ts` or `api_client.ts`)
  - `users.endpoint.ts` (not `usersEndpoint.ts`)
  - `assertion.helper.ts` (not `assertionHelper.ts`)
  - `global-setup.ts` (not `globalSetup.ts`)
- **Rationale:** Self-documenting names for LLM tools (Grep, Glob); easier to scan file listings

### Page Object Models
- **Format:** `{page-name}.page.ts`
- **Examples:** `login.page.ts`, `dashboard.page.ts`, `base.page.ts`

### Fixtures
- **Format:** `{fixture-type}.fixture.ts`
- **Examples:** `pages.fixture.ts`, `auth.fixture.ts`, `api.fixture.ts`

### Helpers
- **Format:** `{helper-type}.helper.ts`
- **Examples:** `assertion.helper.ts`, `browser.helper.ts`, `data.helper.ts`

### Utilities
- **Format:** `{utility-name}.ts`
- **Examples:** `allure-utils.ts`, `logger.ts`, `retry.ts`

### Test Specs
- **Format:** `{feature}.spec.ts` or `{feature}.{type}.spec.ts`
- **Examples:** `login.spec.ts`, `login-data-driven.spec.ts`, `users.api.spec.ts`

## TypeScript Conventions

### Strict Mode (MANDATORY)
All TypeScript files must compile with strict mode enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Type Annotations
- **Always annotate function parameters and return types**
  ```typescript
  // Good
  async function login(email: string, password: string): Promise<void> {
    // ...
  }

  // Bad
  async function login(email, password) {
    // ...
  }
  ```

- **Use explicit types for class properties**
  ```typescript
  // Good
  class LoginPage {
    private emailInput: Locator;
    private passwordInput: Locator;
  }

  // Bad
  class LoginPage {
    emailInput;
    passwordInput;
  }
  ```

### Generics
- Use generics for reusable components
  ```typescript
  // Good
  class ApiClient {
    async get<T>(url: string): Promise<T> {
      // ...
    }
  }

  // Bad
  class ApiClient {
    async get(url: string): Promise<any> {
      // ...
    }
  }
  ```

## Class Naming

### Format: PascalCase
- **Examples:** `LoginPage`, `DashboardPage`, `ApiClient`, `UserFactory`
- **Pattern:** `{Noun}{Type}` (e.g., `LoginPage`, `AssertionHelper`)

### Inheritance Hierarchy
- **Base classes:** `Base{Type}` (e.g., `BasePage`)
- **Concrete classes:** `{Specific}{Type}` (e.g., `LoginPage`, `DashboardPage`)

## Method & Function Naming

### Format: camelCase
- **Examples:** `login()`, `getErrorMessage()`, `assertVisible()`, `waitForResponse()`
- **Verbs for actions:** `get`, `set`, `create`, `delete`, `update`, `assert`, `wait`, `capture`
- **Booleans:** `is*`, `has*`, `can*` (e.g., `isLoaded()`, `hasError()`)

### Async Methods
- Prefix with `async`, suffix with `await` calls
  ```typescript
  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }
  ```

## Variable Naming

### Format: camelCase
- **Examples:** `testUser`, `apiBaseURL`, `maxRetries`, `isAuthenticated`
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)

### Locators
- Suffix with `Locator` or `Selector`
  ```typescript
  private emailInput: Locator;
  private submitButton: Locator;
  private errorAlert: Locator;
  ```

## Path Aliases (MANDATORY)

All imports must use path aliases defined in `tsconfig.json`:

| Alias | Path | Usage |
|-------|------|-------|
| `@pages/*` | `src/pages/*` | Page Object Models |
| `@fixtures/*` | `src/fixtures/*` | Playwright fixtures |
| `@helpers/*` | `src/helpers/*` | Helper utilities |
| `@api/*` | `src/api/*` | API client and endpoints |
| `@config/*` | `src/config/*` | Configuration |
| `@utils/*` | `src/utils/*` | Utility functions |
| `@data/*` | `data/*` | Test data and factories |

### Correct Usage
```typescript
// Good
import { LoginPage } from '@pages/login.page';
import { test } from '@fixtures';
import { AssertionHelper } from '@helpers/assertion.helper';
import { ApiClient } from '@api/api-client';
import { env } from '@config/environments';

// Bad
import { LoginPage } from '../../../src/pages/login.page';
import { test } from '../fixtures';
import { AssertionHelper } from '../helpers/assertion.helper';
```

## Page Object Model (POM) Pattern

### Structure
```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // Locators (private)
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('[role="alert"]');
  }

  // Public methods
  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
    await this.waitForUrl(/\/dashboard/);
  }

  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorAlert);
  }
}
```

### Rules
- **Locators are private:** Encapsulate selectors, expose only methods
- **Extend BasePage:** Inherit common methods (goto, fill, click, etc.)
- **One page per file:** `login.page.ts` contains only `LoginPage`
- **Descriptive method names:** `login()`, `getErrorMessage()`, not `clickButton()`
- **No test logic in pages:** Pages are dumb, tests are smart

## Fixture Composition Pattern

### Structure
```typescript
import { mergeTests } from '@playwright/test';
import { pageFixtures } from './pages.fixture';
import { authFixtures } from './auth.fixture';
import { apiFixtures } from './api.fixture';

export const test = mergeTests(pageFixtures, authFixtures, apiFixtures);
export { expect } from '@playwright/test';
```

### Rules
- **Merge all fixtures in `index.ts`:** Single import point for tests
- **Separate concerns:** Pages, auth, API in separate files
- **Lazy initialization:** Fixtures initialize only when used
- **Typed fixtures:** All fixtures have explicit types

## Test Tagging Conventions

### Tag Format
- **Prefix:** `@` (e.g., `@smoke`, `@regression`)
- **Scope:** One tag per test category
- **Location:** `test.describe.configure({ tag: [...] })`

### Standard Tags
| Tag | Purpose | Frequency | Speed |
|-----|---------|-----------|-------|
| `@smoke` | Critical paths only | Every commit | <5s |
| `@regression` | Full feature coverage | Every PR | 30-60s |
| `@e2e` | Complete user journeys | Nightly | 60-120s |
| `@api` | Backend endpoints | Every commit | <2s |
| `@visual` | Visual regression | Weekly | 10-30s |
| `@critical` | Must-pass tests | Every run | Any |
| `@slow` | Long-running tests | Nightly only | >30s |
| `@flaky` | Known flaky tests | Manual only | Any |
| `@wip` | Work in progress | Never in CI | Any |

### Usage
```typescript
test.describe.configure({ tag: '@smoke' });

test('login redirects to dashboard', async ({ loginPage }) => {
  // ...
});
```

## Allure Annotation Standards

### Required Annotations
All tests must include:
- `@feature` — Feature name (e.g., "Authentication")
- `@story` — User story (e.g., "User login")
- `@severity` — Test severity (blocker, critical, normal, minor, trivial)

### Usage
```typescript
import { allure } from '@utils/allure-utils';

test('valid login succeeds', async ({ loginPage }) => {
  allure.feature('Authentication');
  allure.story('User login');
  allure.severity('critical');
  allure.description('Verify user can login with valid credentials');
  allure.testId('AUTH-001');

  // Test code
});
```

### Annotation Functions
- `feature(name: string)` — Feature name
- `story(name: string)` — User story
- `severity(level: string)` — blocker, critical, normal, minor, trivial
- `description(text: string)` — Test description
- `testId(id: string)` — Test identifier
- `issue(url: string)` — Link to issue tracker
- `link(url: string, name: string)` — Custom link

## Data Factory Pattern

### Structure
```typescript
import { faker } from '@faker-js/faker';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      email: faker.internet.email(),
      password: 'Demo@1234',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }

  static createAdmin(overrides?: Partial<User>): User {
    return this.create({
      role: 'admin',
      ...overrides,
    });
  }

  static createBatch(count: number): User[] {
    return Array.from({ length: count }, () => this.create());
  }
}
```

### Rules
- **Static methods:** No instance creation needed
- **Faker.js for randomness:** Realistic test data
- **Overrides support:** Allow customization
- **Batch creation:** Support multiple records
- **Consistent defaults:** Same password for all test users

## API Client Pattern

### Structure
```typescript
import { APIRequestContext } from '@playwright/test';

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
```

### Rules
- **Generic types:** Typed responses
- **Bearer token support:** Auth header management
- **Error handling:** Throw on non-2xx status
- **Endpoint wrappers:** Specific endpoints extend ApiClient

## Error Handling

### Try-Catch Pattern
```typescript
try {
  await this.login(email, password);
} catch (error) {
  if (error instanceof Error) {
    logger.error(`Login failed: ${error.message}`);
  }
  throw error;
}
```

### Assertion Errors
```typescript
try {
  await expect(element).toBeVisible();
} catch (error) {
  logger.error(`Assertion failed: ${error}`);
  throw new Error(`Expected element to be visible but it was not`);
}
```

## Code Comments

### When to Comment
- **Complex logic:** Explain the "why", not the "what"
- **Non-obvious patterns:** Clarify architectural decisions
- **Workarounds:** Document temporary solutions with issue links
- **Edge cases:** Explain why special handling is needed

### Comment Format
```typescript
// Good: Explains why
// Retry login because JWT may have expired during test setup
await retry(() => this.login(email, password), 3, 1000);

// Bad: Explains what (code already shows this)
// Call login function with email and password
await this.login(email, password);
```

## Linting & Formatting

### ESLint Rules
- No `any` types (use `unknown` with type guards)
- No unused variables or parameters
- No implicit returns
- No console.log in production code (use logger)

### Prettier Configuration
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line objects
- Line length: 100 characters (soft limit)

### Pre-commit Hooks
Husky + lint-staged automatically run:
- ESLint with auto-fix on staged `.ts` files
- Prettier formatting on staged files
- No manual formatting needed before commit

## Import Organization

### Order
1. External packages (Playwright, Faker, etc.)
2. Internal modules (using path aliases)
3. Blank line between groups

### Example
```typescript
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

import { LoginPage } from '@pages/login.page';
import { env } from '@config/environments';
import { logger } from '@utils/logger';
```

## Testing Best Practices

### Test Structure
```typescript
test('should do something', async ({ loginPage, apiClient }) => {
  // Arrange: Set up test data
  const user = { email: 'test@example.com', password: 'Demo@1234' };

  // Act: Perform action
  await loginPage.login(user.email, user.password);

  // Assert: Verify result
  await expect(loginPage.page).toHaveURL(/\/dashboard/);
});
```

### Naming
- **Descriptive test names:** "should login with valid credentials" (not "test login")
- **One assertion per test:** Focus on single behavior
- **Avoid test interdependencies:** Each test must be independent

### Fixtures
- **Use fixtures for setup:** Don't repeat setup code
- **Lazy initialization:** Fixtures initialize only when used
- **Scope appropriately:** test, describe, or worker scope

## File Size Management

### Target: Keep files under 200 lines
- **Pages:** 40-60 lines (locators + methods)
- **Helpers:** 25-35 lines (single responsibility)
- **Fixtures:** 40-50 lines (one fixture type per file)
- **Tests:** 30-50 lines (one test per file or related tests)

### When to Split
- File exceeds 200 lines → Extract into separate module
- Multiple concerns in one file → Separate by responsibility
- Reusable logic → Extract to helper or utility

## Security Standards

### Credentials
- **Never hardcode credentials:** Use `.env.local` (gitignored)
- **Use environment variables:** `env.testUser.email`, `env.testAdmin.password`
- **Mask in logs:** Logger suppresses sensitive data in CI

### API Keys
- **Store in GitHub Secrets:** Not in code or `.env` files
- **Reference in workflows:** `${{ secrets.API_KEY }}`
- **Rotate regularly:** Update secrets quarterly

### Data
- **Use test data only:** Never use production data
- **Faker.js for randomness:** Avoid predictable test data
- **Clean up after tests:** Delete test data in teardown
