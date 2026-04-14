import { test, expect } from '@fixtures/index';
import { Tag } from '../../annotations';
import { allure } from '@utils/allure-utils';
import { env } from '@config/environments';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test(`${Tag.regression} valid credentials → dashboard`, async ({ loginPage, page }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-001');

    await loginPage.login(env.testUser.email, env.testUser.password);
    await expect(page).toHaveURL(/dashboard/);
  });

  test(`${Tag.regression} invalid password → error message`, async ({ loginPage }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-002');

    await loginPage.login(env.testUser.email, 'wrong-password');
    const error = await loginPage.getErrorMessage();
    expect(error).toContain('Invalid');
  });

  test(`${Tag.regression} empty email → validation error`, async ({ loginPage }) => {
    allure.testId('AUTH-003');

    await loginPage.login('', env.testUser.password);
    await expect(loginPage.errorAlert).toBeVisible();
  });

  test(`${Tag.regression} empty password → validation error`, async ({ loginPage }) => {
    allure.testId('AUTH-004');

    await loginPage.login(env.testUser.email, '');
    await expect(loginPage.errorAlert).toBeVisible();
  });

  test(`${Tag.regression} logout clears session`, async ({ userContext }) => {
    allure.testId('AUTH-005');

    const page = await userContext.newPage();
    try {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/dashboard/);

      // Simulate logout via UI
      await page.locator('[data-testid="user-menu"]').click();
      await page.locator('[data-testid="logout"]').click();
      await expect(page).toHaveURL(/login/);
    } finally {
      await page.close();
    }
  });
});
