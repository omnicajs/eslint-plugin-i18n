import {
  createForbiddenValidators,
} from '../../../dist/lib/forbid.js'
import {
  defineValidator,
  getValidators,
} from '../../../dist/lib/validators.js'
import {
  getMessage,
  isLeafMessageNode,
} from '../../../dist/rules/visitors/index.js'
import * as compat from '@intlify/eslint-plugin-vue-i18n/dist/utils/compat.js'
import * as localeUtils from '@intlify/eslint-plugin-vue-i18n/dist/utils/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rule = (await import('../../../dist/rules/valid-message-text.js')).default
const notAllowedValidator = await import('../../fixtures/valid-message-text/not-allowed.js')
const notFunctionValidator = await import('../../fixtures/valid-message-text/not-function.js')

const createRuleListener = rule.create as unknown as (
  context: Record<string, unknown>
) => Record<string, (...args: unknown[]) => unknown>

describe('valid-message-text internals', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads validators and validates exported function modules', () => {
    const validators = getValidators({
      foo: [notAllowedValidator],
    })

    expect(validators.foo).toHaveLength(1)
    expect(validators.foo[0]('not-allowed')).toEqual([
      false,
      'Contains "not-allowed"',
    ])
  })

  it('loads validators passed as imported modules or direct functions', () => {
    const validator = (text: string): [boolean, string] => [
      text !== 'inline-forbidden',
      'Inline validator failed',
    ]
    const validators = getValidators({
      foo: [{ default: validator }, validator],
    })

    expect(validators.foo).toHaveLength(2)
    expect(validators.foo[0]('inline-forbidden')).toEqual([
      false,
      'Inline validator failed',
    ])
    expect(validators.foo[1]('allowed')).toEqual([
      true,
      'Inline validator failed',
    ])
  })

  it('loads registered validators by serializable option names', () => {
    const validatorName = defineValidator(
      'tests/registered-not-allowed',
      notAllowedValidator
    )
    const validators = getValidators({
      foo: [validatorName],
    })

    expect(validators.foo[0]('not-allowed')[0]).toBe(false)
  })

  it('builds global and locale-specific forbid validators', () => {
    const validators = createForbiddenValidators({
      words: ['global'],
      patterns: ['/glob[a-z]+/i', /regexp-instance/],
      locales: {
        foo: {
          words: ['local'],
          patterns: ['local-[0-9]+'],
        },
      },
      bar: {
        words: ['top-level-locale'],
      },
      ignored: null,
    })

    expect(validators['*'][0]('has global word')[0]).toBe(false)
    expect(validators['*'][1]('GLOBAL pattern')[0]).toBe(false)
    expect(validators['*'][2]('regexp-instance')[0]).toBe(false)
    expect(validators.foo[0]('has local word')[0]).toBe(false)
    expect(validators.foo[1]('local-12')[0]).toBe(false)
    expect(validators.bar[0]('top-level-locale')[0]).toBe(false)
  })

  it('throws when validator module does not export a function', () => {
    expect(() =>
      getValidators({
        foo: [notFunctionValidator],
      })
    ).toThrow('does not contain validation function')
  })

  it('throws when validator name is not registered', () => {
    expect(() =>
      getValidators({
        foo: ['tests/missing-validator'],
      })
    ).toThrow('is not registered')
  })

  it('detects leaf nodes for JSON and YAML variants', () => {
    expect(isLeafMessageNode(null)).toBe(false)

    expect(
      isLeafMessageNode({
        type: 'JSONLiteral',
        value: 'hello',
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'JSONLiteral',
        value: null,
        regex: null,
        bigint: null,
      })
    ).toBe(false)

    expect(
      isLeafMessageNode({
        type: 'JSONIdentifier',
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'JSONTemplateLiteral',
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'JSONUnaryExpression',
        argument: {
          type: 'JSONLiteral',
          value: 'inner',
        },
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'YAMLScalar',
        value: 'hello',
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'YAMLScalar',
        value: null,
      })
    ).toBe(false)

    expect(
      isLeafMessageNode({
        type: 'YAMLWithMeta',
        value: {
          type: 'YAMLScalar',
          value: 'inner',
        },
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'YAMLAlias',
      })
    ).toBe(true)

    expect(
      isLeafMessageNode({
        type: 'JSONObjectExpression',
      })
    ).toBe(false)
  })

  it('extracts message only from supported string nodes', () => {
    expect(
      getMessage({
        type: 'JSONLiteral',
        value: 'json-message',
      })
    ).toBe('json-message')

    expect(
      getMessage({
        type: 'YAMLScalar',
        value: 'yaml-message',
      })
    ).toBe('yaml-message')

    expect(() =>
      getMessage({
        type: 'JSONLiteral',
        value: 1,
      })
    ).toThrow('Incorrect node')

    expect(() =>
      getMessage({
        type: 'YAMLAlias',
      })
    ).toThrow('Incorrect node')
  })

  it('returns empty listener for unsupported source files', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.ts')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: false,
        isYAML: false,
      },
    })

    const context = {
      options: [],
      report: vi.fn(),
    }

    expect(createRuleListener(context)).toEqual({})
  })

  it('returns empty listener when locale message is not found for JSON/YAML files', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.json')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: true,
        isYAML: false,
      },
    })
    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findExistLocaleMessage: () => null,
    })

    const context = {
      options: [],
      report: vi.fn(),
    }

    expect(createRuleListener(context)).toEqual({})
  })

  it('reports JSON and YAML message errors through created visitors', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.json')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: true,
        isYAML: false,
      },
    })
    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findExistLocaleMessage: () => ({
        isResolvedLocaleByFileName: () => true,
        locales: ['foo'],
      }),
    })

    const report = vi.fn()
    const context = {
      options: [
        {
          validators: {
            foo: [notAllowedValidator],
          },
        },
      ],
      report,
    }

    const jsonVisitors = createRuleListener(context)
    const jsonValueNode = {
      type: 'JSONLiteral',
      value: 'not-allowed',
    }
    const jsonKeyNode = {
      type: 'JSONLiteral',
      value: 'a',
      loc: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
      parent: {
        value: jsonValueNode,
      },
    }

    jsonVisitors.JSONProperty?.({
      key: jsonKeyNode,
      value: jsonValueNode,
    })

    expect(report).toHaveBeenCalled()

    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.yaml')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: false,
        isYAML: true,
      },
    })
    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findExistLocaleMessage: () => ({
        isResolvedLocaleByFileName: () => true,
        locales: ['foo'],
      }),
    })

    const yamlVisitors = createRuleListener(context)
    const yamlValueNode = {
      type: 'YAMLScalar',
      value: 'not-allowed',
      range: [10, 20],
    }
    const yamlKeyNode = {
      type: 'YAMLScalar',
      value: 'a',
      range: [0, 5],
      loc: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
      parent: {
        value: yamlValueNode,
      },
    }

    yamlVisitors.YAMLPair?.({
      key: yamlKeyNode,
      value: yamlValueNode,
      range: [0, 20],
    })
    yamlVisitors['YAMLPair:exit']?.({
      key: yamlKeyNode,
    })

    expect(report).toHaveBeenCalledTimes(2)
  })

  it('handles vue custom-block path for both JSON and YAML visitor factories', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/component.vue')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: false,
        isYAML: false,
      },
    })

    const findBlockLocaleMessage = vi
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValue({
        isResolvedLocaleByFileName: () => false,
        locales: [],
      })

    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findBlockLocaleMessage,
    })

    const defineCustomBlocksVisitorSpy = vi
      .spyOn(localeUtils, 'defineCustomBlocksVisitor')
      .mockImplementation((ctx, jsonFactory, yamlFactory) => {
        const factoryContext = {
          parserServices: {
            customBlock: {},
          },
        }

        jsonFactory(factoryContext)
        yamlFactory(factoryContext)

        const jsonVisitors = jsonFactory(factoryContext)
        const yamlVisitors = yamlFactory(factoryContext)

        return {
          ...jsonVisitors,
          ...yamlVisitors,
        }
      })

    const context = {
      options: [],
      report: vi.fn(),
    }

    const visitors = createRuleListener(context)
    expect(defineCustomBlocksVisitorSpy).toHaveBeenCalledOnce()
    expect(visitors).toBeTypeOf('object')
  })

  it('covers YAML withinKey and sequence branches', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.yaml')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: false,
        isYAML: true,
      },
    })
    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findExistLocaleMessage: () => ({
        isResolvedLocaleByFileName: () => true,
        locales: ['foo'],
      }),
    })

    const context = {
      options: [
        {
          validators: {
            foo: [notAllowedValidator],
          },
        },
      ],
      report: vi.fn(),
    }

    const visitors = createRuleListener(context)
    const keyNode = {
      type: 'YAMLScalar',
      value: 'list',
      range: [0, 4],
      loc: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 5 },
      },
      parent: {
        value: {
          type: 'YAMLScalar',
          value: 'allowed',
        },
      },
    }

    visitors.YAMLPair?.({
      key: keyNode,
      value: keyNode.parent.value,
      range: [0, 12],
    })

    visitors.YAMLPair?.({
      key: keyNode,
      value: keyNode.parent.value,
      range: [1, 2],
    })

    const seqEntryInsideKey = {
      type: 'YAMLScalar',
      value: 'not-allowed',
      range: [2, 3],
      parent: {
        entries: [],
      },
      loc: {
        start: { line: 2, column: 1 },
        end: { line: 2, column: 2 },
      },
    }
    seqEntryInsideKey.parent.entries = [seqEntryInsideKey]
    visitors['YAMLSequence > *']?.(seqEntryInsideKey)

    const seqEntry = {
      type: 'YAMLScalar',
      value: 'not-allowed',
      range: [20, 30],
      parent: {
        entries: [],
      },
      loc: {
        start: { line: 3, column: 1 },
        end: { line: 3, column: 2 },
      },
    }
    seqEntry.parent.entries = [seqEntry]
    visitors['YAMLSequence > *']?.(seqEntry)
    visitors['YAMLSequence > *:exit']?.(seqEntry)
    visitors['YAMLPair:exit']?.({
      key: keyNode,
    })
  })

  it('covers JSON key-stack and array visitor exit branches', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.json')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: true,
        isYAML: false,
      },
    })
    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findExistLocaleMessage: () => ({
        isResolvedLocaleByFileName: () => false,
        locales: [],
      }),
    })

    const context = {
      options: [],
      report: vi.fn(),
    }

    const visitors = createRuleListener(context)
    const localeKey = {
      type: 'JSONLiteral',
      value: 'foo',
      loc: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
    }
    const localeProperty = {
      key: localeKey,
      value: {
        type: 'JSONObjectExpression',
      },
    }
    localeKey.parent = localeProperty

    visitors.JSONProperty?.(localeProperty)
    visitors['JSONProperty:exit']?.(localeProperty)

    const arrayEntry = {
      type: 'JSONLiteral',
      value: 'allowed',
      parent: {
        elements: [],
      },
      loc: {
        start: { line: 2, column: 1 },
        end: { line: 2, column: 2 },
      },
    }
    arrayEntry.parent.elements = [arrayEntry]

    visitors['JSONArrayExpression > *']?.(arrayEntry)
    visitors['JSONArrayExpression > *:exit']?.(arrayEntry)
  })

  it('does not use validators when they are not configured', () => {
    vi.spyOn(compat, 'getFilename').mockReturnValue('/tmp/file.json')
    vi.spyOn(compat, 'getSourceCode').mockReturnValue({
      parserServices: {
        isJSON: true,
        isYAML: false,
      },
    })
    vi.spyOn(localeUtils, 'getLocaleMessages').mockReturnValue({
      findExistLocaleMessage: () => ({
        isResolvedLocaleByFileName: () => true,
        locales: ['ru_RU'],
      }),
    })

    const report = vi.fn()
    const context = {
      options: [{}],
      report,
    }

    const jsonVisitors = createRuleListener(context)
    const jsonValueNode = {
      type: 'JSONLiteral',
      value: 'CRM',
    }
    const jsonKeyNode = {
      type: 'JSONLiteral',
      value: 'a',
      loc: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
      parent: {
        value: jsonValueNode,
      },
    }
    jsonVisitors.JSONProperty?.({
      key: jsonKeyNode,
      value: jsonValueNode,
    })

    expect(report).not.toHaveBeenCalled()
  })
})
