var env = require('./env') // NB: imports globals for node, not used directly
var abs = Math.abs, min = Math.min, max = Math.max, Rt2 = Math.sqrt(2), Inf = Infinity;
var add = function (p, d) { return isFinite(d) ? p + d : d }
var dfn = function (x, d) { return isNaN(x) ? d : x }
var fnt = function (x, d) { return isFinite(x) ? x : d }
var get = function (a, k, d) { var v = a[k]; return v == undefined ? d : v }
var set = function (a, k, v) { var a = a || {}; a[k] = v; return a }
var pop = function (a, k, d) { var v = get(a, k, d); delete a[k]; return v }
var pre = function (a, k, d) { return a[k] = get(a, k, d) }
var map = function (a, f) { return [].concat(a || []).map(f) }
var each = function (a, f) { return a && a.map ? a.map(f) : f(a, 0) }
var wrap = function (node) {
  if (node)
    switch (node.namespaceURI) {
    case SVGElem.prototype.xmlns: return new SVGElem(node)
    case Elem.prototype.xmlns:
    default: return new Elem(node)
    }
}
var up = function (a, b) {
  for (var k in b)
    a[k] = b[k]
  return a;
}
var util = {
  add: add,
  dfn: dfn,
  fnt: fnt,
  get: get,
  set: set,
  pop: pop,
  pre: pre,
  map: map,
  wrap: wrap,
  update: up,
  copy: function (b) { return up({}, b) },
  clip: function (x, m, M) { return min(max(x, m), M) },
  randInt: function (m, M) { return Math.round((M - m) * Math.random()) + m }
}

var trig = util.trig = {
  rad: function (a) { return Math.PI / 180 * a },
  sin: function (a) { return Math.sin(trig.rad(a)) },
  cos: function (a) { return Math.cos(trig.rad(a)) },
  cut: function (x) { return util.clip(x, -359.999, 359.999) },
  polar: function (r, a) { return [r * trig.cos(a), r * trig.sin(a)] }
}

var path = function (cmd) { return cmd + [].slice.call(arguments, 1) }
var P = up(path, {
  M: function (xy) { return P('M', xy) },
  L: function (xy) { return P('L', xy) },
  join: function () {
    return [].reduce.call(arguments, function (d, a) { return d + P.apply(null, a) }, '')
  },
  line: function (x1, y1, x2, y2, open) {
    var open = open || P.M;
    return open([x1, y1]) + P.L([x2, y2])
  },
  rect: function (x, y, w, h, open) {
    var open = open || P.M;
    var h = dfn(h, w)
    return open([x, y]) + P('H', x + w) + P('V', y + h) + P('H', x) + 'Z';
  },
  border: function (box, t, r, b, l, open) {
    var t = dfn(t, 0), r = dfn(r, t), b = dfn(b, t), l = dfn(l, r)
    with (box) {
      var ix = x + l, iy = y + t, iw = w - l - r, ih = h - t - b;
      return (P.line(x, y, x + w, y, open) + P('v', h) + P('h', -w) + P('v', -h) +
              P.line(ix, iy, ix, iy + ih) + P('h', iw) + P('v', -ih) + P('h', -iw))
    }
  },
  corner: function (x1, y1, x2, y2, rx, ry, vh, iv, open) {
    var open = open || P.M;
    var rx = dfn(rx, 0), ry = dfn(ry, rx), iv = dfn(iv, 0)
    var sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    var dx = sx * rx, dy = sy * ry;
    var sd = vh ^ iv ? +(sx * sy < 0) : +(sx * sy > 0)
    if (vh) {
      var cx = x1 + dx, cy = y2 - dy;
      return open([x1, y1]) + P('v', cy - y1) + P('a', rx, ry, 0, 0, sd, dx, dy) + P('h', x2 - cx)
    } else {
      var cx = x2 - dx, cy = y1 + dy;
      return open([x1, y1]) + P('h', cx - x1) + P('a', rx, ry, 0, 0, sd, dx, dy) + P('v', y2 - cy)
    }
  },
  chevron: function (cx, cy, w, h, t, open) {
    var open = open || P.M;
    var h = dfn(h, 2 * w), g = h / 2;
    var t = dfn(t, w * Rt2 / 5), o = t / Rt2, z = t / abs(Math.sin(Math.atan2(g, w - o)))
    var x = cx - w / 2, y = cy - g + o;
    return open([x, y]) + P('l', o, -o) + P('l', w - o, g) + P('l', o - w, g) + P('l', -o, -o) + P('l', w - z, o - g) + 'z'
  },
  triangle: function (cx, cy, b, h, open) {
    var open = open || P.M;
    var h = dfn(h, b)
    var x = cx - b / 2, y = cy - h / 2;
    return open([x, y]) + P('L', cx, y + h) + P('L', x + b, y) + 'Z';
  },
  arc: function (cx, cy, rx, ry, len, off, open) {
    var open = open || P.M;
    var len = trig.cut(dfn(len, 360)), off = off || 0;
    var ix = cx + rx * trig.cos(off), iy = cy + ry * trig.sin(off)
    var fx = cx + rx * trig.cos(off + len), fy = cy + ry * trig.sin(off + len)
    return (open([ix, iy]) +
            P('A',
              rx, ry, 0,
              abs(len) > 180 ? 1 : 0,
              len > 0 ? 1 : 0,
              fx, fy))
  },
  oval: function (cx, cy, rx, ry, open) {
    var ry = dfn(ry, rx)
    return P.arc(cx, cy, rx, ry, 360, 0, open)
  },
  arch: function (cx, cy, rx, ry, t, len, off, open) {
    var len = trig.cut(dfn(len, 360)), off = off || 0;
    var t = dfn(t, 1)
    return (P.arc(cx, cy, rx, ry, len, off, open) +
            P.arc(cx, cy, rx + t, ry + t, -len, off + len, P.L) + 'Z')
  },
  ring: function (cx, cy, rx, ry, t, open) {
    var t = dfn(t, 1)
    return (P.arc(cx, cy, rx, ry, 360, 0, open) +
            P.arc(cx, cy, rx + t, ry + t, -360, 360))
  },
  wedge: function (cx, cy, rx, ry, len, off, open) {
    var open = open || P.M;
    return open([cx, cy]) + P.arc(cx, cy, rx, ry, len, off, P.L) + 'Z';
  },
  snake: function (x1, y1, x2, y2, vh) {
    if (vh) {
      var my = (y1 + y2) / 2;
      return P('C', x1, my, x2, my, x2, y2)
    } else {
      var mx = (x1 + x2) / 2;
      return P('C', mx, y1, mx, y2, x2, y2)
    }
  }
})

var units = function (o, u) {
  var t = {}
  for (var k in o)
    t[k] = Q.unify(k, o[k], u)
  return t;
}
var Q = up(units, {
  defaults: {
    top: 'px',
    left: 'px',
    right: 'px',
    bottom: 'px',
    width: 'px',
    height: 'px',
    size: 'px', // NB: generalized magnitude
    translate: 'px',
    rotate: 'deg',
    skewX: 'deg',
    skewY: 'deg',
    borderRadius: 'px'
  },
  unify: function (k, v, u) {
    var u = u || Q.defaults, d = u[k] || '';
    return each(v, function (x) { return isFinite(x) ? x + d : x })
  },
  strip: function (k, v, u) {
    var u = u || Q.defaults, d = u[k], n = d && d.length;
    if (d)
      return each(v, function (x) { return x.substr(-n) == d ? parseFloat(x) : x })
    return v;
  },
  each: function (ks, o, u) {
    return each(ks, function (k) { return Q.unify(k, o[k], u) })
  },
  map: function (ks, vs, u) {
    return each(ks, function (k, i) { return Q.unify(k, vs[i], u) })
  },
  rect: function (b, u) {
    return 'rect(' + Q.each(['top', 'right', 'bottom', 'left'], b, u) + ')'
  },
  calc: function (a, o) {
    return 'calc(' + [].concat(a).join(' ' + (o || '-') + ' ') + ')'
  },
  url: function (a) {
    return 'url(' + a + ')'
  }
})

function Box(d, e) {
  this.x = dfn(dfn(d.x, d.left), e ? -Inf : 0)
  this.y = dfn(dfn(d.y, d.top), e ? -Inf : 0)
  this.w = dfn(dfn(d.w, d.width), e ? Inf : 0)
  this.h = dfn(dfn(d.h, d.height), e ? Inf : 0)
}
Box.prototype = {
  constructor: Box,
  get width() { return this.w },
  get height() { return this.h },
  get left() { return this.x },
  get top() { return this.y },
  get midX() { return add(this.x, this.w / 2) },
  get midY() { return add(this.y, this.h / 2) },
  get right() { return add(this.x, this.w) },
  get bottom() { return add(this.y, this.h) },
  grid: function (fun, acc, opts) {
    var o = up({rows: 1, cols: 1}, opts)
    var r = o.rows, c = o.cols;
    var x = this.x, y = this.y, w = this.w / c, h = this.h / r;
    var z = new Box({x: x, y: y, w: w, h: h})
    for (var i = 0, n = 0; i < r; i++)
      for (var j = 0; j < c; j++, n++)
        acc = fun.call(this, acc, z.shift(w * j, h * i), i, j, n, z)
    return acc;
  },
  join: function (boxs) {
    var boxs = [].concat(boxs)
    var bnds = boxs.reduce(function (a, b) {
      return {x: min(a.x, b.x), y: min(a.y, b.y), right: max(a.right, b.right), bottom: max(a.bottom, b.bottom)}
    }, this)
    return new Box({x: bnds.x, y: bnds.y, w: bnds.right - bnds.x, h: bnds.bottom - bnds.y})
  },
  tile: function (fun, acc, opts) {
    return this.grid(fun, acc, this.shape(opts && opts.unit))
  },
  shape: function (box) {
    var u = box || this;
    return {rows: this.h / u.h, cols: this.w / u.w}
  },
  stack: function (fun, acc, opts) {
    return this.times(opts).grid(fun, acc, opts)
  },
  times: function (shape) {
    var s = up({rows: 1, cols: 1}, shape)
    return this.copy({w: s.cols * this.w, h: s.rows * this.h})
  },
  over: function (shape) {
    var s = up({rows: 1, cols: 1}, shape)
    return this.copy({w: this.w / s.cols, h: this.h / s.rows})
  },
  split: function (opts) {
    return this.grid(function (acc, box) { return acc.push(box), acc }, [], opts)
  },
  align: function (box, ax, ay) {
    var nx = (ax || 0) / 2, ny = (ay || 0) / 2, ox = nx + .5, oy = ny + .5;
    var x = box.midX + nx * box.w - ox * this.w;
    var y = box.midY + ny * box.h - oy * this.h;
    return this.copy({x: x, y: y})
  },
  center: function (cx, cy) {
    return this.copy({x: (cx || 0) - this.w / 2, y: (cy || 0) - this.h / 2})
  },
  xy: function (x, y) {
    return this.copy({x: x || 0, y: y || 0})
  },
  scale: function (a, b) {
    var w = a * this.w, h = dfn(b, a) * this.h;
    return new Box({x: this.midX - w / 2, y: this.midY - h / 2, w: w, h: h})
  },
  shift: function (dx, dy) {
    return this.copy({x: this.x + (dx || 0), y: this.y + (dy || 0)})
  },
  square: function (big) {
    var o = big ? max : min, d = o(this.w, this.h)
    return this.copy({w: d, h: d})
  },
  slice: function (ps, hzn) {
    var d = hzn ? this.w : this.h, ps = [].concat(ps)
    var f = 1 - ps.reduce(function (s, p) { return isFinite(p) ? s + p : s }, 0) / d;
    return this.part(ps.map(function (p) {
      var pct = typeof(p) == 'string' && p[p.length - 1] == '%';
      return pct ? f * parseFloat(p.slice(0, -1)) / 100 : p / d;
    }), hzn)
  },
  part: function (ps, hzn) {
    var b = this, ko = hzn ? 'x' : 'y', kd = hzn ? 'w' : 'h';
    var o = b[ko], u = {}, s = 0, ps = [].concat(ps, undefined)
    return ps.map(function (p) {
      u[ko] = (o += u[kd] || 0)
      u[kd] = dfn(p, 1 - s) * b[kd]
      s += p;
      return b.copy(u)
    })
  },
  pad: function (t, r, b, l) {
    return this.trim(-t, -r, -b, -l)
  },
  trim: function (t, r, b, l) {
    var t = dfn(t, 0), r = dfn(r, t), b = dfn(b, t), l = dfn(l, r)
    return new Box({x: this.x + l, y: this.y + t, w: this.w - r - l, h: this.h - t - b})
  },
  copy: function (o) {
    var o = o || {}, ow = dfn(o.w, o.width), oh = dfn(o.h, o.height)
    with (this)
      return new Box({x: dfn(o.x, x), y: dfn(o.y, y), w: dfn(ow, w), h: dfn(oh, h)})
  },
  equals: function (o) {
    var o = o || {}, ow = dfn(o.w, o.width), oh = dfn(o.h, o.height)
    with (this)
      return x == dfn(o.x, 0) && y == dfn(o.y, 0) && w == dfn(ow, 0) && h == dfn(oh, 0)
  },
  toString: function () { with (this) return x + ',' + y + ',' + w + ',' + h }
}
Box.solve = function (opts) {
  var o = up({}, opts)
  var b = o.bbox, s = o.shape, u = o.unit;
  if (b && s)
    return up(o, {shape: up({rows: 1, cols: 1}, s), unit: b.over(s)})
  if (u && s)
    return up(o, {shape: up({rows: 1, cols: 1}, s), bbox: u.times(s)})
  if (b && u)
    return up(o, {shape: b.shape(u), unit: u.copy({x: b.x, y: b.y})})
}

function RGB(d) { up(this, d) }
RGB.mix = function (x, opts) {
  var o = up({min: 0, max: 100, lo: {b: 100}, hi: {r: 100}}, opts)
  var m = o.min, M = o.max, lo = o.lo, hi = o.hi;
  function w(a, b) { return ((b || 0) * max(x - m, 0) + (a || 0) * max(M - x, 0)) / (M - m) }
  function i(a, b) { return Math.round(w(a, b)) }
  if (lo.a == undefined && hi.a == undefined)
    return new RGB({r: i(lo.r, hi.r), g: i(lo.g, hi.g), b: i(lo.b, hi.b)})
  return new RGB({r: i(lo.r, hi.r), g: i(lo.g, hi.g), b: i(lo.b, hi.b), a: w(lo.a, hi.a)})
}
RGB.random = function () {
  return new RGB({r: util.randInt(0, 255), g: util.randInt(0, 255), b: util.randInt(0, 255)})
}
RGB.prototype.update = function (obj) { return up(this, obj) }
RGB.prototype.update({
  alpha: function (a) { return a == undefined ? this : this.update({a: a}) },
  shift: function (x) {
    function w(v) { return util.clip(v + x, 0, 255) }
    return (new RGB({r: w(this.r || 0), g: w(this.g || 0), b: w(this.b || 0)})).alpha(this.a)
  },
  toString: function () {
    if (this.a == undefined)
      return 'rgb(' + (this.r || 0) + ',' + (this.g || 0) + ',' + (this.b || 0) + ')';
    return 'rgba(' + (this.r || 0) + ',' + (this.g || 0) + ',' + (this.b || 0) + ',' + this.a + ')';
  }
})

function elem(e, a, p, d) { return new Elem(e, a, p, d) }
function Elem(elem, attrs, props, doc) {
  this.node = elem && elem.nodeType ? elem : (doc || document).createElementNS(this.xmlns, elem)
  this.attrs(attrs)
  this.props(props)
}
Elem.prototype.update = function (obj) { return up(this, obj) }
Elem.prototype.update({
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/1999/xhtml",
  addTo: function (parent) {
    return (parent.node || parent).appendChild(this.node), this;
  },
  append: function (child) {
    return child.addTo(this), this;
  },
  before: function (other) {
    if (other)
      other.node.parentNode.insertBefore(this.node, other.node)
    return this;
  },
  child: function (elem, attrs, props) {
    return new this.constructor(elem, attrs, props).addTo(this)
  },
  clear: function () {
    var n = this.node;
    while (n.firstChild)
      n.removeChild(n.firstChild)
    return this;
  },
  order: function (k) {
    var n = this.node, p = n.parentNode, C = p.childNodes.length;
    p.insertBefore(n, p.childNodes[util.clip(k < 0 ? C + k : k, 0, C)])
    return this;
  },
  remove: function (b) {
    var n = this.node, p = n.parentNode;
    if (p && dfn(b, true))
      p.removeChild(n)
    return this;
  },

  $: function (q) {
    return wrap(typeof(q) == 'string' ? this.node.querySelector(q) : q)
  },
  doc: function () {
    return this.node.ownerDocument ? new Elem(this.node.ownerDocument) : this;
  },
  each: function (sel, fun, acc) {
    for (var Q = this.node.querySelectorAll(sel), i = 0; i < Q.length; i++)
      acc = fun(Q[i], acc, i, Q)
    return acc;
  },
  fold: function (fun, acc) {
    for (var c = this.node.firstElementChild, i = 0; c; c = c.nextSibling)
      acc = fun(acc, c, i++)
    return acc;
  },
  nth: function (n) {
    var c = this.node.children, C = c.length;
    return wrap(c[n < 0 ? C + n : n])
  },
  parent: function () {
    return wrap(this.node.parentNode)
  },
  root: function () {
    for (var n = this.node; n.parentNode; n = n.parentNode) {}
    return n;
  },
  attached: function (o) {
    return this.root() == (o ? o.root() : this.doc().node)
  },
  detached: function (o) {
    return !this.attached(o)
  },
  unique: function (q, fun) {
    return this.$(q) || fun(this)
  },

  hide: function (b) { return this.attrs({hidden: dfn(b, true) ? '' : null}) },
  show: function (b) { return this.attrs({hidden: dfn(b, true) ? null : ''}) },
  activate: function (b) { return this.instate(b, 'activated') },
  collapse: function (b) { return this.instate(b, 'collapsed') },
  validate: function (b) {
    var n = this.node, v;
    if (n.checkValidity) {
      if (v = !n.checkValidity())
        b = false;
      this.instate(v, 'invalidated')
    }
    return this.fold(function (a, c) { return Sky.elem(c).validate(a) && a }, dfn(b, true))
  },
  instate: function (b, c, d) {
    var b = dfn(b, true)
    return this.toggleClass(c, b).fire(c, up({value: b}, d))
  },

  attr: function (name, ns) {
    return this.node.getAttributeNS(ns || null, name)
  },
  attrs: function (attrs, ns) {
    for (var k in attrs) {
      var v = attrs[k]
      if (v == null)
        this.node.removeAttributeNS(ns || null, k)
      else
        this.node.setAttributeNS(ns || null, k, v)
    }
    return this;
  },
  props: function (props) {
    for (var k in props)
      this.node[k] = props[k]
    return this;
  },
  style: function (attrs) {
    for (var k in attrs)
      this.node.style[k] = attrs[k]
    return this;
  },

  href: function (href) {
    return this.attrs({href: href})
  },
  space: function (space) {
    return this.attrs({space: space}, this.xml)
  },
  txt: function (text, order) {
    if (isFinite(order))
      return elem(this.doc().node.createTextNode(text)).addTo(this).order(order), this;
    return this.props({textContent: text})
  },
  uid: function () {
    var id = (new Date - 0) + Math.random() + ''
    return this.attrs({id: id}), id;
  },
  url: function () {
    return Q.url('#' + (this.attr('id') || this.uid()))
  },

  addClass: function (cls) {
    var node = this.node;
    map(cls, function (c) { node.classList.add(c) })
    return this;
  },
  hasClass: function (cls) {
    return this.node.classList.contains(cls)
  },
  removeClass: function (cls) {
    var node = this.node;
    map(cls, function (c) { node.classList.remove(c) })
    return this;
  },
  toggleClass: function (cls, b) {
    var node = this.node;
    map(cls, function (c) { node.classList.toggle(c, b) })
    return this;
  },
  css: function (k) {
    var css = getComputedStyle(this.node)
    return k ? css[k] : css;
  },
  addRules: function (rules) {
    var i = 0, sheet = this.node.sheet;
    var rec = function (sel, rule, str) {
      var str = str || ''
      for (var property in rule) {
        if (sel.match(/^@/))
          str += property + '{' + rec(property, rule[property]) + '}'
        else
          str += property + ': ' + rule[property] + ';'
      }
      return str;
    }
    for (var selector in rules)
      try {
        sheet.insertRule(selector + '{' + rec(selector, rules[selector]) + '}', i++)
      } catch (e) { console.error(e) }
    return i;
  },

  animate: function (fun, n) {
    var self = this, i = 0;
    var anim = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
    anim(function () {
      if (fun.call(self, self.node, i++) || i < n)
        anim(arguments.callee)
    })
    return this;
  },
  apply: function (a) {
    if (a instanceof Function)
      return a(this)
    if (typeof(a) == 'string')
      return this.txt(a)
    return this[a[0]].apply(this, a.slice(1))
  },
  bind: function (name) {
    var fun = this[name]
    return fun.bind.apply(fun, [this].concat([].slice.call(arguments, 1)))
  },
  map: function (l, f) {
    return map(f ? map(l, [].concat.bind([f])) : l, this.apply.bind(this))
  },

  fire: function (type, data, opts) {
    this.node.dispatchEvent(new CustomEvent(type, up({detail: data}, opts)))
    return this;
  },
  on: function (types, fun, capture) {
    var node = this.node;
    types.split(/\s+/).map(function (type) {
      node.addEventListener(type, fun, capture)
    })
    return this;
  },
  off: function (types, fun, capture) {
    var node = this.node;
    types.split(/\s+/).map(function (type) {
      node.removeEventListener(type, fun, capture)
    })
    return this;
  },
  upon: function (types, fun, capture) {
    var self = this, f = function (e) { return fun.call(self, get(e.detail || {}, 'value'), e) }
    return this.on(types, f, capture)
  },
  once: function (types, fun, capture) {
    var n = 0;
    return this.til(types, fun, function () { return n++ }, capture)
  },
  til: function (types, fun, dead, capture) {
    var self = this;
    self.on(types, function () {
      if (dead())
        self.off(types, arguments.callee)
      else
        fun.apply(this, arguments)
    }, capture)
  },

  a: function (attrs, props) {
    return this.child('a', attrs, props)
  },
  p: function (attrs, props) {
    return this.child('p', attrs, props)
  },
  div: function (attrs, props) {
    return this.child('div', attrs, props)
  },
  span: function (attrs, props) {
    return this.child('span', attrs, props)
  },
  hl: function (text, level) {
    return this.child('h' + (level || 1)).txt(text)
  },
  li: function (text) {
    return this.child('li').txt(text)
  },
  link: function (href) {
    return this.a().href(href)
  },
  para: function (text) {
    return this.p().txt(text)
  },

  svg: function (attrs, props) {
    return svg(attrs, props).addTo(this)
  },
  g: function (attrs, props) {
    return this.div(attrs, props)
  },
  q: function (cls) {
    return this.unique('.' + cls, function (p) { return p.g({class: cls}) })
  },
  icon: function (href, w, h, u) {
    return this.svg({class: 'icon'}).icon(href).parent().size(w, h, u)
  },
  image: function (href, w, h, u) {
    return this.child('img', {class: 'image'}).attrs({src: href}).size(w, h, u)
  },
  circle: function (cx, cy, r, u) {
    return this.div({class: 'circle'}).xywh(cx - r, cy - r, 2 * r, 2 * r, u).style(Q({borderRadius: r}, u))
  },
  ellipse: function (cx, cy, rx, ry, u) {
    return this.div({class: 'ellipse'}).xywh(cx - rx, cy - ry, 2 * rx, 2 * ry, u).style({borderRadius: Q.unify('borderRadius', [rx, ry], u).join(' / ')})
  },
  rect: function (x, y, w, h, u) {
    return this.div({class: 'rect'}).xywh(x, y, w, h, u)
  },
  text: function (text) {
    return this.span({class: 'text'}).txt(text)
  },

  svgX: function (box, u) {
    return this.svg({viewBox: box}).embox(box, u)
  },
  iconX: function (box, href, u) {
    with (box || this.bbox())
      return this.icon(href, w, h, u).place(x, y, u)
  },
  imageX: function (box, href, u) {
    with (box || this.bbox())
      return this.image(x, y, w, h, href, u)
  },
  circleX: function (box, p, big, u) {
    var o = big ? max : min;
    with (box || this.bbox())
      return this.circle(midX, midY, dfn(p, 1) * o(w, h) / 2, u)
  },
  ellipseX: function (box, px, py, u) {
    with (box || this.bbox())
      return this.ellipse(midX, midY, dfn(px, 1) * w / 2, dfn(py, 1) * h / 2, u)
  },
  rectX: function (box, u) {
    with (box || this.bbox())
      return this.rect(x, y, w, h, u)
  },
  textX: function (box, text, ax, ay, u) {
    return this.text(text).align(box || this.bbox(), ax, ay, u).anchor(ax, ay)
  },

  flex: function (ps, hzn, u) {
    return (ps || []).reduce(function (r, p) {
      var f, q;
      if (p == 'fit' || p == null)
        f = '0 0 auto'
      else if ((q = Q.unify('size', p, u)).substr(-1) == '%')
        f = '1 1 ' + q;
      else
        f = '0 0 ' + q;
      return r.g().style({flex: f}), r;
    }, this.style({display: 'flex', flexDirection: hzn ? 'row' : 'column'}))
  },
  row: function (ps, u) {
    return this.g({class: 'row'}).flex(ps, true, u)
  },
  col: function (ps, u) {
    return this.g({class: 'col'}).flex(ps, false, u)
  },

  bbox: function (fixed) {
    var box = new Box(this.node.getBoundingClientRect())
    return fixed ? box : box.shift(pageXOffset, pageYOffset)
  },

  wh: function (w, h, u) {
    return this.style(Q({width: w, height: h}, u))
  },
  xy: function (x, y, u) {
    return this.style(Q({left: x, top: y, position: 'absolute'}, u))
  },
  xywh: function (x, y, w, h, u) {
    return this.style(Q({left: x, top: y, width: w, height: h, position: 'absolute'}, u))
  },

  size: function (w, h, u) {
    return this.parent().wh.call(this, w, h, u)
  },
  place: function (x, y, u) {
    return this.parent().xy.call(this, x, y, u)
  },
  cover: function (x, y, w, h, u) {
    return this.parent().xywh.call(this, x, y, w, h, u)
  },

  align: function (box, ax, ay, u) {
    with (Sky.box().align(box, ax, ay))
      return this.place(x, y, u)
  },
  embox: function (box, u) {
    with (box)
      return this.cover(x, y, w, h, u)
  },

  anchor: function (i, j) {
    var a = -((i || 0) + 1) * 50;
    var b = -((j || 0) + 1) * 50;
    return this.transform({translate: [a + '%', b + '%']})
  },
  hang: function (ax, ay, u) {
    return this.align(Sky.box(0, 0, 100, 100), ax, ay, up({top: '%', left: '%'}, u)).anchor(ax, ay)
  },

  screen: function (x, y) {
    return {x: x, y: y}
  },
  shift: function (dx, dy) {
    var x = this.transformation(), t = x.translate = x.translate || [0, 0]
    t[0] += dx || 0;
    t[1] += dy || 0;
    return this.transform(x)
  },

  transform: function (desc, u) {
    var xform = []
    for (var k in desc)
      xform.push(k + '(' + Q.unify(k, [].concat(desc[k]), u).join(',') + ')')
    xform = xform.join(' ')
    return this.style({transform: xform})
  },
  transformation: function (val, u) {
    var val = val || this.node.style.transform || '';
    var m, p = /(\w+)\(([^\)]*)\)/g, tx = {}
    while (m = p.exec(val)) {
      var k = m[1], v = m[2].split(',')
      tx[k] = Q.strip(k, v, u)
    }
    return tx;
  },

  load: function (json) {
    var n = this.node, t = n.type, json = n.name && json ? json[n.name] : json;
    if (json !== undefined) {
      if (t == 'button' || t == 'reset' || t == 'submit')
        return this;
      else if (t == 'select-one' || t == 'select-multiple')
        this.each('option', function (o) {
          if ([].some.call([].concat(json), function (v) { return v == o.value }))
            o.selected = true;
        })
      else if (t == 'fieldset')
        this.each('input', function (i) {
          if ([].some.call([].concat(json), function (v) { return v == i.value }))
            i.checked = true;
        })
      else if (t == 'checkbox' || t == 'radio')
        n.checked = isFinite(json) ? json : json == n.value;
      else if (n.value !== undefined)
        n.value = json || ''
      else if (n.childElementCount)
        this.fold(function (_, c) {
          Sky.elem(c).load(c.name && json ? json[c.name] : json)
        })
    }
    return this;
  },

  dump: function (json) {
    var n = this.node, t = n.type, p;
    if (t == 'button' || t == 'reset' || t == 'submit')
      return json;
    else if (t == 'select-one')
      p = this.each('option', function (o, v) {
        return (o.selected) ? o.value : v;
      }, null)
    else if (t == 'select-multiple')
      p = this.each('option', function (o, l) {
        return (o.selected && l.push(o.value)), l;
      }, [])
    else if (t == 'fieldset' && n.querySelector('[type="radio"]'))
      p = this.each('input', function (i, v) {
        return (i.checked) ? i.value : v;
      }, null)
    else if (t == 'fieldset')
      p = this.each('input', function (i, l) {
        return (i.checked && l.push(i.value)), l;
      }, [])
    else if (t == 'checkbox' || t == 'radio')
      p = n.checked;
    else if (t == 'number' || t == 'range')
      p = dfn(n.valueAsNumber, null)
    else
      p = n.value;
    if (p !== undefined)
      return n.name ? set(json, n.name, p) : p;
    if (n.childElementCount)
      this.fold(function (o, c) {
        return Sky.elem(c).dump(o)
      }, n.name ? pre(json = json || {}, n.name, {}) : json)
    return json;
  },

  form: function (attrs, props) {
    return this.child('form', attrs, props)
  },
  label: function (text) {
    return this.child('label').txt(text)
  },
  button: function (desc, props) {
    var desc = up({}, desc)
    var icon = pop(desc, 'icon')
    var label = pop(desc, 'label', '')
    var action = pop(desc, 'action', function () {})
    var elem = this.child('button', desc, props)
    if (icon)
      elem.icon.apply(elem, [].concat(icon))
    if (icon && label)
      elem.text(label);
    else if (label)
      elem.txt(label)
    return elem.on('click', action.bind(elem))
  },
  input: function (desc, props) {
    var desc = up({}, desc)
    var label = pop(desc, 'label')
    var elem = label ? this.label(label) : this;
    return elem.child('input', desc, props)
  },
  output: function (desc, props) {
    var desc = up({}, desc)
    var label = pop(desc, 'label')
    var elem = label ? this.label(label) : this;
    return elem.child('output', desc, props)
  },
  fieldset: function (desc) {
    var desc = up({}, desc)
    var options = pop(desc, 'options', [])
    return options.reduce(function (s, d) {
      var d = [].concat(d)
      return s.input(up(desc, {value: d[0], label: d[1] || d[0]})), s;
    }, this.child('fieldset', {name: desc.name}))
  },
  option: function (value, text) {
    return this.child('option', {value: value}).txt(text || value)
  },
  options: function (desc) {
    if (desc instanceof Array)
      this.map(desc, 'option')
    else if (desc instanceof Object)
      for (var k in desc)
        this.child('optgroup', {label: k}).map(desc[k], 'option')
    return this;
  },
  select: function (desc, props) {
    var desc = up({}, desc)
    var label = pop(desc, 'label')
    var options = pop(desc, 'options')
    var elem = label ? this.label(label) : this;
    return elem.child('select', desc, props).options(options)
  },
  textarea: function (desc, props) {
    var desc = up({}, desc)
    var label = pop(desc, 'label')
    var elem = label ? this.label(label) : this;
    return elem.child('textarea', desc, props)
  }
})

function svg(a, p, d) { return new SVGElem('svg', a, p, d) }
function SVGElem() {
  Elem.apply(this, arguments)
}
SVGElem.prototype = new Elem().update({
  constructor: SVGElem,
  xmlns: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
  svg: function (attrs, props) {
    return this.child('svg', attrs, props)
  },
  circle: function (cx, cy, r) {
    return this.child('circle', {cx: cx, cy: cy, r: r})
  },
  ellipse: function (cx, cy, rx, ry) {
    return this.child('ellipse', {cx: cx, cy: cy, rx: rx, ry: ry})
  },
  line: function (x1, y1, x2, y2) {
    return this.child('line', {x1: x1, y1: y1, x2: x2, y2: y2})
  },
  path: function (d) {
    return this.child('path', d && {d: d})
  },
  polyline: function (points) {
    return this.child('polyline', {points: points})
  },
  polygon: function (points) {
    return this.child('polygon', {points: points})
  },
  rect: function (x, y, w, h) {
    return this.child('rect', {x: x, y: y, width: w, height: h})
  },
  text: function (text) {
    return this.child('text', {}, {textContent: text})
  },
  tspan: function (text) {
    return this.child('tspan', {}, {textContent: text})
  },
  g: function (attrs, props) {
    return this.child('g', attrs, props)
  },
  icon: function (href, w, h) {
    return this.use(href).wh(w, h)
  },
  image: function (href, w, h) {
    return this.child('image').href(href).wh(w, h)
  },
  use: function (href) {
    return this.child('use').href(href)
  },
  mask: function (attrs, props) {
    return this.child('mask', attrs, props)
  },
  clipPath: function (attrs, props) {
    return this.child('clipPath', attrs, props)
  },
  symbol: function (attrs, props) {
    return this.child('symbol', attrs, props)
  },

  border: function (t, r, b, l, box) {
    return this.path(P.border(box || this.bbox(), t, r, b, l))
  },

  anchor: function (i, j) {
    var a = i < 0 ? 'start' : (i > 0 ? 'end' : 'middle')
    var b = j < 0 ? 'hanging' : (j > 0 ? 'alphabetic' : 'central')
    return this.attrs({'text-anchor': a, 'dominant-baseline': b})
  },
  bbox: function () {
    return new Box(this.node.getBBox())
  },
  enc: function () {
    return this.node.tagName == 'svg' ? this : new SVGElem(this.node.ownerSVGElement)
  },
  fit: function () {
    return this.enc().attrs({viewBox: this.bbox()})
  },
  href: function (href) {
    return this.attrs({href: href}, this.xlink)
  },
  wh: function (w, h) {
    return this.attrs({width: w, height: h})
  },
  xy: function (x, y) {
    return this.attrs({x: x, y: y})
  },
  xywh: function (x, y, w, h) {
    return this.attrs({x: x, y: y, width: w, height: h})
  },
  point: function (x, y) {
    var p = this.enc().node.createSVGPoint()
    p.x = x;
    p.y = y;
    return p;
  },
  screen: function (x, y) {
    return this.point(x, y).matrixTransform(this.node.getScreenCTM())
  },

  transform: function (desc) {
    var xform = []
    for (var k in desc)
      xform.push(k + '(' + [].concat(desc[k]).join(',') + ')')
    return this.attrs({transform: xform.join(' ')})
  },
  transformation: function (list) {
    var tx = {}, list = list || this.node.transform.baseVal;
    for (var i = 0; i < list.numberOfItems; i++) {
      var t = list.getItem(i), m = t.matrix;
      if (t.type == SVGTransform.SVG_TRANSFORM_MATRIX)
        tx.matrix = [m.a, m.b, m.c, m.d, m.e, m.f]
      else if (t.type == SVGTransform.SVG_TRANSFORM_TRANSLATE)
        tx.translate = [m.e, m.f]
      else if (t.type == SVGTransform.SVG_TRANSFORM_SCALE)
        tx.scale = [m.a, m.d]
      else if (t.type == SVGTransform.SVG_TRANSFORM_ROTATE)
        tx.rotate = [t.angle, (m.f / m.c + m.e) / m.a, (m.e / m.b - m.f) / m.a]
      else if (t.type == SVGTransform.SVG_TRANSFORM_SKEWX)
        tx.skewX = t.angle;
      else if (t.type == SVGTransform.SVG_TRANSFORM_SKEWY)
        tx.skewY = t.angle;
    }
    return tx;
  }
})

var Sky = module.exports = {
  $: function (q) { return new Elem(document).$(q) },
  box: function (x, y, w, h) { return new Box({x: x, y: y, w: w, h: h}) },
  rgb: function (r, g, b, a) { return new RGB({r: r, g: g, b: b, a: a}) },
  elem: elem,
  svg: svg,
  util: util,
  path: path,
  units: units,
  Box: Box,
  RGB: RGB,
  Elem: Elem,
  SVGElem: SVGElem
}
