import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const awsAndFrameworks = ['@aws-sdk/*', 'hono', 'hono/*', '@hono/*', 'zod'];

export default tseslint.config(
  { ignores: ['node_modules', 'coverage', 'dist', 'infra', 'eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      // CLAUDE.md: no `as` unless justified. Each exception needs an
      // eslint-disable comment explaining why. `as const` stays allowed.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
  // Hexagonal boundaries: dependencies point inwards only.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**', '**/ports/**', '**/adapters/**', '**/http/**'],
              message: 'The domain must not depend on outer layers.',
            },
            { group: awsAndFrameworks, message: 'The domain must stay framework-free.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts', 'src/ports/**/*.ts'],
    // Tests may use the in-memory adapter instead of hand-written stubs.
    ignores: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/adapters/**', '**/http/**'],
              message: 'Use cases and ports must not depend on adapters or HTTP.',
            },
            { group: awsAndFrameworks, message: 'Use cases and ports must stay framework-free.' },
          ],
        },
      ],
    },
  },
  prettier,
);
