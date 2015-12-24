// create non-hostile environment within node

window = {}
window.document = document = {
  createElementNS: function () {}
}

atob = function atob(str) {
  return new Buffer(str, 'base64').toString('utf8')
}

btoa = function btoa(str) {
  return new Buffer(str).toString('base64')
}