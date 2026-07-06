const tsJestTransform = {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: {
      module: 'commonjs',
      esModuleInterop: true,
      jsx: 'react-jsx',
    }
  }]
};

module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/tests/unit/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
      transform: tsJestTransform,
    },
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/tests/e2e.test.ts'],
      testTimeout: 30000,
      transform: tsJestTransform,
    },
  ],
};
