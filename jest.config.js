// Tests run through the same Babel setup as the app, including the
// React Compiler that app.json turns on (experiments.reactCompiler).
const preset = require('jest-expo/jest-preset');

// Dates depend on the time zone. Tests run in Amman (UTC+3) unless TZ is
// set; CI also runs them in New York (UTC-5) so both directions are covered.
process.env.TZ = process.env.TZ || 'Asia/Amman';

const sourceFiles = '\\.[jt]sx?$';
const [babelJest, babelOptions] = preset.transform[sourceFiles];

module.exports = {
  ...preset,
  transform: {
    ...preset.transform,
    [sourceFiles]: [
      babelJest,
      { ...babelOptions, caller: { ...babelOptions.caller, supportsReactCompiler: true } },
    ],
  },
  moduleNameMapper: { ...preset.moduleNameMapper, '^@/(.*)$': '<rootDir>/$1' },
  setupFiles: [...(preset.setupFiles ?? []), '<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
