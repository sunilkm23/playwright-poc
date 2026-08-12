// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. Adjust based on CI environment */
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    process.env.CI ? ['blob'] : ['html', { open: 'never' }],
    process.env.QTEST_ENABLED ? ['./src/reporters/qTestReporter.ts'] : [''],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    headless: true,
    video: 'retain-on-failure',
    screenshot: 'on',
  },
  timeout: 1000 * 60 * 5,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/APIAutomationExercise/**',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: undefined,
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          args: ['--start-maximized']
        }
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    //
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      testIgnore: '**/APIAutomationExercise/**',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        deviceScaleFactor: undefined,
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        launchOptions: {
          args: ['--start-maximized']
        }
      },
    },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
    {
      name: 'api',
      testMatch: '**/APIAutomationExercise/**',
      use: {
        baseURL: process.env.API_BASE_URL || 'https://automationexercise.com',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

