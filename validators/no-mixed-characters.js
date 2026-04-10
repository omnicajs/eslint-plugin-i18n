const ALPHANUMERIC = {
  en_GB: /[a-zA-Z0-9]/u,
  es_ES: /[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9]/u,
  ru_RU: /[а-яА-Я0-9]/u,
}

const EXCLUDED_WORDS = ['ЮMoney', 'ЮKassa']

function getWords (text) {
  return text.split(/[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑа-яА-Я0-9]/g).filter(item => '' !== item)
}

function getInvalidCharacterIndices (word, preferredLocale) {
  const charIndices = {
    'en_GB': [],
    'es_ES': [],
    'ru_RU': [],
  }

  for (const key in word) {
    for (const [ locale, pattern ] of Object.entries(ALPHANUMERIC)) {
      if (pattern.test(word[key])) {
        charIndices[locale].push(key)
      }
    }
  }

  const mainLocale = preferredLocale || getMainLocale(charIndices)
  let invalidCharIndices = []

  for (const [ locale, indices ] of Object.entries(charIndices)) {
    if (locale !== mainLocale) {
      invalidCharIndices = invalidCharIndices.concat(indices)
    }
  }

  invalidCharIndices = noMatchesWithLocales(charIndices[mainLocale], Array.from(new Set(invalidCharIndices)))

  return invalidCharIndices.length ? invalidCharIndices : null
}

function getMainLocale (characterIndicesLocales) {
  let mainLocale = null
  let maxLengthCharacter = 0

  for (const [ locale, characterIndices ] of Object.entries(characterIndicesLocales)) {
    if (characterIndices.length > maxLengthCharacter) {
      maxLengthCharacter = characterIndices.length
      mainLocale = locale
    }
  }

  return mainLocale
}

function noMatchesWithLocales (correctCharIndices, invalidCharIndices) {
  return invalidCharIndices.filter(index => !correctCharIndices.includes(index))
}

module.exports = function (text, preferredLocale) {
  const words = getWords(text)
  const invalidWords = []

  for (const word of words) {
    if (EXCLUDED_WORDS.includes(word)) {
      continue
    }

    const invalidCharIndices = getInvalidCharacterIndices(word, preferredLocale)

    if (invalidCharIndices) {
      invalidWords.push(`"${word}":[${Object.values(invalidCharIndices).join(', ')}]`)
    }
  }

  return [
    invalidWords.length === 0,
    invalidWords.length !== 0
      ? `Смешанные буквы в словах: [${invalidWords.join(', ')}]`
      : '',
  ]
}
