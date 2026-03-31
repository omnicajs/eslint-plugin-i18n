# @omnicajs/eslint-plugin-i18n

Wrapper over `@intlify/eslint-plugin-vue-i18n` 

## Install

```bash
npm i -D @omnicajs/eslint-plugin-i18n eslint
```

## Flat config

```js
import i18n from '@omnicajs/eslint-plugin-i18n'

export default [
  ...i18n.configs.recommended,
  {
    rules: {
      '@omnicajs/i18n/valid-message-text': ['error', {
        validators: {
          ru: ['/absolute/path/to/validator.js']
        }
      }]
    }
  }
]
```

## Legacy config

```js
module.exports = {
  extends: ['plugin:@omnicajs/i18n/recommended-legacy']
}
```
