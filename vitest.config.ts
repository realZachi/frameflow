import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/ai/provider-config.ts',
        'src/ai/provider-catalog.ts',
        'src/ai/richtext.ts',
        'src/ai/run-log.ts',
        'src/app/project-utils.ts',
        'src/editor/element-utils.ts',
        'src/editor/nudge.ts',
        'src/editor/slide-operations.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
