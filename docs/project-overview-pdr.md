# Project Overview & Product Development Requirements (PDR)

## Project Purpose

**test-aqa** is a professional-grade test automation framework built with Playwright and TypeScript. It provides a scalable, maintainable foundation for E2E, API, smoke, and regression testing of web applications with JWT-based authentication and complex user workflows.

## Target Application

The framework tests a web application featuring:
- JWT-based authentication with Zustand state management
- User management and role-based access control (standard users and admins)
- Dashboard with user information display
- User onboarding/registration flows
- RESTful API endpoints for user operations

## Tech Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Playwright | 1.42+ | Cross-browser test automation engine |
| TypeScript | 5.4+ | Type-safe test code and utilities |
| Node.js | 20+ | Runtime environment |
| pnpm | 9+ | Package manager (faster, more efficient than npm) |
| Faker.js | 8.4+ | Test data generation |
| Allure | 2.27+ | Rich test reporting and analytics |
| ESLint + Prettier | Latest | Code quality and formatting |
| Husky + lint-staged | Latest | Pre-commit hooks for code standards |

## Team Workflow

### Development Cycle
1. **Plan** — Define test scenarios and acceptance criteria
2. **Implement** — Write tests following POM pattern and fixture composition
3. **Review** — Code review for quality and standards compliance
4. **Test** — Run full suite locally before pushing
5. **CI/CD** — Automated testing on push/PR with parallel execution
6. **Report** — Allure reports deployed to GitHub Pages

### Code Standards
- **Naming:** kebab-case files, PascalCase classes, camelCase methods
- **TypeScript:** Strict mode enabled, no implicit any
- **Path Aliases:** @pages, @fixtures, @helpers, @api, @config, @utils, @data
- **Patterns:** Page Object Model (POM), fixture composition, factory pattern for data
- **Testing:** Tag-based filtering (@smoke, @regression, @e2e, @api)

## Testing Strategy

### Test Categories

| Category | Scope | Speed | Frequency | Purpose |
|----------|-------|-------|-----------|---------|
| Smoke | Critical paths only | <5s per test | Every commit | Fast sanity checks |
| Regression | Full feature coverage | 30-60s per test | Every PR | Prevent regressions |
| E2E | Complete user journeys | 60-120s per test | Nightly | Real-world scenarios |
| API | Backend endpoints | <2s per test | Every commit | API contract validation |

### Test Execution

**Local Development:**
```bash
pnpm test:smoke          # Fast feedback loop
pnpm test:regression     # Full regression suite
pnpm test:e2e            # End-to-end flows
pnpm test:api            # API tests
```

**CI/CD Pipeline:**
- **Test CI:** Push/PR to main/develop → Lint → Smoke + Regression (4 shards) + API
- **Nightly:** Full suite across chromium, firefox, webkit at 01:00 UTC
- **Report:** Allure report deployed to GitHub Pages with PR comments

### Authentication Strategy

**Global Setup (API-Based):**
- Calls `/auth/login` endpoint directly (no browser login)
- Caches JWT token and Zustand state to `.auth/user.json` and `.auth/admin.json`
- Fixtures inject cached auth state into browser context
- Eliminates flaky browser login, improves test reliability

## Quality Gates

### Code Quality
- **Linting:** ESLint with TypeScript plugin — no errors allowed
- **Formatting:** Prettier — enforced via pre-commit hooks
- **Type Safety:** TypeScript strict mode — no implicit any
- **Test Coverage:** Minimum 80% for new features

### Test Quality
- **Flakiness:** Max 2 retries in CI, zero tolerance for flaky tests
- **Performance:** Smoke tests <5s, regression <60s, E2E <120s
- **Reliability:** All tests must pass consistently across chromium, firefox, webkit
- **Reporting:** Allure annotations required for all tests (@feature, @story, @severity)

### CI/CD Gates
- **Pre-commit:** ESLint + Prettier on staged files
- **Pre-push:** Type check + local test run
- **CI Pipeline:** Lint → Smoke → Regression → API → Allure report
- **Merge Requirement:** All CI checks must pass, PR review approved

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Execution Time | <5 min (smoke) | CI pipeline duration |
| Test Reliability | 99%+ pass rate | Allure report analytics |
| Code Coverage | 80%+ | Coverage reports |
| Flakiness Rate | <1% | Failed retries / total runs |
| Documentation | 100% | Docs coverage vs codebase |

## Project Phases

### Phase 1: Project Setup (DONE)
- Initialize Playwright + TypeScript project
- Configure ESLint, Prettier, Husky
- Set up path aliases and tsconfig
- Create .env.example and configuration layer

### Phase 2: Core Infrastructure (DONE)
- Implement Page Object Model (POM) pattern
- Create fixture composition system (pages, auth, api)
- Build helper utilities (assertion, browser, data, storage, wait)
- Implement API client with endpoint wrappers
- Set up Allure reporting

### Phase 3: Example Tests (DONE)
- Smoke tests for critical paths
- Regression tests for auth flows
- E2E tests for user onboarding
- API tests for user endpoints
- Data-driven test examples

### Phase 4: Expand Test Coverage (TODO)
- Add more user management tests
- Implement dashboard feature tests
- Add permission/role-based tests
- Expand API endpoint coverage

### Phase 5: Advanced Testing (TODO)
- Visual regression testing
- Accessibility testing (WCAG compliance)
- Performance testing (Lighthouse integration)
- Load testing for API endpoints

### Phase 6: Optimization & Maintenance (TODO)
- Test parallelization tuning
- CI/CD pipeline optimization
- Documentation updates
- Dependency updates and security patches

## Dependencies & Constraints

### External Dependencies
- GitHub Actions for CI/CD (self-hosted runner)
- Google Chat webhook for notifications
- Allure Report Server (optional, for centralized reporting)

### Technical Constraints
- Node.js 20+ required (ES2020 target)
- Playwright requires Chromium, Firefox, WebKit binaries
- JWT token refresh logic must be handled in global-setup
- Zustand state stored in localStorage (enterprise-auth key)

### Known Limitations
- One-way API communication (no response validation beyond status)
- Rate limiting on API endpoints (verify in test data setup)
- Browser context isolation required for parallel test execution
- Storage state caching requires manual refresh if auth logic changes

## Next Steps

1. **Immediate:** Expand test coverage for user management features
2. **Short-term:** Implement visual regression testing
3. **Medium-term:** Add accessibility testing and performance benchmarks
4. **Long-term:** Integrate with centralized Allure Report Server
