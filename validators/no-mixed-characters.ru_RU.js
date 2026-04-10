const validate = require('./no-mixed-characters')

module.exports = text => validate(text, 'ru_RU')
