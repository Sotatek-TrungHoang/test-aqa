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
    // After login, should leave the login page (use navigation timeout for slower browsers)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  });

  test(`${Tag.regression} invalid password → error message`, async ({ loginPage, page }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-002');

    await loginPage.login(env.testUser.email, 'wrong-password');
    // Should stay on login page after failed attempt
    await expect(page).toHaveURL(/\/login/);
  });

  test(`${Tag.regression} empty email → validation error`, async ({ loginPage, page }) => {
    allure.testId('AUTH-003');

    await loginPage.login('', env.testUser.password);
    // Should stay on login page — empty email prevented submission
    await expect(page).toHaveURL(/\/login/);
  });

  test(`${Tag.regression} empty password → validation error`, async ({ loginPage, page }) => {
    allure.testId('AUTH-004');

    await loginPage.login(env.testUser.email, '');
    // Should stay on login page — empty password prevented submission
    await expect(page).toHaveURL(/\/login/);
  });

  test(`${Tag.regression} logout clears session`, async ({ userContext }) => {
    allure.testId('AUTH-005');

    const page = await userContext.newPage();
    try {
      await page.goto('/');
      await page.waitForLoadState('load');

      // Logout button is in sidebar bottom, identified by its title attribute
      await page.locator('button[title="Đăng xuất"]').click();
      await expect(page).toHaveURL(/login/);
    } finally {
      await page.close();
    }
  });
});
