import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import * as vueParser from 'vue-eslint-parser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ruleModule = await import('../../../dist/rules/valid-message-text.js')
const rule = ruleModule.default
const notAllowedValidator = await import('../../fixtures/valid-message-text/not-allowed.js')
const notAllowedValidatorName = ruleModule.defineValidator(
  'tests/not-allowed',
  notAllowedValidator
)

const fixturesRoot = join(__dirname, '../../fixtures/valid-message-text')

const tester = new RuleTester({
  languageOptions: { parser: vueParser, ecmaVersion: 2015 },
})

describe('valid-message-text rule', () => {
  it('passes RuleTester scenarios', () => {
    tester.run('valid-message-text', rule as never, {
      valid: [
        {
          code: `
          <i18n lang="yaml" locale="foo">
          a: "allowed"
          </i18n>
          `,
          languageOptions: { parser: vueParser, ecmaVersion: 2015 },
          filename: join(fixturesRoot, 'test.vue'),
          settings: {
            'vue-i18n': {
              localeDir: `${fixturesRoot}/*.{json,yaml,yml}`,
              messageSyntaxVersion: '^9.0.0',
            },
          },
          options: [
            {
              validators: {
                foo: [notAllowedValidatorName],
              },
            },
          ],
        },
      ],
      invalid: [
        {
          code: `
          <i18n lang="yaml" locale="foo">
          a: "not-allowed"
          b: "valid"
          </i18n>
          <i18n lang="yaml" locale="bar">
          a: "not-allowed"
          b: "valid"
          </i18n>
          `,
          languageOptions: { parser: vueParser, ecmaVersion: 2015 },
          filename: join(fixturesRoot, 'test.vue'),
          settings: {
            'vue-i18n': {
              localeDir: `${fixturesRoot}/*.{json,yaml,yml}`,
              messageSyntaxVersion: '^9.0.0',
            },
          },
          options: [
            {
              validators: {
                foo: [notAllowedValidatorName],
              },
            },
          ],
          errors: [
            {
              message: '\'a\' contains following errors: Contains "not-allowed"',
              line: 3,
              column: 11,
            },
          ],
        },
        {
          code: `
          <i18n lang="yaml" locale="foo">
          a: "global-word"
          b: "local-42"
          </i18n>
          <i18n lang="yaml" locale="bar">
          a: "local-42"
          </i18n>
          `,
          languageOptions: { parser: vueParser, ecmaVersion: 2015 },
          filename: join(fixturesRoot, 'test.vue'),
          settings: {
            'vue-i18n': {
              localeDir: `${fixturesRoot}/*.{json,yaml,yml}`,
              messageSyntaxVersion: '^9.0.0',
            },
          },
          options: [
            {
              forbid: {
                words: ['global-word'],
                locales: {
                  foo: {
                    patterns: ['local-[0-9]+'],
                  },
                },
              },
            },
          ],
          errors: [
            {
              message: '\'a\' contains following errors: Contains forbidden word "global-word"',
              line: 3,
              column: 11,
            },
            {
              message: '\'b\' contains following errors: Matches forbidden pattern "/local-[0-9]+/u"',
              line: 4,
              column: 11,
            },
          ],
        },
      ],
    })
  })
})
