module.exports = function (text) {
  const pattern = /([а-яА-Я]+)/g
  const words = []

  let match = pattern.exec(text)

  while (match) {
    words.push(match[1])
    match = pattern.exec(text)
  }

  return [
    words.length === 0,
    words.length !== 0
      ? `Кириллические символы: [${words.map(word => `"${word}"`).join(', ')}]`
      : '',
  ]
}
