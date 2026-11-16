import { defineConfig } from 'vitest/config';

// Firestore security rules tests. Run with the emulator: npm run test:rules
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
