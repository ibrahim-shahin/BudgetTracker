// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*'],
  },
  {
    // jest.mock factories can't use import statements.
    files: ['**/__tests__/**', 'test-utils/**', 'jest.setup.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
