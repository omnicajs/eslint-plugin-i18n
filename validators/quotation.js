module.exports = function (text) {
  if (-1 !== text.indexOf('«') || -1 !== text.indexOf('»')) {
    return [false, 'Кавычки-лапки "«/»"']
  }

  return [true, '']
}
