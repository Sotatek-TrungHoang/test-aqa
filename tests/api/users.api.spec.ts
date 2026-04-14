import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { UsersEndpoint } from '@api/endpoints/users.endpoint';

test.describe('Users API', () => {
  test(`${Tag.api} ${Tag.smoke} GET /users returns array`, async ({ apiClient }) => {
    allure.feature('Users API');
    allure.testId('API-USERS-001');

    const users = new UsersEndpoint(apiClient);
    const result = await users.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  test(`${Tag.api} GET /users/:id returns specific user`, async ({ apiClient }) => {
    allure.testId('API-USERS-003');

    const users = new UsersEndpoint(apiClient);
    const all = await users.getAll();
    expect(all.length).toBeGreaterThan(0);

    const first = all[0];
    const fetched = await users.getById(first.id);
    expect(fetched.email).toBe(first.email);
    expect(fetched.id).toBe(first.id);
  });
});
