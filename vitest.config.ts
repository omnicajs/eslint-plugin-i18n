import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/lib/**/*.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: [
        'dist/index.js',
        'dist/lib/**/*.js',
        'dist/rules/valid-message-text.js',
        'dist/rules/visitors/index.js',
      ],
      reporter: ['text', 'html', 'json', 'lcovonly'],
      thresholds: {
        statements: 99,
        branches: 89,
        functions: 100,
        lines: 99,
      },
    },
  },
})
