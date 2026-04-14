import { test } from '@playwright/test';

export const allure = {
  description: (desc: string): void => {
    test.info().annotations.push({ type: 'description', description: desc });
  },

  issue: (id: string): void => {
    test.info().annotations.push({ type: 'issue', description: id });
  },

  testId: (id: string): void => {
    test.info().annotations.push({ type: 'testId', description: id });
  },

  severity: (level: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial'): void => {
    test.info().annotations.push({ type: 'severity', description: level });
  },

  feature: (name: string): void => {
    test.info().annotations.push({ type: 'feature', description: name });
  },

  story: (name: string): void => {
    test.info().annotations.push({ type: 'story', description: name });
  },
};
