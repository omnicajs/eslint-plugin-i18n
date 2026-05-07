export default text => [
  !text.includes('not-allowed'),
  'Contains "not-allowed"',
]
