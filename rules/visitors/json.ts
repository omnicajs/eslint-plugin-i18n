import type { AST } from 'jsonc-eslint-parser'
import type { RuleListener } from '@intlify/eslint-plugin-vue-i18n/dist/types/index.js'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages.js'
import type {
  VerifyContextFactory,
} from './index.js'

function isJsonMessageNode(
  node: { type: string } | null
): node is AST.JSONExpression {
  return node != null && (
    node.type === 'JSONLiteral' ||
    node.type === 'JSONIdentifier' ||
    node.type === 'JSONTemplateLiteral' ||
    node.type === 'JSONUnaryExpression'
  )
}

export function isLeafJsonMessageNode(
  node: { type: string } | null
): boolean {
  if (!isJsonMessageNode(node)) {
    return false
  }
  if (node.type === 'JSONLiteral') {
    return !(node.value == null && node.regex == null && node.bigint == null)
  }
  if (node.type === 'JSONUnaryExpression') {
    return isLeafJsonMessageNode(node.argument)
  }

  return true
}

export function getJsonMessage(node: { type: string } | null): string | null {
  if (
    !isJsonMessageNode(node) ||
    node.type !== 'JSONLiteral' ||
    typeof node.value !== 'string'
  ) {
    return null
  }

  return node.value
}

export function createVisitorForJson(
  targetLocaleMessage: LocaleMessage,
  createVerifyContext: VerifyContextFactory
): RuleListener {
  const ctx = createVerifyContext(targetLocaleMessage)
  return {
    JSONProperty(node: AST.JSONProperty) {
      const key =
        node.key.type === 'JSONLiteral' ? `${node.key.value}` : node.key.name

      ctx.enterKey(key, node.key, isLeafJsonMessageNode(node.value))
    },
    'JSONProperty:exit'(node: AST.JSONProperty) {
      ctx.leaveKey(node.key)
    },
    'JSONArrayExpression > *'(
      node: AST.JSONArrayExpression['elements'][number] & {
        parent: AST.JSONArrayExpression
      }
    ) {
      const key = node.parent.elements.indexOf(node)
      ctx.enterKey(key, node, isLeafJsonMessageNode(node))
    },
    'JSONArrayExpression > *:exit'(
      node: AST.JSONArrayExpression['elements'][number]
    ) {
      ctx.leaveKey(node)
    },
  }
}
