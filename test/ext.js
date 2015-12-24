var test = require('tape')
var Geo = require('../ext/geo')
var Orb = require('../ext/orb')

test('cat', function (t) {
  Orb.do(t, 'ok', [true])
  t.end()
})