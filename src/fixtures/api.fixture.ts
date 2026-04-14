import { test as base } from '@playwright/test';
import { ApiClient } from '@api/api-client';
import { env } from '@config/environments';

type ApiFixtures = {
  apiClient: ApiClient;
};

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, { baseURL: env.apiBaseURL });
    await use(client);
  },
});

export { expect } from '@playwright/test';
