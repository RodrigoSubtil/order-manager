module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-environment.ts'],
  testRegex: '.*\\.(e2e-)?spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/generated/**',
    '!<rootDir>/src/**/dto/**',
    '!<rootDir>/src/**/*.module.ts',
  ],
  coverageThreshold: {
    'src/auth/auth.controller.ts': {
      statements: 90,
      branches: 55,
      functions: 65,
      lines: 90,
    },
    'src/common/guards/**/*.ts': {
      statements: 90,
      branches: 70,
      functions: 90,
      lines: 90,
    },
    'src/orders/orders.service.ts': {
      statements: 40,
      branches: 35,
      functions: 45,
      lines: 40,
    },
    'src/reports/reports.utils.ts': {
      statements: 95,
      branches: 70,
      functions: 95,
      lines: 95,
    },
  },
};
