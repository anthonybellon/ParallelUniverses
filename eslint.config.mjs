import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

// eslint-config-next still ships the old config format.
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
  },
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    ...jestDom.configs['flat/recommended'],
  },
  {
    files: ['__tests__/**/*.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: { globals: globals.jest },
  },
  prettier,
);
