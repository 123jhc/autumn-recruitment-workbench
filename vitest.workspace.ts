import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'server',
      globals: true,
      include: ['server/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'client',
      globals: true,
      environment: 'jsdom',
      include: ['client/**/*.test.{ts,tsx}'],
      setupFiles: ['./client/src/test-setup.ts'],
    },
  },
])
