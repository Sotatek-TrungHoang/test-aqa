import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { env } from '@config/environments';

test.describe('Auth Smoke', () => {
  test(`${Tag.smoke} ${Tag.critical} login redirects to dashboard`, async ({ loginPage, page }) => {
    allure.feature('Authentication');
    allure.severity('critical');
    allure.testId('AUTH-SMOKE-001');

    await loginPage.navigate();
    await loginPage.login(env.testUser.email, env.testUser.password);

    await expect(page).toHaveURL(/dashboard/);
  });

  test(`${Tag.smoke} login page loads`, async ({ page }) => {
    allure.feature('Authentication');
    allure.testId('AUTH-SMOKE-002');

    await page.goto('/login');
    await expect(page.locator('[data-testid="submit"]')).toBeVisible();
  });
});
