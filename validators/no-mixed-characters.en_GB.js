const validate = require('./no-mixed-characters')

module.exports = text => validate(text, 'en_GB')
