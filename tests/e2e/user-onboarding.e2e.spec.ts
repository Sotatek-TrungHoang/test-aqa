import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { UserFactory } from '@data/user.factory';

test.describe('User Onboarding', () => {
  test.setTimeout(120_000); // Extended timeout for E2E flow

  test(`${Tag.e2e} ${Tag.critical} new user can register and access dashboard`, async ({
    page,
  }) => {
    allure.feature('Onboarding');
    allure.story('User Registration');
    allure.testId('E2E-001');

    const user = UserFactory.create();

    // Step 1: Navigate to register
    await page.goto('/register');
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();

    // Step 2: Fill registration form
    await page.fill('[data-testid="first-name"]', user.firstName);
    await page.fill('[data-testid="last-name"]', user.lastName);
    await page.fill('[data-testid="email"]', user.email);
    await page.fill('[data-testid="password"]', user.password);
    await page.fill('[data-testid="confirm-password"]', user.password);
    await page.click('[data-testid="submit"]');

    // Step 3: Verify redirect to onboarding or dashboard
    await expect(page).toHaveURL(/dashboard|onboarding/);

    // Step 4: Verify user info displayed
    await expect(page.locator('[data-testid="user-name"]')).toContainText(user.firstName);
  });
});
