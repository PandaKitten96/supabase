import { resolve } from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['.'] }),
  ],
  resolve: {
    alias: {
      '@ui': resolve(__dirname, './../../packages/ui/src'),
      '@sentry/nextjs': resolve(__dirname, './tests/setup/__mocks__/sentry.ts'),
      'common': resolve(__dirname, './tests/setup/__mocks__/common.ts'),
      '@/data/ai/sql-policy-mutation': resolve(__dirname, './tests/setup/__mocks__/sql-policy-mutation.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
