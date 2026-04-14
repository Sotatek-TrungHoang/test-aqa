/** Retry an async operation up to `attempts` times with `delayMs` between retries */
export async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
