import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const rule = require('../../../dist/rules/valid-message-text.js')
const compat = require('@intlify/eslint-plugin-vue-i18n/dist/utils/compat')
const localeUtils = require('@intlify/eslint-plugin-vue-i18n/dist/utils/index')

const fixturesRoot = join(__dirname, '../../fixtures/valid-message-text')

type PrivateApi = {
  getValidators: (settings?: Record<string, string[]>) => Record<string, Array<(text: string) => [boolean, string]>>
  isLeafMessageNode: (node: unknown) => boolean
  getMessage: (node: unknown) => string
  create: (context: Record<string, unknown>) => Record<string, (...args: unknown[]) => unknown>
}

const privateApi = (rule as typeof rule & { __private: PrivateApi }).__private

describe('valid-message-text private API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads validators and validates exported function modules', () => {
    const validators = privateApi.getValidators({
      foo: [join(fixturesRoot, 'not-allowed.js')],
    })

    expect(validators.foo).toHaveLength(1)
    expect(validators.foo[0]('not-allowed')).toEqual([
      false,
      'Contains "not-allowed"',
    ])
  })

  it('loads built-in validators from repository validators directory', () => {
    const validators = privateApi.getValidators({
      ru_RU: [join(__dirname, '../../../validators/no-cyrillic.js')],
    })

    expect(validators.ru_RU).toHaveLength(1)
    expect(validators.ru_RU[0]('text')).toEqual([true, ''])
    expect(validators.ru_RU[0]('текст')[0]).toBe(false)
  })

  it('uses locale-specific mixed-character validators with different behavior', () => {
    const validators = privateApi.getValidators({
      en_GB: [join(__dirname, '../../../validators/no-mixed-characters.en_GB.js')],
      es_ES: [join(__dirname, '../../../validators/no-mixed-characters.es_ES.js')],
    })

    expect(validators.en_GB[0]('áéíóú')[0]).toBe(false)
    expect(validators.es_ES[0]('áéíóú')[0]).toBe(true)
  })

  it('throws when validator module does not export a function', () => {
    expect(() =>
      privateApi.getValidators({
        foo: [join(fixturesRoot, 'not-function.js')],
      })
    ).toThrow('does not contain validation function')
  })

  it('detects leaf nodes for JSON and YAML variants', () => {
    expect(privateApi.isLeafMessageNode(null)).toBe(false)

    expect(
      privateApi.isLeafMessageNode({
        type: 'JSONLiteral',
        value: 'hello',
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'JSONLiteral',
        value: null,
        regex: null,
        bigint: null,
      })
    ).toBe(false)

    expect(
      privateApi.isLeafMessageNode({
        type: 'JSONIdentifier',
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'JSONTemplateLiteral',
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'JSONUnaryExpression',
        argument: {
          type: 'JSONLiteral',
          value: 'inner',
        },
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'YAMLScalar',
        value: 'hello',
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'YAMLScalar',
        value: null,
      })
    ).toBe(false)

    expect(
      privateApi.isLeafMessageNode({
        type: 'YAMLWithMeta',
        value: {
          type: 'YAMLScalar',
          value: 'inner',
        },
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'YAMLAlias',
      })
    ).toBe(true)

    expect(
      privateApi.isLeafMessageNode({
        type: 'JSONObjectExpression',
      })
    ).toBe(false)
  })

  it('extracts message only from supported string nodes', () => {
    expect(
      privateApi.getMessage({
        type: 'JSONLiteral',
        value: 'json-message',
      })
    ).toBe('json-message')

    expect(
      privateApi.getMessage({
        type: 'YAMLScalar',
        value: 'yaml-message',
      })
    ).toBe('yaml-message')

    expect(() =>
      privateApi.getMessage({
        type: 'JSONLiteral',
        value: 1,
      })
    ).toThrow('Incorrect node')

    expect(() =>
      privateApi.getMessage({
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

    expect(privateApi.create(context)).toEqual({})
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

    expect(privateApi.create(context)).toEqual({})
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
            foo: [join(fixturesRoot, 'not-allowed.js')],
          },
        },
      ],
      report,
    }

    const jsonVisitors = privateApi.create(context)
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

    const yamlVisitors = privateApi.create(context)
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

    const visitors = privateApi.create(context)
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
            foo: [join(fixturesRoot, 'not-allowed.js')],
          },
        },
      ],
      report: vi.fn(),
    }

    const visitors = privateApi.create(context)
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

    const visitors = privateApi.create(context)
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

    const jsonVisitors = privateApi.create(context)
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
