import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'build/**/*.spec.ts',
    ],
  },
  resolve: {
    alias: {
      '@aitu/utils': path.resolve(
        __dirname,
        '../../packages/utils/src/index.ts'
      ),
    },
  },
});
