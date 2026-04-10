# @omnicajs/eslint-plugin-i18n

ESLint plugin that wraps `@intlify/eslint-plugin-vue-i18n` and adds custom rules.

## Description

This package provides:

- pass-through access to upstream Vue i18n rules;
- namespace remapping from `@intlify/vue-i18n/*` to `@omnicajs/i18n/*`;
- flat and legacy shared configs;
- custom rule `valid-message-text` with external validator functions.

## Installation

Install ESLint and the plugin:

```bash
npm install --save-dev eslint @omnicajs/eslint-plugin-i18n
```

## Usage

### Flat Config (`eslint.config.js`)

```js
import i18n from '@omnicajs/eslint-plugin-i18n'

export default [
  ...i18n.configs.recommended,
  {
    rules: {
      '@omnicajs/i18n/valid-message-text': ['error', {
        validators: {
          ru: ['/absolute/path/to/validator.js'],
        },
      }],
    },
  },
]
```

### Legacy Config (`.eslintrc.js`)

```js
module.exports = {
  extends: ['plugin:@omnicajs/i18n/recommended-legacy'],
}
```

## Configs

Available exported configs:

- `configs.base`
- `configs.recommended`
- `configs['flat/base']`
- `configs['flat/recommended']`
- `configs['base-legacy']`
- `configs['recommended-legacy']`

## Rule: `valid-message-text`

`@omnicajs/i18n/valid-message-text` validates leaf translation messages using
custom validator modules.

Rule option shape:

```ts
type RuleOptions = [{
  validators?: Record<string, string[]>
}]
```

Each validator module path must resolve to a function:

```js
// validator.js
module.exports = (text) => [
  text.length > 0,
  'Message must not be empty',
]
```

### Built-in validators

This repository also ships reusable validators under `validators/`:

- `validators/no-crm-word.js`
- `validators/no-cyrillic.js`
- `validators/no-mixed-characters.js`
- `validators/no-mixed-characters.en_GB.js`
- `validators/no-mixed-characters.es_ES.js`
- `validators/no-mixed-characters.ru_RU.js`
- `validators/no-spanish.js`
- `validators/only-asesor.js`
- `validators/quotation.js`

They can be imported through package subpaths, for example:

```js
const validatorPath = require.resolve('@omnicajs/eslint-plugin-i18n/validators/no-cyrillic.js')
```

You can connect built-in validators explicitly in rule options:

```js
'@omnicajs/i18n/valid-message-text': ['error', {
  validators: {
    ru_RU: [
      require.resolve('@omnicajs/eslint-plugin-i18n/validators/no-crm-word.js'),
    ],
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
