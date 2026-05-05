module.exports = {
  projects: [
    // Unit tests
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            esModuleInterop: true,
            jsx: 'react-jsx',
            verbatimModuleSyntax: false,
          }
        }]
      },
      moduleNameMapper: {
        '\\.(css|less|scss)$': 'identity-obj-proxy',
        '\\.svg$': '<rootDir>/tests/__mocks__/fileMock.js',
      },
      setupFiles: ['<rootDir>/tests/setup.ts'],
    },
    // E2E tests (existing)
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/**/*.test.ts'],
      testTimeout: 30000,
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            esModuleInterop: true,
          }
        }]
      },
    },
  ],
};
