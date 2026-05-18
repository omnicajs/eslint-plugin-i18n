import type { AST } from 'jsonc-eslint-parser'
import type { LocaleMessage } from '@intlify/eslint-plugin-vue-i18n/dist/utils/locale-messages.js'
import type {
  YAMLContent,
  YAMLNode,
  YAMLWithMeta,
} from 'yaml-eslint-parser/lib/ast.js'

import {
  getJsonMessage,
  isLeafJsonMessageNode,
} from './json.js'

import {
  getYamlMessage,
  isLeafYamlMessageNode,
} from './yaml.js'

export type Locale = string
export type MessageNode = AST.JSONNode | YAMLNode
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
    | AST.JSONExpression
    | YAMLContent
    | YAMLWithMeta
    | null
): boolean {
  return isLeafJsonMessageNode(node) || isLeafYamlMessageNode(node)
}

export function getMessage(node: MessageNode): string {
  const message = getJsonMessage(node) ?? getYamlMessage(node)

  if (message != null) {
    return message
  }

  throw new Error('Incorrect node')
}

export {
  createVisitorForJson,
  getJsonMessage,
  isLeafJsonMessageNode,
} from './json.js'

export {
  createVisitorForYaml,
  getYamlMessage,
  isLeafYamlMessageNode,
} from './yaml.js'
