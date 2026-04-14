import { test, expect } from '@fixtures/index';
import { Tag } from '../annotations';
import { allure } from '@utils/allure-utils';
import { UsersEndpoint } from '@api/endpoints/users.endpoint';
import { UserFactory } from '@data/user.factory';

test.describe('Users API', () => {
  test(`${Tag.api} ${Tag.smoke} GET /users returns array`, async ({ apiClient }) => {
    allure.feature('Users API');
    allure.testId('API-USERS-001');

    const users = new UsersEndpoint(apiClient);
    const result = await users.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  test(`${Tag.api} POST /users creates new user`, async ({ apiClient }) => {
    allure.testId('API-USERS-002');

    const users = new UsersEndpoint(apiClient);
    const payload = UserFactory.create();
    const created = await users.create(payload);

    try {
      expect(created).toMatchObject({
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      });
      expect(created.id).toBeDefined();
    } finally {
      await users.delete(created.id);
    }
  });

  test(`${Tag.api} GET /users/:id returns specific user`, async ({ apiClient }) => {
    allure.testId('API-USERS-003');

    const users = new UsersEndpoint(apiClient);
    const payload = UserFactory.create();
    const created = await users.create(payload);

    try {
      const fetched = await users.getById(created.id);
      expect(fetched.email).toBe(payload.email);
    } finally {
      await users.delete(created.id);
    }
  });

  test(`${Tag.api} DELETE /users/:id removes user`, async ({ apiClient }) => {
    allure.testId('API-USERS-004');

    const users = new UsersEndpoint(apiClient);
    const created = await users.create(UserFactory.create());
    await users.delete(created.id);

    // Verify gone (expect 404 or empty)
    await expect(users.getById(created.id)).rejects.toThrow();
  });
});
