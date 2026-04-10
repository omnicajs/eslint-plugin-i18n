module.exports = function (text) {
  const pattern = /gerente|mánagers|gestor/ig
  const words = []

  let match = pattern.exec(text)

  while (match) {
    words.push(match[1])
    match = pattern.exec(text)
  }

  return [
    words.length === 0,
    words.length !== 0
      ? 'Использование слов "gerente" или "mánagers" или "gestor"'
      : '',
  ]
}
