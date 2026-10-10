import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:3100' },
  webServer: [
    {
      command: 'npm run dev -- --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      env: {
        EVENTSIGNAL_MODE: 'public',
        EVENTSIGNAL_TEST_DIST: '.next-public-test',
      },
    },
    {
      command: 'npm run dev:owner -- --port 3101',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: false,
      env: {
        EVENTSIGNAL_TEST_DIST: '.next-owner-test',
        EVENTSIGNAL_OWNER_TOKEN: 'local-test-token-at-least-32-characters',
        GEMINI_API_KEY: '',
      },
    },
  ],
  projects: [
    {
      name: 'desktop',
      testMatch: 'brief.spec.ts',
      use: { viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: 'brief.spec.ts',
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: 'owner',
      testMatch: 'owner.spec.ts',
      use: {
        baseURL: 'http://127.0.0.1:3101',
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
