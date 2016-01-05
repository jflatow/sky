var test = require('tape')
var Sky = require('../sky')

var U = Sky.util;

test('util', function (t) {
  t.equal(U.dfn(0, 1), 0)
  t.equal(U.dfn(null, 1), null)
  t.equal(U.dfn(undefined, 1), 1)
  t.equal(U.dfn(0 / 0, 1), 1)
  t.equal(U.fnt(0 / 0, 1), 1)
  t.end()
})
