# @omnicajs/eslint-plugin-i18n

[![npm version](https://img.shields.io/npm/v/@omnicajs/eslint-plugin-i18n.svg)](https://www.npmjs.com/package/@omnicajs/eslint-plugin-i18n)

ESLint plugin that wraps `@intlify/eslint-plugin-vue-i18n` and adds custom rules.

## Description

This package provides:

- pass-through access to upstream Vue i18n rules;
- exported config rule ids remapped from the upstream
  `@intlify/vue-i18n/*` namespace to `@omnicajs/i18n/*`;
- flat shared configs;
- custom rule `valid-message-text` with external validator functions.

## Installation

Install the plugin and its peer dependencies:

```bash
npm install --save-dev eslint @omnicajs/eslint-plugin-i18n @intlify/eslint-plugin-vue-i18n@^4.3.0 jsonc-eslint-parser vue-eslint-parser yaml-eslint-parser
```

This package is developed against
`@intlify/eslint-plugin-vue-i18n` 4.3.x. See the upstream rule documentation in
the [Intlify Vue i18n ESLint plugin docs](https://eslint-plugin-vue-i18n.intlify.dev/).

## Usage

### Flat Config (`eslint.config.js`)

```js
import i18n, { defineValidator } from '@omnicajs/eslint-plugin-i18n'

const noCrmWord = defineValidator(
  'project/no-crm-word',
  await import('/absolute/path/to/validator.js')
)

export default [
  ...i18n.configs.recommended,
  {
    rules: {
      '@omnicajs/i18n/valid-message-text': ['error', {
        validators: {
          ru: [noCrmWord],
        },
        forbid: {
          words: ['forbidden'],
          locales: {
            ru: {
              patterns: ['/test/i'],
            },
          },
        },
      }],
    },
  },
]
```

## Configs

Available exported configs:

- `configs.base`
- `configs.recommended`
- `configs['flat/base']`
- `configs['flat/recommended']`

Upstream rule ids in exported configs are rewritten to the local namespace. When
using this package, configure upstream Vue i18n rules with `@omnicajs/i18n/*`
rule ids:

```js
export default [
  ...i18n.configs.recommended,
  {
    rules: {
      // Upstream: '@intlify/vue-i18n/no-missing-keys'
      '@omnicajs/i18n/no-missing-keys': 'error',
    },
  },
]
```

## Rule: `valid-message-text`

`@omnicajs/i18n/valid-message-text` validates leaf translation messages using
custom validator modules.

Rule option shape:

```ts
type RuleOptions = [{
  validators?: Record<string, string[]>
  forbid?: {
    words?: string[]
    patterns?: Array<string | RegExp>
    locales?: Record<string, {
      words?: string[]
      patterns?: Array<string | RegExp>
    }>
  }
}]
```

Load validators with dynamic import in flat config, register them with
`defineValidator()`, and pass the returned string names to rule options:

```js
import i18n, { defineValidator } from '@omnicajs/eslint-plugin-i18n'

const noEmpty = (text) => [
  text.length > 0,
  'Message must not be empty',
]

const noEmptyName = defineValidator('no-empty', noEmpty)
const noCrmName = defineValidator(
  'project/no-crm-word',
  await import('./eslint/validators/no-crm-word.js')
)

export default [
  ...i18n.configs.recommended,
  {
    rules: {
      '@omnicajs/i18n/valid-message-text': ['error', {
        validators: {
          ru_RU: [noEmptyName, noCrmName],
        },
      }],
    },
  },
]
```

Validator files are not published with this package; pass project-local or
package-external validators from your ESLint config.

`forbid` checks are applied before custom validators. Top-level `words` and
`patterns` are global; locale-specific checks can be placed under `locales`:

```js
'@omnicajs/i18n/valid-message-text': ['error', {
  forbid: {
    words: ['CRM'],
    patterns: [/old-term/i],
    locales: {
      es_ES: {
        words: ['asesor'],
      },
    },
  },
}]
```
