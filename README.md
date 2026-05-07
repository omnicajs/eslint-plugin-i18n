# @omnicajs/eslint-plugin-i18n

ESLint plugin that wraps `@intlify/eslint-plugin-vue-i18n` and adds custom rules.

## Description

This package provides:

- pass-through access to upstream Vue i18n rules;
- namespace remapping from `@intlify/vue-i18n/*` to `@omnicajs/i18n/*`;
- flat shared configs;
- custom rule `valid-message-text` with external validator functions.

## Installation

Install ESLint and the plugin:

```bash
npm install --save-dev eslint @omnicajs/eslint-plugin-i18n
```

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

## Development

Node version: `>=20.19.0`

Main commands:

```bash
npm run build
npm run lint
npm test
npm run test:coverage
```

Coverage thresholds (minimum enforced values) in this repository:

- `statements`: 99
- `lines`: 99
- `functions`: 100
- `branches`: 89
