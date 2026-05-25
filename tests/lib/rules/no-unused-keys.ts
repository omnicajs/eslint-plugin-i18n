import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import * as jsoncParser from 'jsonc-eslint-parser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ruleModule = await import('../../../dist/rules/no-unused-keys.js')
const rule = ruleModule.default
const fixturesRoot = join(__dirname, '../../fixtures/no-unused-keys')

const tester = new RuleTester({
  languageOptions: {
    parser: jsoncParser,
    ecmaVersion: 2022,
  },
})

const jsTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
  },
})

describe('no-unused-keys rule', () => {
  it('passes RuleTester scenarios', () => {
    tester.run('no-unused-keys', rule as never, {
      valid: [
        {
          code: `{
            "docs": {
              "url": "https://docs.example.test"
            },
            "action": {
              "apply": "Apply",
              "close": "Close"
            }
          }`,
          filename: join(fixturesRoot, 'valid/src/messages/en-GB.json'),
          options: [{
            src: join(fixturesRoot, 'valid/src'),
            extensions: ['.js'],
          }],
          settings: {
            'vue-i18n': {
              localeDir: {
                pattern: `${fixturesRoot}/valid/src/messages/*.json`,
                localeKey: 'file',
              },
            },
          },
        },
        {
          code: `{
            "docs": {
              "url": "https://docs.example.test"
            },
            "action": {
              "apply": "Apply",
              "close": "Close"
            }
          }`,
          filename: join(fixturesRoot, 'valid/src/messages/en-GB.json'),
          settings: {
            'vue-i18n': {
              cwd: join(fixturesRoot, 'valid/src'),
              localeDir: {
                pattern: 'messages/*.json',
                localeKey: 'file',
              },
            },
          },
        },
        {
          code: `{
            "action": {
              "close": "Close"
            }
          }`,
          filename: join(fixturesRoot, 'valid/src/messages/missing.json'),
          options: [{
            src: join(fixturesRoot, 'valid/src'),
            extensions: ['.js'],
          }],
          settings: {
            'vue-i18n': {
              localeDir: {
                pattern: `${fixturesRoot}/valid/src/messages/en-GB.json`,
                localeKey: 'file',
              },
            },
          },
        },
        {
          code: `{
            "en-GB": {
              "action": {
                "close": "Close"
              }
            }
          }`,
          filename: join(fixturesRoot, 'key/src/messages/messages.json'),
          options: [{
            src: join(fixturesRoot, 'key/src'),
            extensions: ['.js'],
          }],
          settings: {
            'vue-i18n': {
              localeDir: {
                pattern: `${fixturesRoot}/key/src/messages/*.json`,
                localeKey: 'key',
              },
            },
          },
        },
        {
          code: `{
            "action": {
              "close": "Close",
              "ignored": "Ignored"
            }
          }`,
          filename: join(fixturesRoot, 'invalid/src/messages/en-GB.json'),
          options: [{
            src: join(fixturesRoot, 'invalid/src'),
            extensions: ['.js'],
            ignores: ['/^action\\.ignored$/'],
          }],
          settings: {
            'vue-i18n': {
              localeDir: {
                pattern: `${fixturesRoot}/invalid/src/messages/*.json`,
                localeKey: 'file',
              },
            },
          },
        },
      ],
      invalid: [
        {
          code: `{
            "action": {
              "close": "Close",
              "unused": "Unused"
            }
          }`,
          filename: join(fixturesRoot, 'invalid/src/messages/en-GB.json'),
          options: [{
            src: join(fixturesRoot, 'invalid/src'),
            extensions: ['.js'],
          }],
          settings: {
            'vue-i18n': {
              localeDir: {
                pattern: `${fixturesRoot}/invalid/src/messages/*.json`,
                localeKey: 'file',
              },
            },
          },
          errors: [
            {
              message: 'unused \'action.unused\' key',
              line: 4,
              column: 15,
            },
          ],
        },
      ],
    })

    jsTester.run('no-unused-keys', rule as never, {
      valid: [
        {
          code: 'const value = 1',
          filename: join(fixturesRoot, 'plain.js'),
          settings: {
            'vue-i18n': {
              localeDir: {
                pattern: `${fixturesRoot}/valid/src/messages/*.json`,
                localeKey: 'file',
              },
            },
          },
        },
      ],
      invalid: [],
    })
  })
})
