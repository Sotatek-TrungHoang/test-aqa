import { FullConfig } from '@playwright/test';

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Add any post-suite cleanup here (DB reset, temp file removal, etc.)
}
