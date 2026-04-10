module.exports = function (text) {
  const pattern = /([a-zA-Z.\-_:\/]*(crm|CRM|Crm)[a-zA-Z.\-_\/]*)/g
  const words = []

  let match = pattern.exec(text)

  while (match) {
    if (-1 !== match[1].indexOf('http') && -1 !== match[1].indexOf('retailcrm.')) {
      match = pattern.exec(text)
      continue
    }
    words.push(match[1])
    match = pattern.exec(text)
  }

  return [
    words.length === 0,
    words.length !== 0
      ? `Использование слова "CRM": [${words.map(word => `"${word}"`).join(', ')}]`
      : '',
  ]
}
