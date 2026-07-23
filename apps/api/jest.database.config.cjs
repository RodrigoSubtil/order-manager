const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  setupFiles: ['<rootDir>/test/setup-database-environment.ts'],
  testRegex: '.*(database-integration|rls-integration|database-performance)\\.test\\.ts$',
};
