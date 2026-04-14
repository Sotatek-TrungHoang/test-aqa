/** Canonical test annotation tags — use in test titles to enable tag-based filtering */
export const Tag = {
  smoke: '@smoke',
  regression: '@regression',
  e2e: '@e2e',
  api: '@api',
  visual: '@visual',
  critical: '@critical',
  slow: '@slow',
  flaky: '@flaky',
  wip: '@wip',
} as const;
