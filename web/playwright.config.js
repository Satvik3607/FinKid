import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* Timeout of 30 seconds for each test */
  timeout: 30000,
  expect: {
    timeout: 10000, // 10s expect timeout due to potential lag
  },
  /* Run tests in files sequentially to prevent concurrent DB writes or auth race conditions */
  fullyParallel: false,
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
  },

  /* Configure projects */
  projects: [
    // 1. Auth Setup Project
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    
    // 2. Main tests that run with an authenticated session
    {
      name: 'e2e-logged-in',
      testMatch: /.*\.spec\.js/,
      testIgnore: /auth\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // Load the session state from setup
        storageState: 'playwright/.auth/user.json',
      },
    },

    // 3. Auth tests running in a clean context (unauthenticated)
    {
      name: 'e2e-auth',
      testMatch: /auth\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // Do NOT load storageState
        storageState: undefined,
      },
    },
  ],
});
