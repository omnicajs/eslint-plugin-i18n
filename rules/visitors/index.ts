import type { AST as JSONAST } from 'jsonc-eslint-parser'
import type { AST as YAMLAST } from 'yaml-eslint-parser'
import type { RuleListener } from '@intlify/eslint-plugin-vue-i18n/dist/types/index.js'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages.js'

export type Locale = string
export type MessageNode = JSONAST.JSONNode | YAMLAST.YAMLNode
export type KeyPath = (string | number)[]

export type VerifyContext = {
  enterKey: (
    key: string | number,
    node: MessageNode,
    needsVerify: boolean
  ) => void
  leaveKey: (node: MessageNode | null) => void
}

export type VerifyContextFactory = (
  targetLocaleMessage: LocaleMessage
) => VerifyContext

export function isLeafMessageNode(
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

export function getMessage(node: MessageNode): string {
  if (node.type === 'JSONLiteral' && typeof node.value === 'string') {
    return node.value
  }

  if (node.type === 'YAMLScalar' && typeof node.value === 'string') {
    return node.value
  }

  throw new Error('Incorrect node')
}

export function createVisitorForJson(
  targetLocaleMessage: LocaleMessage,
  createVerifyContext: VerifyContextFactory
): RuleListener {
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
    },
  }
}

export function createVisitorForYaml(
  targetLocaleMessage: LocaleMessage,
  createVerifyContext: VerifyContextFactory
): RuleListener {
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
    },
  }
}
