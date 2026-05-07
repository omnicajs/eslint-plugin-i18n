import { describe, expect, it } from 'vitest'

const pluginModule = await import('../../dist/index.js')
const plugin = pluginModule.default

const namespace = '@omnicajs/i18n'

describe('plugin entry', () => {
  it('exposes wrapped upstream rules and custom valid-message-text rule', () => {
    expect(plugin.rules).toBeTypeOf('object')
    expect(plugin.rules['valid-message-text']).toBeTruthy()
    expect(pluginModule.defineValidator).toBeTypeOf('function')
  })

  it('exposes flat config variants only', () => {
    expect(Object.keys(plugin.configs).sort()).toEqual([
      'base',
      'flat/base',
      'flat/recommended',
      'recommended',
    ])
    expect(plugin.configs.base).toBeTruthy()
    expect(plugin.configs.recommended).toBeTruthy()
    expect(plugin.configs['flat/base']).toBeTruthy()
    expect(plugin.configs['flat/recommended']).toBeTruthy()
  })

  it('maps recommended flat rule ids to local namespace', () => {
    const recommended = plugin.configs.recommended as Array<Record<string, unknown>>
    const rulesConfig = recommended.find(config =>
      config.name === `${namespace}:recommended:rules`
    )
    const rules = rulesConfig?.rules as Record<string, unknown>

    expect(Object.keys(rules).length).toBeGreaterThan(0)

    for (const key of Object.keys(rules)) {
      expect(key.startsWith(namespace)).toBe(true)
    }
  })

  it('keeps yaml rules in flat base config', () => {
    const flatBase = plugin.configs.base as Array<Record<string, unknown>>
    const setup = flatBase.find(config => config.name === `${namespace}:base:setup`)
    const yamlConfig = flatBase.find(config => config.name === `${namespace}:base:setup:yaml`)

    expect(setup).toBeTruthy()
    expect((setup?.plugins as Record<string, unknown>)[namespace]).toBe(plugin)
    expect(yamlConfig).toBeTruthy()
    expect((yamlConfig?.rules as Record<string, unknown>)['no-irregular-whitespace']).toBe('off')
    expect((yamlConfig?.rules as Record<string, unknown>)['spaced-comment']).toBe('off')
  })
})
