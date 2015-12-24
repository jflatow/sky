var test = require('tape')
var UFO = require('../nav/ufo')
var iOS = require('../nav/ios')

var NP = UFO.Nav.prototype;

test('hash', function (t) {
  t.deepEqual({abc: 'xyz'}, NP.fromHash(NP.toHash({abc: 'xyz'}, {})))
  t.notDeepEqual({abc: 'xyz'}, NP.fromHash(NP.toHash({abc: ''}, {})))
  t.end()
})