import globals from 'globals'
import upstream = require('@intlify/eslint-plugin-vue-i18n')
import validMessageText = require('./rules/valid-message-text')

const UPSTREAM_NAMESPACE = '@intlify/vue-i18n'
const NAMESPACE = '@omnicajs/i18n'

function mapRuleIds(
  rules: Record<string, unknown>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [ruleId, value] of Object.entries(rules || {})) {
    mapped[ruleId.replace(UPSTREAM_NAMESPACE, NAMESPACE)] = value
  }
  return mapped
}

const baseLegacy = {
  parser: require.resolve('vue-eslint-parser'),
  plugins: [NAMESPACE],
  overrides: [
    {
      files: ['*.json', '*.json5'],
      parser: require.resolve('vue-eslint-parser'),
      parserOptions: {
        parser: require.resolve('jsonc-eslint-parser')
      }
    },
    {
      files: ['*.yaml', '*.yml'],
      parser: require.resolve('vue-eslint-parser'),
      parserOptions: {
        parser: require.resolve('yaml-eslint-parser')
      },
      rules: {
        'no-irregular-whitespace': 'off',
        'spaced-comment': 'off'
      }
    }
  ]
}

const recommendedLegacy = {
  extends: [`plugin:${NAMESPACE}/base-legacy`],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    es6: true
  },
  rules: mapRuleIds(
    upstream.configs['recommended-legacy'].rules as Record<string, unknown>
  )
}

let plugin: {
  configs: Record<string, unknown>
  rules: Record<string, unknown>
}

const flatBase = [
  {
    name: `${NAMESPACE}:base:setup`,
    plugins: {
      get [NAMESPACE]() {
        return plugin
      }
    }
  },
  {
    name: `${NAMESPACE}:base:setup:json`,
    files: ['*.json', '**/*.json', '*.json5', '**/*.json5'],
    languageOptions: {
      parser: require('vue-eslint-parser'),
      parserOptions: {
        parser: require('jsonc-eslint-parser')
      }
    }
  },
  {
    name: `${NAMESPACE}:base:setup:yaml`,
    files: ['*.yaml', '**/*.yaml', '*.yml', '**/*.yml'],
    languageOptions: {
      parser: require('vue-eslint-parser'),
      parserOptions: {
        parser: require('yaml-eslint-parser')
      }
    },
    rules: {
      'no-irregular-whitespace': 'off',
      'spaced-comment': 'off'
    }
  }
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
          jsx: true
        }
      }
    }
  },
  {
    name: `${NAMESPACE}:recommended:rules`,
    rules: mapRuleIds(
      upstream.configs['recommended-legacy'].rules as Record<string, unknown>
    )
  }
]

plugin = {
  configs: {
    'base-legacy': baseLegacy,
    'recommended-legacy': recommendedLegacy,
    base: flatBase,
    recommended: flatRecommended,
    'flat/base': flatBase,
    'flat/recommended': flatRecommended
  },
  rules: {
    ...upstream.rules,
    'valid-message-text': validMessageText
  }
}

export = plugin
