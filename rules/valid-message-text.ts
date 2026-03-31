import type { AST as JSONAST } from 'jsonc-eslint-parser'
import type { AST as YAMLAST } from 'yaml-eslint-parser'
import { extname } from 'node:path'
import debugBuilder from 'debug'
import {
  defineCustomBlocksVisitor,
  getLocaleMessages
} from '@intlify/eslint-plugin-vue-i18n/dist/utils/index'
import type { RuleContext, RuleListener } from '@intlify/eslint-plugin-vue-i18n/dist/types'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages'
import { joinPath } from '@intlify/eslint-plugin-vue-i18n/dist/utils/key-path'
import { createRule } from '@intlify/eslint-plugin-vue-i18n/dist/utils/rule'
import {
  getFilename,
  getSourceCode
} from '@intlify/eslint-plugin-vue-i18n/dist/utils/compat'

const debug = debugBuilder('eslint-plugin-i18n:valid-message-text')

type Locale = string
type ValidatorPath = string
type ValidatorResult = [boolean, string]
type Validator = (text: string) => ValidatorResult

const getValidators = (
  settings: Record<Locale, ValidatorPath[]> = {}
): Record<Locale, Validator[]> => {
  const validators: Record<Locale, Validator[]> = {}

  for (const locale in settings) {
    validators[locale] = settings[locale].map(modulePath => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fn = require(modulePath) as unknown

      if (typeof fn === 'function') {
        return fn as Validator
      }

      throw new Error(
        `Module in path "${modulePath}" does not contain validation function`
      )
    })
  }

  return validators
}

function isLeafMessageNode(
  node:
    | JSONAST.JSONExpression
    | YAMLAST.YAMLContent
    | YAMLAST.YAMLWithMeta
    | null
): boolean {
  if (node == null) {
    return false
  }
  if (node.type === 'JSONLiteral') {
    return !(node.value == null && node.regex == null && node.bigint == null)
  }
  if (node.type === 'JSONIdentifier' || node.type === 'JSONTemplateLiteral') {
    return true
  }
  if (node.type === 'JSONUnaryExpression') {
    return isLeafMessageNode(node.argument)
  }
  if (node.type === 'YAMLScalar') {
    return node.value != null
  }
  if (node.type === 'YAMLWithMeta') {
    return isLeafMessageNode(node.value)
  }
  return node.type === 'YAMLAlias'
}

function getMessage(node: JSONAST.JSONNode | YAMLAST.YAMLNode): string {
  if (node.type === 'JSONLiteral' && typeof node.value === 'string') {
    return node.value
  }

  if (node.type === 'YAMLScalar' && typeof node.value === 'string') {
    return node.value
  }

  throw new Error('Incorrect node')
}

function create(context: RuleContext): RuleListener {
  const filename = getFilename(context)
  const sourceCode = getSourceCode(context)
  const validators = getValidators(
    context.options[0]?.validators as Record<Locale, ValidatorPath[]> | undefined
  )

  function reportErrors(
    keyPath: (string | number)[],
    errors: string[],
    reportNode: JSONAST.JSONNode | YAMLAST.YAMLNode
  ) {
    context.report({
      message: "'{{path}}' contains following errors: {{errors}}",
      data: {
        path: joinPath(...keyPath),
        errors: errors.join(', ')
      },
      loc: reportNode.loc
    })
  }

  function createVerifyContext(targetLocaleMessage: LocaleMessage) {
    type KeyStack =
      | {
          locale: null
          node?: JSONAST.JSONNode | YAMLAST.YAMLNode
          upper?: KeyStack
        }
      | {
          locale: string
          node?: JSONAST.JSONNode | YAMLAST.YAMLNode
          upper?: KeyStack
          keyPath: (string | number)[]
        }

    let keyStack: KeyStack

    if (targetLocaleMessage.isResolvedLocaleByFileName()) {
      const locale = targetLocaleMessage.locales[0]
      keyStack = {
        locale,
        keyPath: []
      }
    } else {
      keyStack = {
        locale: null
      }
    }

    return {
      enterKey(
        key: string | number,
        node: JSONAST.JSONNode | YAMLAST.YAMLNode,
        needsVerify: boolean
      ) {
        if (keyStack.locale == null) {
          keyStack = {
            node,
            locale: key as string,
            keyPath: [],
            upper: keyStack
          }
        } else {
          const keyPath = [...keyStack.keyPath, key]

          if (needsVerify) {
            const parent = node.parent as
              | { value?: JSONAST.JSONNode | YAMLAST.YAMLNode }
              | undefined
            const valueNode = parent?.value
            if (valueNode) {
              const text = getMessage(valueNode)
              const errors = (validators[keyStack.locale] || [])
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
            upper: keyStack
          }
        }
      },
      leaveKey(node: JSONAST.JSONNode | YAMLAST.YAMLNode | null) {
        if (keyStack.node === node) {
          keyStack = keyStack.upper as KeyStack
        }
      }
    }
  }

  function createVisitorForJson(targetLocaleMessage: LocaleMessage): RuleListener {
    const ctx = createVerifyContext(targetLocaleMessage)
    return {
      JSONProperty(node: JSONAST.JSONProperty) {
        const key =
          node.key.type === 'JSONLiteral' ? `${node.key.value}` : node.key.name

        ctx.enterKey(key, node.key, isLeafMessageNode(node.value))
      },
      'JSONProperty:exit'(node: JSONAST.JSONProperty) {
        ctx.leaveKey(node.key)
      },
      'JSONArrayExpression > *'(
        node: JSONAST.JSONArrayExpression['elements'][number] & {
          parent: JSONAST.JSONArrayExpression
        }
      ) {
        const key = node.parent.elements.indexOf(node)
        ctx.enterKey(key, node, isLeafMessageNode(node))
      },
      'JSONArrayExpression > *:exit'(
        node: JSONAST.JSONArrayExpression['elements'][number]
      ) {
        ctx.leaveKey(node)
      }
    }
  }

  function createVisitorForYaml(targetLocaleMessage: LocaleMessage): RuleListener {
    const yamlKeyNodes = new Set<YAMLAST.YAMLContent | YAMLAST.YAMLWithMeta>()

    function withinKey(node: YAMLAST.YAMLNode) {
      for (const keyNode of yamlKeyNodes) {
        if (
          keyNode.range[0] <= node.range[0] &&
          node.range[0] < keyNode.range[1]
        ) {
          return true
        }
      }
      return false
    }

    const ctx = createVerifyContext(targetLocaleMessage)

    return {
      YAMLPair(node: YAMLAST.YAMLPair) {
        if (node.key != null) {
          if (withinKey(node)) {
            return
          }
          yamlKeyNodes.add(node.key)
        }

        if (node.key != null && node.key.type === 'YAMLScalar') {
          const key = String(node.key.value)
          ctx.enterKey(key, node.key, isLeafMessageNode(node.value))
        }
      },
      'YAMLPair:exit'(node: YAMLAST.YAMLPair) {
        if (node.key != null) {
          ctx.leaveKey(node.key)
        }
      },
      'YAMLSequence > *'(
        node: YAMLAST.YAMLSequence['entries'][number] & {
          parent: YAMLAST.YAMLSequence
        }
      ) {
        if (withinKey(node)) {
          return
        }
        const key = node.parent.entries.indexOf(node)
        ctx.enterKey(key, node, isLeafMessageNode(node))
      },
      'YAMLSequence > *:exit'(node: YAMLAST.YAMLSequence['entries'][number]) {
        ctx.leaveKey(node)
      }
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
        return createVisitorForJson(targetLocaleMessage)
      },
      ctx => {
        const localeMessages = getLocaleMessages(context)
        const targetLocaleMessage = localeMessages.findBlockLocaleMessage(
          ctx.parserServices.customBlock
        )
        if (!targetLocaleMessage) {
          return {}
        }
        return createVisitorForYaml(targetLocaleMessage)
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
      return createVisitorForJson(targetLocaleMessage)
    }
    if (sourceCode.parserServices.isYAML) {
      return createVisitorForYaml(targetLocaleMessage)
    }
  }

  debug(`ignore ${filename} in valid-message-text`)
  return {}
}

export = createRule({
  meta: {
    type: 'layout',
    docs: {
      description: 'validate locale message text by custom validators',
      category: 'Best Practices',
      recommended: false,
      url: 'https://eslint-plugin-vue-i18n.intlify.dev/rules/valid-message-text.html'
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
                items: { type: 'string' },
                uniqueItems: true
              }
            },
            additionalProperties: false
          }
        }
      }
    ]
  },
  create
})
