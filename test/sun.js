var test = require('tape')
var Sun = require('../sun')

var L = Sun.list;

test('cmp', function (t) {
  t.ok(Sun.lt([], [1, 2, 3]))
  t.ok(Sun.lt(['a', 'b'], ['x']))
  t.ok(Sun.lte([], []))
  t.ok(Sun.lte([], [1, 2, 3]))
  t.ok(Sun.lte(['a', 'b'], ['x']))
  t.ok(Sun.lte(['a', 'b'], ['a', 'b', 'c']))
  t.ok(Sun.lte(['a', 'b', 'c'], ['a', 'b', 'c']))
  t.ok(Sun.lt(['a', 'b'], ['a', 'b', 'c']))
  t.ok(Sun.gt([1, 'a'], [0, 'b']))
  t.ok(Sun.gte([1, 'a'], [undefined, 'b']))
  t.notOk(Sun.lt([], []))
  t.notOk(Sun.lt(['a', 'b', 'c'], ['a', 'b', 'c']))
  t.notOk(Sun.lt(['a', 'b', 'd'], ['a', 'b', 'c']))
  t.notOk(Sun.lte(['a', 'b', 'c', 'd'], ['a', 'b', 'c']))
  t.notOk(Sun.gt([1, 'a'], [3, 'b']))
  t.notOk(Sun.gte([undefined, 'a'], [undefined, 'b']))
  t.notOk(Sun.gte([undefined, 'a'], [1, 'b']))
  t.end()
})

test('equals', function (t) {
  t.ok(Sun.equals(undefined, undefined))
  t.ok(Sun.equals(undefined, null))
  t.ok(Sun.equals(0, 0))
  t.ok(Sun.equals({'a': 'b'}, {'a': 'b'}))
  t.ok(Sun.equals(['a', 'b'], ['a', 'b']))
  t.ok(Sun.equals({'a': ['b', 0]}, {'a': ['b', 0]}))
  t.notOk(Sun.equals(undefined, 0))
  t.notOk(Sun.equals(null, 0))
  t.notOk(Sun.equals({'a': 'b'}, {'a': 'c'}))
  t.notOk(Sun.equals(['a', 'b'], ['a', 'c']))
  t.notOk(Sun.equals({'a': ['b', 0]}, {'a': ['b', 1]}))
  t.notOk(Sun.equals('x', ['x']))
  t.end()
})

test('key', function (t) {
  t.deepEqual(Sun.key([1, true]), 1)
  t.deepEqual(Sun.key([{k: 2}, true]), {k: 2})
  t.deepEqual(Sun.key([1, 2, 3]), 1)
  t.deepEqual(Sun.key(['v', 'k'], 1), 'k')
  t.deepEqual(Sun.key(['k', 'v', 'x'], function (i) { return i[0] + i[2] }), 'kx')
  t.end()
})

test('val', function (t) {
  t.deepEqual(Sun.val([1, true]), true)
  t.deepEqual(Sun.val([{k: 2}, true]), true)
  t.deepEqual(Sun.val([1, 2, 3]), [1, 2, 3])
  t.deepEqual(Sun.val(['v', 'k'], 0), 'v')
  t.deepEqual(Sun.val(['x', 'v', 'k'], function (i) { return i[1] + i[0] }), 'vx')
  t.end()
})

test('fold', function (t) {
  t.deepEqual(Sun.fold(L.append, [], undefined), [])
  t.deepEqual(Sun.fold(L.append, [], {'k': 'v'}), [['k', 'v']])
  t.deepEqual(Sun.fold(L.append, [], ['k', 'v']), ['k', 'v'])
  t.deepEqual(Sun.fold(L.append, [], [['k', 'v']]), [['k', 'v']])
  t.end()
})

test('get', function (t) {
  t.equal(Sun.get({'x': 'y'}, 'x'), 'y')
  t.equal(Sun.get([['x', 'y']], 'x'), 'y')
  t.equal(Sun.get(['x', 'y'], 'x'), 'x')
  t.end()
})

test('set', function (t) {
  t.deepEqual(Sun.set({}, 'x', 'y'), {x: 'y'})
  t.deepEqual(Sun.set([['x', 'y']], 'k', true), [['x', 'y'], ['k', true]])
  t.deepEqual(Sun.set(['x'], 'k', true), ['x', ['k', true]])
  t.deepEqual(Sun.set({k: [0, 1]}, 'k', true), {k: true})
  t.end()
})

test('del', function (t) {
  t.deepEqual(Sun.del({'x': 'y'}, 'x'), {})
  t.deepEqual(Sun.del({'x': 'y', 'k': true}, 'k'), {'x': 'y'})
  t.deepEqual(Sun.del([['x', 'y']], 'x'), [])
  t.deepEqual(Sun.del([['x', 'y'], 'k'], 'x'), ['k'])
  t.deepEqual(Sun.del([['x', 'y'], 'k'], 'k'), [['x', 'y']])
  t.deepEqual(Sun.del([[{'complex': ['key', 3]}, 'y'], 'k'], {'complex': ['key', 3]}), ['k'])
  t.notDeepEqual(Sun.del([[{'complex': ['key', 3]}, 'y'], 'k'], {'complex': ['key', 2]}), ['k'])
  t.end()
})

test('format', function (t) {
  t.equal(Sun.format('o{k}', {k: 'kay'}), 'okay')
  t.end()
})

test('count', function (t) {
  t.deepEqual(Sun.count(L.append, [], 5), [0, 1, 2, 3, 4])
  t.deepEqual(Sun.count(L.append, [], {start: 7, stop: 10}), [7, 8, 9])
  t.deepEqual(Sun.count(L.append, [], {start: 4, stop: -4, step: -2}), [4, 2, 0, -2])
  t.end()
})

test('lookup', function (t) {
  t.deepEqual(Sun.lookup(null, 'x'), undefined)
  t.deepEqual(Sun.lookup({x: {y: 'z'}}, 'x'), {y: 'z'})
  t.deepEqual(Sun.lookup({x: {y: 'z'}}, ['x', 'y']), 'z')
  t.deepEqual(Sun.lookup({x: {y: 'z'}}, ['x', 'y', 0]), 'z')
  t.deepEqual(Sun.lookup({x: {y: 'z'}}, ['x', 'y', 'z']), undefined)
  t.end()
})

test('modify', function (t) {
  t.deepEqual(Sun.modify(null, 'x'), {x: undefined})
  t.deepEqual(Sun.modify({}, ['p', 'a', 't', 'h'], true), {p: {a: {t: {h: true}}}})
  t.deepEqual(Sun.modify([], ['p', 'a', 't', 'h'], true), [['p', {a: {t: {h: true}}}]])
  t.deepEqual(Sun.modify([], ['p', 'a', 't', 'h'], true, []), [['p', [['a', [['t', [['h', true]]]]]]]])
  t.deepEqual(Sun.modify({}, ['a', 'b'], function () { return 3 }), {a: {b: 3}})
  t.deepEqual(Sun.modify({a: {b: 3}}, ['a', 'b'], function (x) { return x * 10 }), {a: {b: 30}})
  t.deepEqual(Sun.modify({a: 3}, 'a', function (x) { return x + 3 }), {a: 6})
  t.end()
})

test('remove', function (t) {
  t.deepEqual(Sun.remove(null, 'x'), null)
  t.deepEqual(Sun.remove({}, 'x'), {})
  t.deepEqual(Sun.remove([], 'x'), [])
  t.deepEqual(Sun.remove({x: 1}, 'x'), {})
  t.deepEqual(Sun.remove({x: {y: [['z', 1]]}}, ['x', 'y', 'z']), {x: {y: []}})
  t.deepEqual(Sun.remove([['x', [['y', {'z': true}]]]], ['x', 'y', 'z']), [['x', [['y', {}]]]])
  t.deepEqual(Sun.remove({x: ['y']}, ['x']), {})
  t.deepEqual(Sun.remove({x: ['y']}, ['x', 'y']), {x: []})
  t.end()
})

test('object', function (t) {
  t.deepEqual(Sun.object([['k', 'v'], ['x', 'y']]), {'k': 'v', 'x': 'y'})
  t.end()
})

test('update', function (t) {
  t.deepEqual(Sun.update([['k', 'v']], {'x': 'y'}), [['k', 'v'], ['x', 'y']])
  t.deepEqual(Sun.update({'k': 'v'}, {'x': 'y'}), {'k': 'v', 'x': 'y'})
  t.end()
})

test('except', function (t) {
  t.deepEqual(Sun.except({'k': 'v'}, ['k', 'x']), {})
  t.deepEqual(Sun.except({'k': 'v'}, ['x']), {'k': 'v'})
  t.deepEqual(Sun.except([['k', 'v'], ['x', 'y']], ['x']), [['k', 'v']])
  t.deepEqual(Sun.except([['k', 'v']], ['x']), [['k', 'v']])
  t.deepEqual(Sun.except({'k': 'v'}, {'k': true}), {})
  t.end()
})

test('select', function (t) {
  t.deepEqual(Sun.select({'k': 'v'}, ['k', 'x']), {'k': 'v'})
  t.deepEqual(Sun.select([['k', 'v'], ['x', 'y']], ['x']), [['x', 'y']])
  t.deepEqual(Sun.select([['k', 'v']], ['x']), [])
  t.deepEqual(Sun.select([['k', 'v']], {'k': true}), [['k', 'v']])
  t.end()
})

test('values', function (t) {
  t.deepEqual(Sun.values({a: 'b', 'c': 'd'}), ['b', 'd'])
  t.deepEqual(Sun.values([['a', 'b'], 'x', ['c', 'd']]), ['b', 'x', 'd'])
  t.end()
})

test('L.repeat', function (t) {
  t.deepEqual(L.repeat(['a', 'b', 'c'], 3), ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c'])
  t.deepEqual(L.repeat([], 10), [])
  t.end()
})