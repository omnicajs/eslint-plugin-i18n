import globals from 'globals'
import * as jsoncParser from 'jsonc-eslint-parser'
import upstream from '@intlify/eslint-plugin-vue-i18n'
import vueParser from 'vue-eslint-parser'
import yamlParser from 'yaml-eslint-parser'
import { defineValidator } from './lib/validators.js'
import validMessageText from './rules/valid-message-text.js'

const UPSTREAM_NAMESPACE = '@intlify/vue-i18n'
const NAMESPACE = '@omnicajs/i18n'

function mapRuleIds(
  rules?: Record<string, unknown>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [ruleId, value] of Object.entries(rules || {})) {
    mapped[ruleId.replace(UPSTREAM_NAMESPACE, NAMESPACE)] = value
  }
  return mapped
}

const plugin: {
  configs: Record<string, unknown>
  rules: Record<string, unknown>
} = {} as {
  configs: Record<string, unknown>
  rules: Record<string, unknown>
}

const flatBase = [
  {
    name: `${NAMESPACE}:base:setup`,
    plugins: {
      get [NAMESPACE]() {
        return plugin
      },
    },
  },
  {
    name: `${NAMESPACE}:base:setup:json`,
    files: ['*.json', '**/*.json', '*.json5', '**/*.json5'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: jsoncParser,
      },
    },
  },
  {
    name: `${NAMESPACE}:base:setup:yaml`,
    files: ['*.yaml', '**/*.yaml', '*.yml', '**/*.yml'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: yamlParser,
      },
    },
    rules: {
      'no-irregular-whitespace': 'off',
      'spaced-comment': 'off',
    },
  },
]

const flatRecommended = [
  ...flatBase,
  {
    name: `${NAMESPACE}:recommended:setup`,
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    name: `${NAMESPACE}:recommended:rules`,
    rules: mapRuleIds(
      (upstream.configs.recommended as Array<{
        name?: string
        rules?: Record<string, unknown>
      }>)
        .find(config => config.name === `${UPSTREAM_NAMESPACE}:recommended:rules`)
        ?.rules
    ),
  },
]

Object.assign(plugin, {
  configs: {
    base: flatBase,
    recommended: flatRecommended,
    'flat/base': flatBase,
    'flat/recommended': flatRecommended,
  },
  rules: {
    ...upstream.rules,
    'valid-message-text': validMessageText,
  },
})

export default plugin
export { defineValidator }
