export type Locale = string
export type ValidatorResult = [boolean, string]
export type Validator = (text: string) => ValidatorResult
export type ValidatorModule = {
  default?: unknown
  validate?: unknown
}
export type ValidatorName = string
export type ValidatorSource = ValidatorName | Validator | ValidatorModule

const validatorRegistry = new Map<ValidatorName, Validator>()

export function normalizeValidator(source: ValidatorSource): Validator {
  const fn =
    typeof source === 'function'
      ? source
      : typeof source === 'string'
        ? validatorRegistry.get(source)
        : source.default ?? source.validate

  if (typeof fn === 'function') {
    return fn as Validator
  }

  if (typeof source === 'string') {
    throw new Error(
      `Validator "${source}" is not registered. Register it with defineValidator() before using it in rule options.`
    )
  }

  throw new Error('Validator option does not contain validation function')
}

export function defineValidator(
  name: ValidatorName,
  source: Validator | ValidatorModule
): ValidatorName {
  validatorRegistry.set(name, normalizeValidator(source))
  return name
}

export function getValidators(
  settings: Record<Locale, ValidatorSource[]> = {}
): Record<Locale, Validator[]> {
  const validators: Record<Locale, Validator[]> = {}

  for (const locale in settings) {
    validators[locale] = settings[locale].map(normalizeValidator)
  }

  return validators
}
