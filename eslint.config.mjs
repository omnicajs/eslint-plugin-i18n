import globals from 'globals'

import pluginJs from '@eslint/js'
import pluginTs from 'typescript-eslint'

export default [
  { files: ['**/*.{js,mjs,cjs,ts,mts,cts}'] },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...pluginTs.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-trailing-spaces': ['error'],
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
]
