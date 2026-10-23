import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/MedConnect_Application',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -w MedConnect -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/MedConnect_Application/',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
