import { mergeTests } from '@playwright/test';
import { test as pagesTest } from './pages.fixture';
import { test as authTest } from './auth.fixture';
import { test as apiTest } from './api.fixture';

/** Merged test with all fixtures: loginPage, dashboardPage, userContext, adminContext, apiClient */
export const test = mergeTests(pagesTest, authTest, apiTest);
export { expect } from '@playwright/test';
