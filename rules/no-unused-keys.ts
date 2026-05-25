import type { RuleListener } from '@intlify/eslint-plugin-vue-i18n/dist/types/index.js'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages.js'
import upstream from '@intlify/eslint-plugin-vue-i18n'
import { collectLinkedKeys } from '@intlify/eslint-plugin-vue-i18n/dist/utils/collect-linked-keys.js'
import { usedKeysCache } from '@intlify/eslint-plugin-vue-i18n/dist/utils/collect-keys.js'
import { getFilename, getSourceCode } from '@intlify/eslint-plugin-vue-i18n/dist/utils/compat.js'
import { getCwd } from '@intlify/eslint-plugin-vue-i18n/dist/utils/get-cwd.js'
import { getLocaleMessages } from '@intlify/eslint-plugin-vue-i18n/dist/utils/index.js'
import { joinPath } from '@intlify/eslint-plugin-vue-i18n/dist/utils/key-path.js'
import { createRule } from '@intlify/eslint-plugin-vue-i18n/dist/utils/rule.js'
import { toRegExp } from '@intlify/eslint-plugin-vue-i18n/dist/utils/regexp.js'

type Options = [{
  src?: string
  extensions?: string[]
  ignores?: string[]
}]

type JsonPropertyNode = {
  type: 'JSONProperty'
  key: {
    type: 'JSONLiteral'
    value?: unknown
    loc: unknown
  }
  value: {
    type: string
  }
}

const upstreamNoUnusedKeys = upstream.rules['no-unused-keys'] as {
  create: (context: unknown) => RuleListener
}

function isContainerNode(node: { type: string } | null): boolean {
  return Boolean(node && (
    node.type === 'JSONObjectExpression' ||
    node.type === 'JSONArrayExpression'
  ))
}

function getJsonKey(node: JsonPropertyNode): string {
  return String(node.key.value)
}

function getComparableKey(keyPath: string[], localeMessage: LocaleMessage): string {
  if (localeMessage.localeKey !== 'key') {
    return joinPath(...keyPath)
  }

  return joinPath(...keyPath.slice(1))
}

function createUsedKeySet(
  context: Parameters<typeof getCwd>[0],
  localeMessage: LocaleMessage,
  options: Options[0]
): Set<string> {
  const src = options.src || getCwd(context)
  const extensions = options.extensions || ['.js', '.vue']
  const usedKeys = usedKeysCache.collectKeysFromFiles([src], extensions, context)
  const linkedKeys = collectLinkedKeys(localeMessage.messages, context)

  return new Set([...usedKeys, ...linkedKeys].map(String))
}

function createLocaleMessageVisitor(
  context: Parameters<typeof getSourceCode>[0],
  localeMessage: LocaleMessage,
  options: Options[0]
): RuleListener {
  const ignores = (options.ignores || []).map(toRegExp)
  const usedKeys = createUsedKeySet(context, localeMessage, options)
  const keyPathStack: string[] = []

  function enterKey(key: string, node: { loc: unknown }, value: { type: string } | null): void {
    keyPathStack.push(key)

    if (isContainerNode(value)) {
      return
    }

    const comparableKey = getComparableKey(keyPathStack, localeMessage)
    const reportKey = joinPath(...keyPathStack)

    if (usedKeys.has(comparableKey) || ignores.some(ignore => ignore.test(reportKey))) {
      return
    }

    context.report({
      message: `unused '${reportKey}' key`,
      loc: node.loc as never,
    })
  }

  function leaveKey(): void {
    keyPathStack.pop()
  }

  return {
    JSONProperty(node: JsonPropertyNode) {
      enterKey(getJsonKey(node), node.key, node.value)
    },
    'JSONProperty:exit'() {
      leaveKey()
    },
  } as RuleListener
}

export default createRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow unused localization keys',
      category: 'Best Practices',
      url: 'https://eslint-plugin-vue-i18n.intlify.dev/rules/no-unused-keys.html',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          src: {
            type: 'string',
          },
          extensions: {
            type: 'array',
            items: { type: 'string' },
            default: ['.js', '.vue'],
          },
          ignores: {
            type: 'array',
            items: { type: 'string' },
          },
          enableFix: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const sourceCode = getSourceCode(context)
    const filename = getFilename(context)

    if (!sourceCode.parserServices.isJSON) {
      return upstreamNoUnusedKeys.create(context)
    }

    const localeMessages = getLocaleMessages(context)
    const localeMessage = localeMessages.findExistLocaleMessage(filename)

    if (!localeMessage) {
      return {}
    }

    return createLocaleMessageVisitor(
      context,
      localeMessage,
      (context.options as Options)[0] || {}
    )
  },
})
