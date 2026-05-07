import type { RuleContext, RuleListener } from '@intlify/eslint-plugin-vue-i18n/dist/types/index.js'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages.js'
import type {
  KeyPath,
  MessageNode,
} from './visitors/index.js'
import type {
  Locale,
  ValidatorSource,
} from '../lib/validators.js'
import type { ForbidSettings } from '../lib/forbid.js'
import { extname } from 'node:path'
import debugBuilder from 'debug'
import {
  defineCustomBlocksVisitor,
  getLocaleMessages,
} from '@intlify/eslint-plugin-vue-i18n/dist/utils/index.js'
import { joinPath } from '@intlify/eslint-plugin-vue-i18n/dist/utils/key-path.js'
import { createRule } from '@intlify/eslint-plugin-vue-i18n/dist/utils/rule.js'
import {
  getFilename,
  getSourceCode,
} from '@intlify/eslint-plugin-vue-i18n/dist/utils/compat.js'
import {
  createForbiddenValidators,
} from '../lib/forbid.js'
import {
  defineValidator,
  getValidators,
} from '../lib/validators.js'
import {
  createVisitorForJson,
  createVisitorForYaml,
  getMessage,
} from './visitors/index.js'

const debug = debugBuilder('eslint-plugin-i18n:valid-message-text')

function create(context: RuleContext): RuleListener {
  const filename = getFilename(context)
  const sourceCode = getSourceCode(context)
  const validators = getValidators(
    context.options[0]?.validators as Record<Locale, ValidatorSource[]> | undefined
  )
  const forbiddenValidators = createForbiddenValidators(
    context.options[0]?.forbid as ForbidSettings | undefined
  )

  function reportErrors(
    keyPath: KeyPath,
    errors: string[],
    reportNode: MessageNode
  ) {
    context.report({
      message: '\'{{path}}\' contains following errors: {{errors}}',
      data: {
        path: joinPath(...keyPath),
        errors: errors.join(', '),
      },
      loc: reportNode.loc,
    })
  }

  function createVerifyContext(targetLocaleMessage: LocaleMessage) {
    type KeyStack =
      | {
          locale: null
          node?: MessageNode
          upper?: KeyStack
        }
      | {
          locale: string
          node?: MessageNode
          upper?: KeyStack
          keyPath: KeyPath
        }

    let keyStack: KeyStack

    if (targetLocaleMessage.isResolvedLocaleByFileName()) {
      const locale = targetLocaleMessage.locales[0]
      keyStack = {
        locale,
        keyPath: [],
      }
    } else {
      keyStack = {
        locale: null,
      }
    }

    return {
      enterKey(
        key: string | number,
        node: MessageNode,
        needsVerify: boolean
      ) {
        if (keyStack.locale == null) {
          keyStack = {
            node,
            locale: key as string,
            keyPath: [],
            upper: keyStack,
          }
        } else {
          const keyPath = [...keyStack.keyPath, key]

          if (needsVerify) {
            const parent = node.parent as
              | { value?: MessageNode }
              | undefined
            const valueNode = parent?.value
            if (valueNode) {
              const text = getMessage(valueNode)
              const activeValidators = [
                ...(forbiddenValidators['*'] || []),
                ...(forbiddenValidators[keyStack.locale] || []),
                ...(validators[keyStack.locale] || []),
              ]
              const errors = activeValidators
                .map(v => v(text))
                .filter(([valid]) => !valid)
                .map(([, error]) => error)

              if (errors.length > 0) {
                reportErrors(keyPath, errors, node)
              }
            }
          }

          keyStack = {
            node,
            locale: keyStack.locale,
            keyPath,
            upper: keyStack,
          }
        }
      },
      leaveKey(node: MessageNode | null) {
        if (keyStack.node === node) {
          keyStack = keyStack.upper as KeyStack
        }
      },
    }
  }

  if (extname(filename) === '.vue') {
    return defineCustomBlocksVisitor(
      context,
      ctx => {
        const localeMessages = getLocaleMessages(context)
        const targetLocaleMessage = localeMessages.findBlockLocaleMessage(
          ctx.parserServices.customBlock
        )
        if (!targetLocaleMessage) {
          return {}
        }
        return createVisitorForJson(targetLocaleMessage, createVerifyContext)
      },
      ctx => {
        const localeMessages = getLocaleMessages(context)
        const targetLocaleMessage = localeMessages.findBlockLocaleMessage(
          ctx.parserServices.customBlock
        )
        if (!targetLocaleMessage) {
          return {}
        }
        return createVisitorForYaml(targetLocaleMessage, createVerifyContext)
      }
    )
  }

  if (sourceCode.parserServices.isJSON || sourceCode.parserServices.isYAML) {
    const localeMessages = getLocaleMessages(context)
    const targetLocaleMessage = localeMessages.findExistLocaleMessage(filename)
    if (!targetLocaleMessage) {
      debug(`ignore ${filename} in valid-message-text`)
      return {}
    }

    if (sourceCode.parserServices.isJSON) {
      return createVisitorForJson(targetLocaleMessage, createVerifyContext)
    }
    if (sourceCode.parserServices.isYAML) {
      return createVisitorForYaml(targetLocaleMessage, createVerifyContext)
    }
  }

  debug(`ignore ${filename} in valid-message-text`)
  return {}
}

const rule = createRule({
  meta: {
    type: 'layout',
    docs: {
      description: 'validate locale message text by custom validators',
      category: 'Best Practices',
      recommended: false,
      url: 'https://eslint-plugin-vue-i18n.intlify.dev/rules/valid-message-text.html',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          validators: {
            type: 'object',
            patternProperties: {
              '^([a-zA-Z]{2,}[_-]{0,1}[a-zA-Z]*)$': {
                type: 'array',
                items: {},
                uniqueItems: true,
              },
            },
            additionalProperties: false,
          },
          forbid: {
            type: 'object',
            properties: {
              words: {
                type: 'array',
                items: { type: 'string' },
                uniqueItems: true,
              },
              patterns: {
                type: 'array',
                items: {},
                uniqueItems: true,
              },
              locales: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    words: {
                      type: 'array',
                      items: { type: 'string' },
                      uniqueItems: true,
                    },
                    patterns: {
                      type: 'array',
                      items: {},
                      uniqueItems: true,
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: {
              type: 'object',
              properties: {
                words: {
                  type: 'array',
                  items: { type: 'string' },
                  uniqueItems: true,
                },
                patterns: {
                  type: 'array',
                  items: {},
                  uniqueItems: true,
                },
              },
              additionalProperties: false,
            },
          },
        },
      },
    ],
  },
  create,
})

export { defineValidator }
export default rule
