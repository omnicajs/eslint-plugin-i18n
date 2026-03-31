import { join } from 'node:path'
import { RuleTester } from 'eslint'
import * as vueParser from 'vue-eslint-parser'
import rule = require('../../../rules/valid-message-text')

const fixturesRoot = join(__dirname, '../../fixtures/valid-message-text')

const tester = new RuleTester({
  languageOptions: { parser: vueParser, ecmaVersion: 2015 }
})

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
          messageSyntaxVersion: '^9.0.0'
        }
      },
      options: [
        {
          validators: {
            foo: [join(fixturesRoot, 'not-allowed.js')]
          }
        }
      ]
    }
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
          messageSyntaxVersion: '^9.0.0'
        }
      },
      options: [
        {
          validators: {
            foo: [join(fixturesRoot, 'not-allowed.js')]
          }
        }
      ],
      errors: [
        {
          message: '\'a\' contains following errors: Contains "not-allowed"',
          line: 3,
          column: 7
        }
      ]
    }
  ]
})
