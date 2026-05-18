import type { RuleListener } from '@intlify/eslint-plugin-vue-i18n/dist/types/index.js'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages.js'
import type {
  YAMLContent,
  YAMLNode,
  YAMLPair,
  YAMLSequence,
  YAMLWithMeta,
} from 'yaml-eslint-parser/lib/ast.js'
import type {
  VerifyContextFactory,
} from './index.js'

function isYamlMessageNode(
  node: { type: string } | null
): node is YAMLContent | YAMLWithMeta {
  return node != null && (
    node.type === 'YAMLScalar' ||
    node.type === 'YAMLWithMeta' ||
    node.type === 'YAMLAlias'
  )
}

export function isLeafYamlMessageNode(
  node: { type: string } | null
): boolean {
  if (!isYamlMessageNode(node)) {
    return false
  }
  if (node.type === 'YAMLScalar') {
    return node.value != null
  }
  if (node.type === 'YAMLWithMeta') {
    return isLeafYamlMessageNode(node.value)
  }

  return true
}

export function getYamlMessage(node: { type: string } | null): string | null {
  if (
    !isYamlMessageNode(node) ||
    node.type !== 'YAMLScalar' ||
    typeof node.value !== 'string'
  ) {
    return null
  }

  return node.value
}

export function createVisitorForYaml(
  targetLocaleMessage: LocaleMessage,
  createVerifyContext: VerifyContextFactory
): RuleListener {
  const yamlKeyNodes = new Set<YAMLContent | YAMLWithMeta>()

  function withinKey(node: YAMLNode) {
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
    YAMLPair(node: YAMLPair) {
      if (node.key != null) {
        if (withinKey(node)) {
          return
        }
        yamlKeyNodes.add(node.key)
      }

      if (node.key != null && node.key.type === 'YAMLScalar') {
        const key = String(node.key.value)
        ctx.enterKey(key, node.key, isLeafYamlMessageNode(node.value))
      }
    },
    'YAMLPair:exit'(node: YAMLPair) {
      if (node.key != null) {
        ctx.leaveKey(node.key)
      }
    },
    'YAMLSequence > *'(
      node: YAMLSequence['entries'][number] & {
        parent: YAMLSequence
      }
    ) {
      if (withinKey(node)) {
        return
      }
      const key = node.parent.entries.indexOf(node)
      ctx.enterKey(key, node, isLeafYamlMessageNode(node))
    },
    'YAMLSequence > *:exit'(node: YAMLSequence['entries'][number]) {
      ctx.leaveKey(node)
    },
  }
}
