import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/vite-env.d.ts'],
      thresholds: {
        'src/shared/lib/**/*.ts': {
          statements: 85,
          branches: 55,
          functions: 90,
          lines: 85,
        },
        'src/features/**/schemas/**/*.ts': {
          statements: 85,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/shared/components/ui/**/*.tsx': {
          statements: 75,
          branches: 60,
          functions: 80,
          lines: 75,
        },
      },
    },
  },
});
