import { defineConfig, devices } from '@playwright/test';

// Both can be overridden when running via the Copilot "run_dataminer_ux_audit" tool,
// or by setting env vars manually: AUDIT_BASE_URL and AUDIT_APP_URL.
const BASE_URL  = process.env.AUDIT_BASE_URL ?? 'https://fleetops-skyline.on.dataminer.services';
const AUTH_FILE = 'playwright/.auth/user.json';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    // Runs first: opens a headed browser so you can sign in via SAML + Microsoft + MFA.
    // Re-run this project whenever your session expires: npx playwright test --project=setup
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        viewport: { width: 1920, height: 1080 },
      },
    },

    // All style/spec tests reuse the saved session — no login prompts.
    {
      name: 'dataminer',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
