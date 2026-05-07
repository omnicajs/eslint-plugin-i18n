import type {
  Locale,
  Validator,
} from './validators.js'

export type ForbidPattern = string | RegExp
export type ForbidLocaleSettings = {
  words?: string[]
  patterns?: ForbidPattern[]
}
export type ForbidSettings = ForbidLocaleSettings & {
  locales?: Record<Locale, ForbidLocaleSettings>
  [locale: Locale]: unknown
}

const reservedForbidKeys = new Set(['words', 'patterns', 'locales'])

function isForbidLocaleSettings(value: unknown): value is ForbidLocaleSettings {
  return value != null && typeof value === 'object'
}

function normalizePattern(pattern: ForbidPattern): RegExp {
  if (pattern instanceof RegExp) {
    return pattern
  }

  const match = pattern.match(/^\/(.+)\/([dgimsuvy]*)$/)
  if (match) {
    return new RegExp(match[1], match[2])
  }

  return new RegExp(pattern, 'u')
}

export function createForbiddenValidators(
  settings: ForbidSettings = {}
): Record<Locale, Validator[]> & { '*': Validator[] } {
  const validators: Record<Locale, Validator[]> & { '*': Validator[] } = {
    '*': createForbiddenValidatorsForLocale(settings),
  }

  const localeSettings = settings.locales ?? {}
  for (const [locale, value] of Object.entries(settings)) {
    if (!reservedForbidKeys.has(locale) && isForbidLocaleSettings(value)) {
      localeSettings[locale] = value
    }
  }

  for (const [locale, value] of Object.entries(localeSettings)) {
    validators[locale] = createForbiddenValidatorsForLocale(value)
  }

  return validators
}

function createForbiddenValidatorsForLocale(
  settings: ForbidLocaleSettings
): Validator[] {
  const validators: Validator[] = []

  for (const word of settings.words ?? []) {
    validators.push(text => [
      !text.includes(word),
      `Contains forbidden word "${word}"`,
    ])
  }

  for (const pattern of settings.patterns ?? []) {
    const regexp = normalizePattern(pattern)
    validators.push(text => {
      regexp.lastIndex = 0
      return [
        !regexp.test(text),
        `Matches forbidden pattern "${regexp}"`,
      ]
    })
  }

  return validators
}
