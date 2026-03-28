module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        jsx: 'react-jsx',
      },
      diagnostics: false,
      astTransformers: {
        before: ['./src/__tests__/import-meta-transform.cjs'],
      },
    }]
  },
};
