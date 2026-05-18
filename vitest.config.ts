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
        'dist/rules/visitors/**/*.js',
      ],
      reporter: ['text', 'html', 'json', 'json-summary', 'lcovonly'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
