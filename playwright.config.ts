import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real production build (node build/server.mjs) and the
 * Firestore emulator. Run with: npm run test:e2e (starts the emulator, builds, serves).
 *
 * No real services are touched: Firestore is the emulator (demo project), Smartsheet,
 * SMS and Gemini have no credentials, so the server skips them.
 */
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && node build/server.mjs',
    url: `http://localhost:${PORT}/health`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      PORT: String(PORT),
      FIREBASE_PROJECT_ID: 'demo-portabox',
      FIRESTORE_DATABASE_ID: '(default)',
      QUOTE_NUMBER_START: '900001',
      // FIRESTORE_EMULATOR_HOST comes from `firebase emulators:exec`.
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181',
    },
  },
});
