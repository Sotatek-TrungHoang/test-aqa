/** Centralized timeout constants (milliseconds) */
export const Timeouts = {
  /** Short UI interaction (clicks, fills) */
  action: 10_000,
  /** Page navigation */
  navigation: 30_000,
  /** Full test timeout */
  test: 30_000,
  /** Long-running flows (checkout, onboarding) */
  longTest: 120_000,
  /** Quick existence check */
  assertion: 5_000,
} as const;
