// create non-hostile environment within node

console.debug = console.log;

window = {}
window.document = document = {
  createElementNS: function () {}
}
window.location = document.location = {
  hash: '',
  href: '',
  search: ''
}

window.localStorage = localStorage = {}
window.sessionStorage = sessionStorage = {}

window.atob = atob = function atob(str) {
  return new Buffer(str, 'base64').toString('utf8')
}

window.btoa = btoa = function btoa(str) {
  return new Buffer(str).toString('base64')
}