# Phase 04 — CI/CD Setup (GitHub Actions)

**Status:** ⬜ pending
**Priority:** High
**Blocked by:** Phase 03 (tests must exist before CI runs them)
**Plan:** [plan.md](./plan.md)

---

## Overview

Three GitHub Actions workflows:
1. **`test-ci.yml`** — main pipeline (lint → smoke → regression matrix) on push/PR
2. **`test-schedule.yml`** — nightly full suite on all browsers
3. **`test-report.yml`** — generates and publishes Allure report to GitHub Pages

---

## Files to Create

```
.github/
└── workflows/
    ├── test-ci.yml
    ├── test-schedule.yml
    └── test-report.yml
```

---

## Implementation Steps

### 1. `.github/workflows/test-ci.yml`

Main CI pipeline triggered on every push and PR to `main`/`develop`.

```yaml
name: Test CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Cancel previous runs on same branch/PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  # ─── Lint & type-check ────────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Type check
        run: pnpm type-check

  # ─── Smoke tests (fast feedback) ──────────────────────────────────
  smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Run smoke tests
        run: pnpm test:smoke
        env:
          CI: true
          BASE_URL: ${{ secrets.BASE_URL || 'http://localhost:3000' }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload smoke results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-results
          path: |
            playwright-report/
            allure-results/
          retention-days: 7

  # ─── Regression tests (matrix: chrome × 4 shards) ────────────────
  regression:
    name: Regression [${{ matrix.shard }}/${{ matrix.total }}]
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
        total: [4]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Run regression shard ${{ matrix.shard }}/${{ matrix.total }}
        run: pnpm test:regression --shard=${{ matrix.shard }}/${{ matrix.total }}
        env:
          CI: true
          BASE_URL: ${{ secrets.BASE_URL || 'http://localhost:3000' }}
          API_BASE_URL: ${{ secrets.API_BASE_URL || 'http://localhost:3001/api' }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}

      - name: Upload regression results (shard ${{ matrix.shard }})
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: regression-results-shard-${{ matrix.shard }}
          path: allure-results/
          retention-days: 7

  # ─── API tests ────────────────────────────────────────────────────
  api:
    name: API Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright (no browser needed for API)
        run: npx playwright install --with-deps

      - name: Run API tests
        run: pnpm test:api
        env:
          CI: true
          API_BASE_URL: ${{ secrets.API_BASE_URL || 'http://localhost:3001/api' }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload API results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-results
          path: allure-results/
          retention-days: 7

  # ─── Merge allure results & publish report ─────────────────────────
  report:
    name: Publish Allure Report
    runs-on: ubuntu-latest
    needs: [smoke, regression, api]
    if: always()
    steps:
      - uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: all-results/

      - name: Merge allure results
        run: |
          npm install -g allure-commandline
          mkdir -p merged-allure-results
          find all-results -name "*.json" -exec cp {} merged-allure-results/ \;

      - name: Generate Allure report
        run: allure generate merged-allure-results --clean -o allure-report

      - name: Upload combined report
        uses: actions/upload-artifact@v4
        with:
          name: allure-report
          path: allure-report/
          retention-days: 30
```

### 2. `.github/workflows/test-schedule.yml`

Nightly full cross-browser suite.

```yaml
name: Nightly Full Suite

on:
  schedule:
    - cron: '0 1 * * *'  # 01:00 UTC daily
  workflow_dispatch:        # Manual trigger

env:
  NODE_VERSION: '20'

jobs:
  full-suite:
    name: Full Suite [${{ matrix.browser }}]
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install ${{ matrix.browser }} --with-deps

      - name: Run full suite on ${{ matrix.browser }}
        run: pnpm test --project=${{ matrix.browser }}
        env:
          CI: true
          BASE_URL: ${{ secrets.BASE_URL }}
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}

      - name: Upload nightly results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-${{ matrix.browser }}
          path: allure-results/
          retention-days: 14
```

### 3. `.github/workflows/test-report.yml`

Publishes Allure report to GitHub Pages after CI completes.

```yaml
name: Publish Allure Report

on:
  workflow_run:
    workflows: ['Test CI']
    types: [completed]

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  publish:
    name: Publish to GitHub Pages
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion != 'skipped' }}
    steps:
      - uses: actions/checkout@v4

      - name: Download allure report artifact
        uses: dawidd6/action-download-artifact@v3
        with:
          workflow: test-ci.yml
          name: allure-report
          path: allure-report/

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: allure-report
          destination_dir: reports/${{ github.event.workflow_run.run_number }}

      - name: Comment PR with report link
        uses: actions/github-script@v7
        if: github.event.workflow_run.event == 'pull_request'
        with:
          script: |
            const reportUrl = `https://${context.repo.owner}.github.io/${context.repo.repo}/reports/${{ github.event.workflow_run.run_number }}`;
            const prNumber = ${{ github.event.workflow_run.pull_requests[0].number || 0 }};
            if (prNumber) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body: `📊 **Allure Test Report**: [View Report](${reportUrl})`,
              });
            }
```

---

## Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `BASE_URL` | App URL for the test environment |
| `API_BASE_URL` | API base URL |
| `TEST_USER_EMAIL` | Regular user credentials |
| `TEST_USER_PASSWORD` | Regular user password |
| `TEST_ADMIN_EMAIL` | Admin user credentials |
| `TEST_ADMIN_PASSWORD` | Admin user password |

---

## Todo

- [ ] Create `.github/workflows/test-ci.yml`
- [ ] Create `.github/workflows/test-schedule.yml`
- [ ] Create `.github/workflows/test-report.yml`
- [ ] Initialize GitHub repo: `git init && git remote add origin <url>`
- [ ] Add all secrets to GitHub repository settings
- [ ] Enable GitHub Pages (Settings → Pages → Source: gh-pages branch)
- [ ] Verify lint job passes on first push
- [ ] Verify smoke job runs after lint succeeds

---

## Success Criteria

- Push to `develop` triggers the CI pipeline
- Lint job passes
- Smoke job runs after lint
- Regression matrix splits into 4 shards
- Allure report artifact is uploaded
- PR comment includes report URL (when GitHub Pages configured)
