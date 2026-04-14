import { test, expect } from '@fixtures/index';
import { Tag } from '../../annotations';
import { allure } from '@utils/allure-utils';
import { env } from '@config/environments';

interface LoginCase {
  id: string;
  email: string;
  password: string;
  expectError: boolean;
  errorContains?: string;
}

const cases: LoginCase[] = [
  {
    id: 'AUTH-DD-001',
    email: env.testUser.email,
    password: env.testUser.password,
    expectError: false,
  },
  {
    id: 'AUTH-DD-002',
    email: 'wrong@example.com',
    password: 'badpass',
    expectError: true,
    errorContains: 'Invalid',
  },
  {
    id: 'AUTH-DD-003',
    email: 'notanemail',
    password: 'any',
    expectError: true,
  },
  {
    id: 'AUTH-DD-004',
    email: '',
    password: '',
    expectError: true,
  },
];

test.describe('Login Data-Driven', () => {
  for (const c of cases) {
    test(`${Tag.regression} [${c.id}] login email="${c.email}"`, async ({ loginPage, page }) => {
      allure.testId(c.id);

      await loginPage.navigate();
      await loginPage.login(c.email, c.password);

      if (c.expectError) {
        // Should stay on login page after failed attempt
        await expect(page).toHaveURL(/\/login/);
      } else {
        // Should leave login page after successful login
        await expect(page).not.toHaveURL(/\/login/);
      }
    });
  }
});
