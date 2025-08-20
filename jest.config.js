module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/?(*.)+(spec|test).(ts|js)'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts',
    '^audiomotion-analyzer$': '<rootDir>/tests/__mocks__/audiomotion-analyzer.ts',
  },
  testEnvironmentOptions: {
    resources: 'usable',
    runScripts: 'dangerously',
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // Ignore patterns for performance
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.obsidian/',
  ],
  // Performance settings
  maxWorkers: '50%',
  testTimeout: 10000,
};