module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Simple test patterns
  testMatch: ['**/tests/**/*.test.ts'],
  
  // TypeScript handling
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  
  // Timeouts
  testTimeout: 10000,
  
  // Mocks
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts',
    '^audiomotion-analyzer$': '<rootDir>/tests/__mocks__/audiomotion-analyzer.ts',
  },
};