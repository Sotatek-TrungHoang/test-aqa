# Playwright AQA Base Project

**Plan Dir:** `plans/260413-1541-playwright-aqa-base-project/`
**Status:** Ready for Implementation
**Priority:** High
**Target:** Production-ready Playwright framework for AQA engineer team

---

## Overview

Greenfield setup of a professional Playwright-based AQA base project.
Designed for multi-engineer QA teams with scalable structure, TypeScript, POM pattern, fixtures, CI/CD, and reporting.

**Stack:** TypeScript · Playwright v1.40+ · pnpm · ESLint · Prettier · Allure · GitHub Actions

---

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Project Setup & Config | ✅ complete | [phase-01-project-setup.md](./phase-01-project-setup.md) |
| 2 | Core Infrastructure (fixtures, pages, helpers) | ⬜ pending | [phase-02-core-infrastructure.md](./phase-02-core-infrastructure.md) |
| 3 | Example Tests (smoke, regression, e2e, api) | ⬜ pending | [phase-03-example-tests.md](./phase-03-example-tests.md) |
| 4 | CI/CD (GitHub Actions) | ⬜ pending | [phase-04-cicd-setup.md](./phase-04-cicd-setup.md) |
| 5 | Documentation | ⬜ pending | [phase-05-documentation.md](./phase-05-documentation.md) |

---

## Key Dependencies

- Phase 1 must complete before Phase 2 (tsconfig path aliases needed)
- Phase 2 must complete before Phase 3 (fixtures/pages used in tests)
- Phase 3 must complete before Phase 4 (CI runs actual tests)
- Phase 5 can run in parallel with Phase 4

---

## Research Reports

- [Best Practices Report](../reports/researcher-260413-1539-playwright-aqa-setup-best-practices.md)
- [Technical Setup Report](../reports/researcher-260413-1539-playwright-professional-setup.md)

---

## Success Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm test:smoke` runs sample smoke tests
- [ ] `pnpm test:regression` runs sample regression tests
- [ ] `pnpm test:api` runs sample API tests
- [ ] `pnpm lint` passes with zero errors
- [ ] HTML report generated after test run
- [ ] GitHub Actions workflow runs on push
- [ ] README covers getting started in <10 min
