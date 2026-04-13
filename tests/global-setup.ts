import { FullConfig } from '@playwright/test';

// Global setup runs once before all tests
async function globalSetup(_config: FullConfig): Promise<void> {
  // Add global setup logic here (e.g. authenticate, seed test data)
}

export default globalSetup;
