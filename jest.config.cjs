module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
      },
      diagnostics: {
        ignoreDiagnostics: [1343, 2339],
      },
    }]
  },
};
