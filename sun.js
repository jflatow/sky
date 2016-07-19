var cp = function (o) {
  if (o instanceof Array)
    return o.slice()
  if (o instanceof Object)
    return up({}, o)
  return o;
}
var up = function (a, b) {
  for (var k in b)
    a[k] = b[k]
  return a;
}
var ext = function (a, b) { return up(Object.create(a), b) }
var cat = function (a, b) { return b ? [].concat(a, b) : a }
var cmp = function (a, b) {
  if (a instanceof Array && b instanceof Array)
    return L.cmp(a, b)
  return (a == b) ? 0 : (a < b || a == undefined) ? -1 : +1;
}
var def = function (x, d) { return x == undefined ? d : x }
var int = function (x) { return parseInt(x, 10) }
var sgn = function (x) { return x < 0 ? -1 : 1 }
var pow = function (x, a) { return sgn(x) * Math.pow(Math.abs(x), a || 2) }
var add = function (x, y) { return x + y }
var max = function (x, y) { return x > y ? x : y }
var min = function (x, y) { return x < y ? x : y }
var mod = function (x, y) {
  var r = x % y;
  return r < 0 ? r + y : r;
}
var nil = function (x) {
  if (x instanceof Array)
    return []
  if (x instanceof Object)
    return {}
  if (typeof(x) == 'string')
    return ''
  if (typeof(x) == 'number')
    return 0;
}
var pad = function (s, opt) {
  var s = s + '', w = opt && opt.width || 2, p = opt && opt.pad || '0';
  while (s.length < w)
    s = p + s;
  return s;
}
var nchoosek = function (n, k) {
  var c = 1, d = 1;
  for (var i = n; i > k; i--) {
    c *= i;
    d *= n - i + 1;
  }
  return c / d;
}
var bezier = function (t, P) {
  var n = P.length - 1, x = 0, y = 0;
  for (i = 0; i <= n; i++) {
    var p = P[i], w = nchoosek(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i)
    x += w * (p[0] || 0)
    y += w * (p[1] || 0)
  }
  return [x, y]
}

var equals = function (a, b) {
  if (a === b)
    return true;
  if (typeof(a) != 'object' || typeof(b) != 'object')
    return def(a) === def(b)
  if (a && b) {
    for (var k in a)
      if (!equals(a[k], b[k]))
        return false;
    for (var k in b)
      if (!equals(b[k], a[k]))
        return false;
    return true;
  }
  return false;
}

var match = function (a, b) {
  return (b instanceof Function) ? b(a) : equals(a, b)
}

var key = function (i, k) {
  if (k instanceof Function)
    return k(i)
  if (k != undefined)
    return i[k]
  if (i instanceof Array)
    return i[0]
  return i;
}

var val = function (i, v) {
  if (v instanceof Function)
    return v(i)
  if (v != undefined)
    return i[v]
  if (i instanceof Array && i.length == 2)
    return i[1]
  return i;
}

var keyEquate = function (K, k) {
  return function (i) {
    return equals(key(i, k), K)
  }
}

var find = function (o, f) {
  for (var k in o)
    if (f(o[k]))
      return k;
}

var first = function (o, f, t) {
  for (var k in o) {
    var v = o[k], v_ = f(v)
    if (v_)
      return t ? v_ : v;
  }
}

var fold = function (f, a, o) {
  if (o instanceof Array)
    return o.reduce(f, a)
  for (var ks = Object.keys(def(o, {})), i = 0, k = ks[i]; i < ks.length; k = ks[++i])
    a = f(a, [k, o[k]], k, o)
  return a;
}

var map = function (o, f) {
  return fold(function (a, i, k) { return a.push(f(i, k, o)), a }, [], o)
}

var all = function (o, f) {
  var f = f || function (x) { return !!x }
  return fold(function (a, i, k) { return a && f(i, k) }, true, o)
}

var any = function (o, f) {
  var f = f || function (x) { return !!x }
  return fold(function (a, i, k) { return a || f(i, k) }, false, o)
}

var get = function (o, k) {
  if (o instanceof Array)
    return val(first(o, keyEquate(k)))
  return o[k]
}

var has = function (o, k) {
  if (o instanceof Array)
    return any(o, keyEquate(k))
  return o && k in o;
}

var set = function (o, k, v) {
  if (o instanceof Array)
    return L.store(o, [k, v], find(o, keyEquate(k)))
  else
    o[k] = v;
  return o;
}

var del = function (o, k) {
  if (o instanceof Array)
    return L.purge(o, keyEquate(k))
  else
    delete o[k]
  return o;
}

var pop = function (o, k) {
  var v = get(o, k)
  return del(o, k), v;
}

var Sun = module.exports = {
  cp: cp,
  up: up,
  ext: ext,
  cat: cat,
  cmp: cmp,
  def: def,
  int: int,
  sgn: sgn,
  pow: pow,
  add: add,
  max: max,
  min: min,
  mod: mod,
  nil: nil,
  pad: pad,
  nchoosek: nchoosek,
  bezier: bezier,
  equals: equals,
  match: match,
  key: key,
  val: val,
  keyEquate: keyEquate,
  find: find,
  first: first,
  fold: fold,
  map: map,
  all: all,
  any: any,
  get: get,
  has: has,
  set: set,
  del: del,
  pop: pop,

  lte: function (x, y) { return cmp(x, y) <= 0 },
  lt: function (x, y) { return cmp(x, y) < 0 },
  gte: function (x, y) { return cmp(x, y) >= 0 },
  gt: function (x, y) { return cmp(x, y) > 0 },

  clockDistance: function (a, b, c) {
    return min(mod(a - b, c || 24), mod(b - a, c || 24))
  },

  format: function (fmt, arg) {
    return fmt.replace(/{(.*?)}/g, function (m, k) { return k in arg ? arg[k] : m })
  },

  count: function (fun, acc, opt) {
    var o = up({start: 0, step: 1, stop: isFinite(opt) ? opt : undefined}, opt)
    var f = o.start + o.step >= o.start;
    for (var i = o.start; f ? i < o.stop : i > o.stop; i += o.step)
      acc = fun(acc, i, o)
    return acc;
  },

  lookup: function (obj, path) {
    if (path.length == 1)
      return get(def(obj, {}), path[0])
    if (path.length)
      return Sun.lookup(get(def(obj, {}), path[0]), path.slice(1))
    return obj;
  },

  modify: function (obj, path, val, empty) {
    var empty = def(nil(empty), {})
    var fun = (val instanceof Function) ? val : function () { return val }
    var o = def(obj, empty)
    if (path.length == 1)
      return set(o, path[0], fun(get(o, path[0])))
    if (path.length)
      return set(o, path[0], Sun.modify(get(o, path[0]), path.slice(1), fun, empty))
    return fun(obj)
  },

  remove: function (obj, path) {
    if (path.length == 1)
      return del(def(obj, {}), path[0])
    else if (path.length)
      return set(obj, path[0], Sun.remove(get(obj, path[0]), path.slice(1)))
    return nil(obj)
  },

  accrue: function (obj, path, change, op) {
    var op = def(op, Sun.op)
    return Sun.modify(obj, path, function (v) { return op(v, change) })
  },

  create: function (obj, path, initial) {
    return Sun.swap(obj, path, initial, function (v) { return v === undefined })
  },

  swap: function (obj, path, swap, cmp) {
    var val = Sun.lookup(obj, path)
    if (match(val, def(cmp, function (v) { return v !== undefined })))
      return Sun.modify(obj, path, swap)
    return obj;
  },

  prepend: function (obj, path, pre) {
    return Sun.modify(obj, path, function (v) { return cat(pre, v) })
  },

  either: function (alts) {
    return first(alts, function (a) { return Sun.lookup(a[0], a[1]) }, true)
  },

  object: function (iter) {
    return fold(function (a, i) { return (a[i[0]] = i[1]), a }, {}, iter)
  },

  insert: function (obj, item) {
    if (!(obj instanceof Array) || (item instanceof Array))
      return set(obj, key(item), val(item))
    return L.insert(obj, item)
  },

  update: function (obj, iter) {
    return fold(Sun.insert, obj || nil(iter), iter)
  },

  except: function (obj, iter) {
    return Sun.filter(obj, function (i) { return !has(iter, key(i)) })
  },

  filter: function (obj, fun) {
    return fold(function (a, i) {
      if (fun(i))
        Sun.insert(a, i)
      return a;
    }, nil(obj), obj)
  },

  select: function (obj, iter) {
    return fold(function (a, i) {
      var k = key(i)
      if (has(obj, k))
        set(a, k, get(obj, k))
      return a;
    }, nil(obj), iter)
  },

  values: function (iter) {
    return fold(function (a, i) { return L.append(a, val(i)) }, [], iter)
  },

  repeat: function (fun, every) {
    return fun() || setTimeout(function () {
      fun() || setTimeout(arguments.callee, every)
    }, every)
  },
  throttle: function (fun, every, T) {
    return function () {
      clearTimeout(T)
      T = setTimeout(fun.bind.apply(fun, L.concat(this, arguments)), every)
    }
  }
}

var O = Sun.op = up(function (value, change) {
  return O[change[0]](value, change[1])
}, {
  '+': function (v, d) {
    var v = def(v, nil(d))
    return (d instanceof Object) ? Sun.update(v, d) : v + d;
  },
  '-': function (v, d) {
    var v = def(v, nil(d))
    return (d instanceof Object) ? Sun.except(v, d) : v - d;
  },
  '=': function (v, d) {
    return d;
  },
  update: Sun.update,
  except: Sun.except,
  select: Sun.select
})

// derive: copy the constructor with an extended prototype
// extend: change the constructor prototype in-place
// subcls: rebase the constructor prototype on another
// type: create a subcls with a functional constructor

var derive = function (cons, over) {
  var copy = function () { return cons.apply(this, arguments) }
  return extend(cls(up(copy, {prototype: ext(cons.prototype)})), over)
}
var extend = function (cons, over) {
  return cat([], over).reduce(up, cons.prototype), cons;
}

var cls = Sun.cls = up(function (cons, over) {
  return up(extend(cons, over), cls)
}, {
  derive: function (over) { return derive(this, over) },
  extend: function (over) { return extend(this, over) },
  subcls: function (cons, over) {
    return up(up(cons, {prototype: up(ext(this.prototype, cons.prototype), over)}), this)
  },
  type: function (cons, over) {
    var sub = this.subcls(cons, over)
    var fun = function (a, r, g, s) { return new sub(this, a, r, g, s) }
    return up(fun, {prototype: sub.prototype})
  }
})

Sun.Cage = cls(function Cage(obj, opt) {
  this.__opt__ = up({sep: /\s+/}, opt)
  this.__obj__ = obj || this;
  this.__fns__ = {}
  return this;
}, {
  fire: function (k, v, o) {
    var self = this, funs = self.__fns__[k] || []
    funs.map(function (f) { f.call(self, v, o, k) })
    return this;
  },
  get: function (k, d) {
    if (k in this.__obj__)
      return this.__obj__[k]
    return d;
  },

  change: function (k, v) {
    var u = this.__obj__[k]
    this.__obj__[k] = v;
    this.fire(k, v, u)
    return v;
  },
  update: function (obj) {
    for (var k in obj)
      this.change(k, obj[k])
    return this;
  },

  on: function (keys, fun, now) {
    var fns = this.__fns__, keys = keys.split(this.__opt__.sep), self = this;
    keys.map(function (k) { L.keep(fns[k] = fns[k] || [], fun) })
    if (now)
      keys.map(function (k) { var v = self[k]; fun.call(self, v, v, k) })
    return this;
  },
  off: function (keys, fun) {
    var fns = this.__fns__, keys = keys.split(this.__opt__.sep)
    keys.map(function (k) { L.drop(fns[k] || [], fun) })
    return this;
  },
  once: function (keys, fun, now) {
    var n = 0;
    return this.til(keys, fun, function () { return n++ }, now)
  },
  til: function (keys, fun, dead, now) {
    this.on(keys, function () {
      if (dead())
        this.off(keys, arguments.callee)
      else
        fun.apply(this, arguments)
    }, now)
  },
  toggle: function (key) {
    return this.change(key, !this[key])
  }
})

Sun.JSM = Sun.cls(function JSM(cage) {
  this.__cage__ = cage || this;
  this.__rules__ = []
  return this;
}, {
  never: function () {
    this.__rules__.reduce(function (cage, rule) {
      return rule[0].map(function (p) { return cage.off(p[0], rule[1]) }, cage)
    }, this.__cage__)
    this.__rules__ = []
    return this;
  },
  when: function (cond, fun, now) {
    var self = this, cage = this.__cage__, rules = this.__rules__, i = rules.length;
    var f = function (v, o, k) {
      var O = all(cond, function (p) { return match(p[0] == k ? o : cage[p[0]], p[1]) })
      var V = all(cond, function (p) { return match(p[0] == k ? v : cage[p[0]], p[1]) })
      fun.call(self, V, O, i, v, o, k)
    }
    rules.push([cond, f])
    cond.map(function (p) { cage.on(p[0], f) })
    if (now)
      f.call(cage)
    return this;
  }
})

Sun.URL = {
  format: function (url) {
    var str = ''
    if (url.scheme)
      str += url.scheme + ':'
    if (url.authority)
      str += '//' + url.authority;
    if (url.path)
      str += url.path;
    if (url.query)
      str += '?' + url.query;
    if (url.fragment)
      str += '#' + url.fragment;
    return str;
  }
}

var F = Sun.form = {
  encode: function (obj) {
    var list = []
    for (var k in obj)
      list.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
    return list.join('&');
  },
  decode: function (str) {
    var list = str ? str.split('&') : []
    return list.reduce(function (acc, item) {
      var kv = item.split('=').map(decodeURIComponent);
      acc[kv[0]] = kv[1]
      return acc;
    }, {});
  },
  update: function (str, obj) {
    return F.encode(up(F.decode(str), obj))
  }
}

var H = Sun.http = up(function (method, url, fun, data, hdrs) {
  var req = new XMLHttpRequest()
  req.onreadystatechange = function () {
    if (this.readyState == this.DONE){
      fun(this)
    }
  }
  req.open(method, url, true)
  fold(function (_, o) { req.setRequestHeader(o[0], o[1]) }, null, hdrs)
  req.send(data)
  return req;
}, {
  get:  function (url, fun, hdrs)       { return H("GET",  url, fun, null, hdrs) },
  put:  function (url, fun, data, hdrs) { return H("PUT",  url, fun, data, hdrs) },
  post: function (url, fun, data, hdrs) { return H("POST", url, fun, data, hdrs) }
})

var L = Sun.list = up(function (x) {
  return x instanceof Array ? x : [x]
}, {
  item: function (list, i) { return list && list[i < 0 ? list.length + i : i] },
  append: function (list, item) { return list.push(item), list },
  concat: function (item, list) { return [item].concat([].slice.call(list)) },
  drop: function (list, item) {
    var i = list.indexOf(item)
    if (i >= 0)
      return list.splice(i, 1)[0]
  },
  keep: function (list, item) {
    var i = list.indexOf(item)
    if (i < 0)
      return list.push(item)
  },
  purge: function (list, fun) {
    for (var i = 0; i < list.length; i++)
      if (fun(list[i]))
        list.splice(i, 1)
    return list;
  },
  store: function (list, item, i) {
    if (i != undefined)
      list[i] = item;
    else
      list.push(item)
    return list;
  },
  insert: function (list, item, eq) {
    var eq = eq || Sun.equals;
    for (var i = 0; i < list.length; i++)
      if (eq(item, list[i]))
        return list;
    return L.append(list, item)
  },
  umerge: function (x, y, lt) {
    var lt = lt || Sun.lt;
    var z = [], i = 0, j = 0, l;
    while (i < x.length || j < y.length) {
      if (j >= y.length || lt(x[i], y[j])) {
        if (lt(l, x[i]) || !(i || j))
          z.push(l = x[i])
        i++;
      }
      else {
        if (lt(l, y[j]) || !(i || j))
          z.push(l = y[j])
        j++;
      }
    }
    return z;
  },
  repeat: function (list, n) {
    var l = []
    for (var i = 0; i < n; i++)
      l = l.concat(list)
    return l;
  },

  cmp: function (x, y) {
    for (var i = 0; i < x.length; i++) {
      var c = cmp(x[i], y[i])
      if (c)
        return c;
    }
    return (x.length < y.length) ? -1 : 0;
  },
  group: function (list, item, key) {
    var key = key || Sun.key, g = L.item(list, -1), k = key(L.item(g, 0))
    if (g && equals(key(item), k))
      g.push(item)
    else
      list.push([item])
    return list;
  }
})

var Sec = 1000, Min = 60 * Sec, Hour = 60 * Min, Day = 24 * Hour, Week = 7 * Day;
var DoW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
var MoY = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
var T = Sun.time = up(function (set, rel) {
  var rel = rel ? new Date(rel) : new Date, set = set || {}
  return new Date(def(set.y, rel.getFullYear()),
                  def(set.m, rel.getMonth()),
                  def(set.d, rel.getDate()),
                  def(set.h, rel.getHours()),
                  def(set.mi, rel.getMinutes()),
                  def(set.s, rel.getSeconds()),
                  def(set.ms, rel.getMilliseconds()))
}, {
  get: function (k, rel) {
    var rel = rel ? new Date(rel) : new Date;
    switch (k) {
    case 'y': return rel.getFullYear()
    case 'm': return rel.getMonth()
    case 'd': return rel.getDate()
    case 'h': return rel.getHours()
    case 'mi': return rel.getMinutes()
    case 's': return rel.getSeconds()
    case 'ms': return rel.getMilliseconds()
    }
  },
  pass: function (dif, rel) {
    var rel = rel ? new Date(rel) : new Date;
    for (var k in dif)
      switch (k) {
      case 'y': rel.setFullYear(rel.getFullYear() + dif[k]); break;
      case 'm': rel.setMonth(rel.getMonth() + dif[k]); break;
      case 'w': rel.setDate(rel.getDate() + dif[k] * 7); break;
      case 'd': rel.setDate(rel.getDate() + dif[k]); break;
      case 'h': rel.setHours(rel.getHours() + dif[k]); break;
      case 'mi': rel.setMinutes(rel.getMinutes() + dif[k]); break;
      case 's': rel.setSeconds(rel.getSeconds() + dif[k]); break;
      case 'ms': rel.setMilliseconds(rel.getMilliseconds() + dif[k]); break;
      }
    return rel;
  },
  fold: function (fun, acc, opt) {
    var t = opt.start || new Date, stop = opt.stop, step = opt.step || {d: 1}
    var f = T.pass(step, t) >= t, jump = {}
    for (var i = 1, s = t; !stop || (f ? (t < stop) : (t > stop)); i++) {
      acc = fun(acc, t)
      for (var k in step)
        jump[k] = step[k] * i;
      t = T.pass(jump, s)
    }
    return acc;
  },
  parse: function (stamp, opt) {
    var opt = opt || {}
    var sep = opt.sep || 'T', dsep = opt.dsep || '-', tsep = opt.tsep || ':';
    var utc = opt.utc || stamp[stamp.length - 1] == 'Z';
    var dtp = stamp.split(sep)
    var datep = dtp[0] ? dtp[0].split(dsep).map(int) : [0, 0, 0]
    var timep = dtp[1] ? dtp[1].substring(0, 8).split(':').map(int) : [0, 0, 0]
    if (utc)
      return new Date(Date.UTC(datep[0], datep[1] - 1, datep[2], timep[0], timep[1], timep[2]))
    return new Date(datep[0], datep[1] - 1, datep[2], timep[0], timep[1], timep[2])
  },
  datestamp: function (t, opt) {
    var opt = opt || {}
    var datep =
        (opt.utc
         ? [t.getUTCFullYear(), pad(t.getUTCMonth() + 1), pad(t.getUTCDate())]
         : [t.getFullYear(), pad(t.getMonth() + 1), pad(t.getDate())])
    return datep.join(opt.dsep || '-')
  },
  timestamp: function (t, opt) {
    var opt = opt || {}
    var timep =
        (opt.utc
         ? [pad(t.getUTCHours()), pad(t.getUTCMinutes()), pad(t.getUTCSeconds())]
         : [pad(t.getHours()), pad(t.getMinutes()), pad(t.getSeconds())])
    return timep.join(opt.tsep || ':') + (opt.utc ? 'Z' : '')
  },
  stamp: function (t) { return T.datestamp(t) + ' ' + T.timestamp(t) },
  fromGregorian: function (s) { return new Date((s - 62167219200) * 1000) },
  toGregorian: function (t) { return ~~(t / 1000) + 62167219200 },
  daysInMonth: function (y, m) { return 32 - new Date(y, m, 32).getDate() },
  isLeapYear: function (y) { return !(y % 4) && ((y % 100) != 0 || !(y % 400)) },
  weekday: function (t) { return DoW[t.getDay()] },
  month: function (t) { return MoY[t.getMonth()] },
  DoW: DoW,
  MoY: MoY,
  Sec: Sec,
  Min: Min,
  Hour: Hour,
  Day: Day,
  Week: Week
})
