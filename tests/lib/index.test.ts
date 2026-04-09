import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const plugin = require('../../dist/index.js')

const namespace = '@omnicajs/i18n'

describe('plugin entry', () => {
  it('exposes wrapped upstream rules and custom valid-message-text rule', () => {
    expect(plugin.rules).toBeTypeOf('object')
    expect(plugin.rules['valid-message-text']).toBeTruthy()
  })

  it('exposes legacy and flat config variants', () => {
    expect(plugin.configs['base-legacy']).toBeTruthy()
    expect(plugin.configs['recommended-legacy']).toBeTruthy()
    expect(plugin.configs.base).toBeTruthy()
    expect(plugin.configs.recommended).toBeTruthy()
    expect(plugin.configs['flat/base']).toBeTruthy()
    expect(plugin.configs['flat/recommended']).toBeTruthy()
  })

  it('maps recommended legacy rule ids to local namespace', () => {
    const rules = plugin.configs['recommended-legacy'].rules as Record<string, unknown>
    expect(Object.keys(rules).length).toBeGreaterThan(0)

    for (const key of Object.keys(rules)) {
      expect(key.startsWith(namespace)).toBe(true)
    }
  })

  it('keeps yaml overrides in legacy config', () => {
    const overrides = plugin.configs['base-legacy'].overrides as Array<Record<string, unknown>>
    const yamlOverride = overrides.find(override =>
      Array.isArray(override.files) && override.files.includes('*.yaml'),
    )

    expect(yamlOverride).toBeTruthy()
    expect((yamlOverride?.rules as Record<string, unknown>)['no-irregular-whitespace']).toBe('off')
    expect((yamlOverride?.rules as Record<string, unknown>)['spaced-comment']).toBe('off')
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
