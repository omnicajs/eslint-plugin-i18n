import globals from 'globals'

import pluginJs from '@eslint/js'
import pluginImport from 'eslint-plugin-import'
import pluginUnused from 'eslint-plugin-unused-imports'
import pluginTs from 'typescript-eslint'

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...pluginTs.configs.recommended,
  pluginImport.flatConfigs.recommended,
  pluginImport.flatConfigs.typescript,
  {
    plugins: {
      'unused-imports': pluginUnused,
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'brace-style': ['error', '1tbs', {
        allowSingleLine: true,
      }],
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
        imports: 'always-multiline',
        objects: 'always-multiline',
      }],
      'indent': ['error', 2, {
        'ignoreComments': true,
        'SwitchCase': 1,
      }],
      'eqeqeq': ['error', 'smart'],
      'keyword-spacing': ['error', {
        before: true,
        after: true,
        overrides: {
          catch: { before: true, after: true },
        },
      }],
      'linebreak-style': [2, 'unix'],
      'max-depth': ['error', 4],
      'no-debugger': 'error',
      'no-empty': 'off',
      'no-multiple-empty-lines': ['error', {
        max: 1,
        maxBOF: 0,
        maxEOF: 0,
      }],
      'no-new-wrappers': 'error',
      'no-prototype-builtins': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message: 'Only type imports are allowed.',
              name: '@typescript-eslint/types',
              allowTypeImports: true,
            },
          ],
        },
      ],
      'no-shadow-restricted-names': 'error',
      'no-throw-literal': 'error',
      'no-trailing-spaces': ['error'],
      'no-unsafe-optional-chaining': 'off',
      'no-useless-escape': 'off',
      'object-curly-spacing': ['error', 'always'],
      'padded-blocks': ['error', 'never'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'never'],
      'space-infix-ops': ['error', { 'int32Hint': false }],
      'import/export': 'error',
      'import/newline-after-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-cycle': 'error',
      'import/no-duplicates': 'off',
      'import/no-empty-named-blocks': 'error',
      'import/no-extraneous-dependencies': ['error', {
        packageDir: ['./'],
      }],
      'import/no-named-as-default': 'off',
      'import/no-self-import': 'error',
      'import/no-unresolved': 'off',
      'import/no-useless-path-segments': 'error',
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/tests/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },
  { ignores: ['dist/*'] },
  { ignores: ['**/dist/*'] },
  { ignores: ['coverage/*'] },
  { ignores: ['**/coverage/*'] },
  { ignores: ['node_modules/*'] },
  { ignores: ['**/node_modules/*'] },
]
