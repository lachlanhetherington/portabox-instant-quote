import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // Rules tests need the Firestore emulator (npm run test:rules); e2e runs in Playwright.
    exclude: ['tests/rules/**', 'tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    // Several tests price every scenario (thousands of quotes); CI runners are much slower than a laptop
    testTimeout: 60_000,
  },
});
