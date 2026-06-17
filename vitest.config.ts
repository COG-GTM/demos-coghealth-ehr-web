/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/services/auditService.ts', 'src/services/auditQueue.ts', 'src/services/authContext.ts', 'src/components/PHIAccessJustificationModal.tsx'],
    },
  },
});
