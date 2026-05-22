module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['<rootDir>/src/test/importMetaTransform.cjs', {
          diagnostics: false,
          tsconfig: {
            jsx: 'react-jsx',
            module: 'commonjs',
            moduleResolution: 'node',
            target: 'ES2022',
            esModuleInterop: true,
            strict: true,
            verbatimModuleSyntax: false,
            erasableSyntaxOnly: false,
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
        }],
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/src/test/styleMock.ts',
        '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/src/test/fileMock.ts',
      },
    },
    {
      displayName: 'e2e',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/tests/**/*.test.ts'],
      testTimeout: 30000,
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            esModuleInterop: true,
          },
        }],
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
};
