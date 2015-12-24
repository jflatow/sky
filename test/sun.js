var test = require('tape')
var Sun = require('../sun')

test('item', function (t) {
  t.deepEqual(Sun.item(1), [1, true])
  t.deepEqual(Sun.item({k : 2}), [{k: 2}, true])
  t.deepEqual(Sun.item(['k', 'v']), ['k', 'v'])
  t.deepEqual(Sun.item(['k', 'v', 'x']), ['k', 'v', 'x'])
  t.end()
})

test('equals', function (t) {
  t.ok(Sun.equals({'a': 'b'}, {'a': 'b'}))
  t.ok(Sun.equals(['a', 'b'], ['a', 'b']))
  t.notOk(Sun.equals({'a': 'b'}, {'a': 'c'}))
  t.notOk(Sun.equals(['a', 'b'], ['a', 'c']))
  t.end()
})