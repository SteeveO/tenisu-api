import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    // Integration tests arrive with the DynamoDB adapter (TEN-8).
    passWithNoTests: true,
  },
});
