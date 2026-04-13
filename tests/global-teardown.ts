import { FullConfig } from '@playwright/test';

// Global teardown runs once after all tests
async function globalTeardown(_config: FullConfig): Promise<void> {
  // Add global teardown logic here (e.g. cleanup test data)
}

export default globalTeardown;
