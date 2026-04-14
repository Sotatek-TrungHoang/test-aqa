import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { ApiClient } from '@api/api-client';
import { env } from '@config/environments';

type ApiFixtures = {
  apiClient: ApiClient;
};

/** Read the cached JWT token from the user auth state file (written by global-setup) */
function loadCachedToken(): string | null {
  const authFile = path.join(process.cwd(), '.auth', 'user.json');
  if (!fs.existsSync(authFile)) return null;

  try {
    const storageState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const authEntry = storageState.origins
      ?.flatMap(
        (o: { localStorage?: Array<{ name: string; value: string }> }) => o.localStorage ?? [],
      )
      .find((item: { name: string }) => item.name === 'enterprise-auth');

    if (authEntry) {
      const authState = JSON.parse(authEntry.value) as { state?: { token?: string } };
      return authState.state?.token ?? null;
    }
  } catch {
    // Ignore parse errors — fall through to null
  }
  return null;
}

export const test = base.extend<ApiFixtures>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, { baseURL: env.apiBaseURL });

    // Attach cached auth token so API requests are authenticated
    const token = loadCachedToken();
    if (token) client.setAuthToken(token);

    await use(client);
  },
});

export { expect } from '@playwright/test';
