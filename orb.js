(function () {
  var U = Sky.util;
  var def = U.def, fnt = U.fnt, clip = U.clip;
  var pop = U.pop, up = U.update, ext = U.extend;
  var abs = Math.abs, log = Math.log, rnd = Math.round, E = Math.E;
  var min = Math.min, max = Math.max;
  var sgn = function (x) { return x < 0 ? -1 : 1 }
  var cat = function (a, b) { return b ? [].concat(a, b) : a }
  var id = function (o) { return o }
  var noop = function () {}

  var touch = 'ontouchstart' in window;
  var pointerdown = touch ? 'touchstart' : 'mousedown';
  var pointermove = touch ? 'touchmove' : 'mousemove';
  var pointerup = touch ? 'touchend touchcancel' : 'mouseup';

  Orb = function Orb(obj, jack, elem) {
    this.jack = jack || this.jack;
    this.elem = elem || this.elem;
    this.grip = 0;
    this.update(obj)
  }
  Orb.prototype.update = function (obj) { return up(this, obj) }
  Orb.prototype.update({
    prop: function (f, a) { return Orb.do(this.jack, f, a) },
    grab: function () { this.grip++; return this.prop('grab', arguments) },
    free: function () { this.grip--; return this.prop('free', arguments) },
    move: function () { return this.prop('move', arguments) },
    push: function () { return this.prop('move', arguments) },
    sync: function () { return this.prop('sync', arguments) },
    drag: function (f, a) { return Orb.drag(this, f, a) },
    walk: function (f, a) { return Orb.walk(this, f, a) },
    thru: function (o, a) { return Orb.thru(this, o, a) }
  })
  Orb = up(Orb, {
    do: function (o, f, a) {
      if (o) {
        if (o[f])
          return o[f].apply(o, a)
        if (o instanceof Array)
          return o.reduce(function (_, i) { return Orb.do(i, f, a) }, 0)
      }
    },
    call: function (o, f) { return Orb.do(o, f, [].slice.call(arguments, 2)) },
    grab: function (o) { return Orb.do(o, 'grab', [].slice.call(arguments, 1)) },
    free: function (o) { return Orb.do(o, 'free', [].slice.call(arguments, 1)) },
    move: function (o, dx, dy, a, r, g, s) {
      return Orb.do(o, 'move', [dx || 0, dy || 0, a, r, g, s])
    },
    drag: function (o, f, a) {
      return Orb.grab(o), Orb.do(o, f, a), Orb.free(o), o;
    },
    type: function (cons) {
      var proto = cons.prototype = new Orb;
      [].slice.call(arguments, 1).map(function (base) { up(proto, base) })
      return function (a, r, g, s) { return new cons(this, a, r, g, s) }
    },
    walk: function (o, f, a) {
      return f.call(o, o.parent ? Orb.walk(o.parent, f, a) : a)
    },
    thru: function (o, p, a) {
      return a.map(function (k) {
        Object.defineProperty(o, k, {get: function () { return p[k] }})
      })
    }
  })

  Sky.Elem.prototype.update({
    tap: function (fun, opts, jack) {
      var opts = up({gap: 250, mx: 1, my: 1}, opts)
      var open, Dx, Dy;
      return this.swipe(this.orb({
        grab: function (e) {
          Dx = Dy = 0;
          open = true;
          setTimeout(function () { open = false }, opts.gap)
          if (opts.stop)
            e.stopImmediatePropagation()
          Orb.prototype.grab.apply(this, arguments)
        },
        move: function (dx, dy) {
          Dx += abs(dx)
          Dy += abs(dy)
          this.push(dx, dy)
        },
        free: function (e) {
          if (open && Dx <= opts.mx && Dy <= opts.my)
            fun && fun.apply(this, arguments)
          open = false;
          if (opts.stop)
            e.stopImmediatePropagation()
          Orb.prototype.free.apply(this, arguments)
        }
      }, jack), {stop: opts.stop})
    },
    dbltap: function (fun, opts) {
      var opts = up({gap: 250}, opts)
      var self= this, taps = 0;
      this.on(pointerdown, function (e) {
        if (taps++)
          fun && fun.apply(self, arguments)
        setTimeout(function () { taps = 0 }, opts.gap)
        if (opts.prevent)
          e.preventDefault()
      })
      return this;
    },

    press: function (o, opts) {
      var opts = up({gain: 1, every: 1}, opts)
      var press, i;
      this.on(pointerdown, function (e) {
        if (!press)
          Orb.grab(o, e)
        press = true;
        i = setInterval(function () { Orb.move(o, opts.gain) }, opts.every)
        if (opts.prevent)
          e.preventDefault()
      })
      this.doc().on(pointerup, function (e) {
        if (press)
          Orb.free(o, e)
        press = false;
        clearInterval(i)
        if (opts.prevent)
          e.preventDefault()
      })
      return this;
    },
    swipe: function (o, opts) {
      var opts = up({glob: true}, opts)
      var swipe = 0, lx, ly;
      var doc = this.doc(), that = opts.glob ? doc : this;
      this.on(pointerdown, function (e) {
        var t = e.touches ? e.touches[0] : e;
        if (!swipe++)
          Orb.grab(o, e)
        lx = t.pageX;
        ly = t.pageY;
        if (opts.prevent)
          e.preventDefault()
      })
      that.on(pointermove, function (e) {
        if (swipe) {
          var t = e.touches ? e.touches[0] : e;
          Orb.move(o, t.pageX - lx, t.pageY - ly, lx, ly, t.pageX, t.pageY)
          lx = t.pageX;
          ly = t.pageY;
          if (opts.stop)
            e.stopImmediatePropagation()
          if (opts.prevent)
            e.preventDefault()
        }
      })
      doc.on(pointerup, function (e) {
        if (swipe && !--swipe)
          Orb.free(o, e)
        if (opts.prevent)
          e.preventDefault()
      })
      return this;
    },
    scroll: function (o, opts) {
      var opts = up({prevent: true}, opts)
      return this.on('mousewheel', function (e) {
        Orb.move(o, e.wheelDeltaX, e.wheelDeltaY)
        if (opts.stop)
          e.stopImmediatePropagation()
        if (opts.prevent)
          e.preventDefault()
      }).swipe(o, opts)
    },

    orb: function (obj, jack) {
      return new Orb(obj, jack, this)
    },

    amp: Orb.type(function Amp(elem, jack, opts) {
      var ax, ay, kx, ky;
      var pow = Sun.pow;
      var opts = up({ax: 1, ay: 1, kx: 1, ky: 1}, opts)
      this.elem = elem;
      this.jack = jack;
      this.move = function (dx, dy, a, r, g, s) {
        this.push(kx * pow(dx, ax), ky * pow(dy, ay), a, r, g, s)
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        ax = opts.ax; ay = opts.ay;
        kx = opts.kx; ky = opts.ky;
      }
      this.setOpts(opts)
    }),

    spring: Orb.type(function Spring(elem, jack, opts) {
      var lock, kx, ky, lx, ly, tx, ty, restore, stretch, balance, perturb, anim;
      var opts = up({}, opts)
      this.dx = 0;
      this.dy = 0;
      this.elem = elem;
      this.jack = jack;
      this.move = function (dx, dy) {
        var s = this;
        s.dx += lx * dx;
        s.dy += ly * dy;
        stretch && stretch.call(s)
        if (!anim) {
          perturb && perturb.call(s)
          anim = elem.animate(function () {
            var dx = s.dx, dy = s.dy, mx = abs(dx), my = abs(dy)
            var more = restore.call(s, dx, dy, mx, my) || s.dx || s.dy || s.grip;
            if (!more) {
              anim = null;
              balance && balance.call(s)
            }
            return more;
          })
        }
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        lock = opts.lock;
        kx = opts.kx || 8; ky = opts.ky || 8;
        lx = opts.lx || 1; ly = opts.ly || 1;
        tx = opts.tx || 1; ty = opts.ty || 1;
        restore = opts.restore || function (dx, dy, mx, my) {
          if (lock && this.grip)
            return;
          if (mx > tx) dx /= kx * log(mx + 1)
          if (my > ty) dy /= ky * log(my + 1)
          this.dx -= dx;
          this.dy -= dy;
          return this.push(dx, dy, this)
        }
        stretch = opts.stretch;
        balance = opts.balance;
        perturb = opts.perturb;
      }
      this.setOpts(opts)
    }),

    guide: Orb.type(function Guide(elem, jack, opts) {
      var unit, bbox, w, h, px, py, mx, my, balance, settle, truncate;
      var dist = Sun.clockdist;
      var opts = up({}, opts)
      var self = this;
      var spring = elem.spring(jack)
      this.elem = elem;
      this.jack = spring;
      this.move = function (dx, dy) {
        self.px = px += dx;
        self.py = py += dy;
        self.push(dx, dy)
      }
      this.goto = function (i, j) {
        var ox = px + spring.dx - (i || 0) * w, oy = py + spring.dy - (j || 0) * h;
        self.move(-ox, -oy)
      }
      this.slot = function () {
        return [rnd((px + spring.dx) / w), rnd((py + spring.dy) / h)]
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        unit = pop(opts, 'unit', unit || {})
        bbox = opts.bbox || elem.bbox()
        w = def(unit.width, def(w, bbox.width))
        h = def(unit.height, def(h, bbox.height))
        px = self.px = opts.px || 0;
        py = self.py = opts.py || 0;
        mx = opts.mx || 1e-3;
        my = opts.my || 1e-3;
        balance = opts.balance;
        settle = pop(opts, 'settle', settle)
        truncate = pop(opts, 'truncate', truncate)
        spring.setOpts(ext(opts, {
          balance: function () {
            var ox = w && px % w, oy = h && py % h;
            var far = dist(ox, 0, w) > mx || dist(oy, 0, h) > my;
            if (far)
              Orb.move(self.hook || self,
                       abs(ox) < w / 2 && !truncate ? -ox : sgn(ox) * w - ox,
                       abs(oy) < h / 2 && !truncate ? -oy : sgn(oy) * h - oy)
            if (!far)
              settle && settle.call(this, rnd(px / (w || 1)), rnd(py / (h || 1)))
            balance && balance.call(this, ox, oy)
          }
        }))
      }
      this.setOpts(opts)
    }),

    tether: Orb.type(function Tether(elem, jack, opts) {
      var bbox, xmin, xmax, ymin, ymax, rx, ry, px, py;
      var opts = up({}, opts)
      var self = this;
      var plug = elem.orb({
        move: function (dx, dy) {
          self.px = px += dx;
          self.py = py += dy;
          return this.push(dx, dy, px, py, bbox)
        }
      }, jack)
      var coil = elem.spring(plug, {kx: 1, ky: 1, lx: -1, ly: -1, lock: true})
      this.elem = elem;
      this.jack = cat(plug, coil)
      this.move = function (dx, dy) {
        var cx = 0, cy = 0, ix = dx, iy = dy;
        var nx = px + dx + coil.dx, ny = py + dy + coil.dy;
        var ux = nx - xmin, uy = ny - ymin;
        var ox = nx - xmax, oy = ny - ymax;
        if (ux < 0 && dx < 0) {
          cx = (px < xmin ? dx : ux) / (rx * log(abs(coil.dx) + E))
          ix = min(dx - ux, 0)
        } else if (ox > 0 && dx > 0) {
          cx = (px > xmax ? dx : ox) / (rx * log(abs(coil.dx) + E))
          ix = max(dx - ox, 0)
        }
        if (uy < 0 && dy < 0) {
          cy = (py < ymin ? dy : uy) / (ry * log(abs(coil.dy) + E))
          iy = min(dy - uy, 0)
        } else if (oy > 0 && dy > 0) {
          cy = (py > ymax ? dy : oy) / (ry * log(abs(coil.dy) + E))
          iy = max(dy - oy, 0)
        }
        Orb.move(coil, cx, cy)
        return Orb.move(plug, cx + ix, cy + iy)
      }

      this.goto = function (x, y) {
        return Orb.move(this, (x || 0) - (px + coil.dx), (y || 0) - (py + coil.dy))
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        bbox = new Sky.Box(opts.bbox || {}, true)
        xmin = bbox.x; xmax = bbox.right;
        ymin = bbox.y; ymax = bbox.bottom;
        rx = opts.rx || 1;
        ry = opts.ry || 1;
        px = self.px = def(opts.px, px || 0)
        py = self.py = def(opts.py, py || 0)
        if (px < xmin || px > xmax || py < ymin || py > ymax)
          self.goto(px < xmin ? xmin : (py > xmax ? xmax : px),
                    py < ymin ? ymin : (py > ymax ? ymax : py))
      }
      this.setOpts(opts)
    }),

    crank: Orb.type(function Crank(elem, jack, opts) {
      var cx, cy;
      var opts = up({}, opts)
      this.elem = elem;
      this.jack = jack;
      this.move = function (dx, dy, px, py) {
        var c = elem.screen(cx, cy)
        var rx = px - c.x, ry = py - c.y;
        if (rx > 0)
          dy = -dy;
        if (ry < 0)
          dx = -dx;
        return this.push(dx + dy, 0, this)
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        cx = opts.cx || 0;
        cy = opts.cy || 0;
      }
      this.setOpts(opts)
    }),

    wagon: Orb.type(function Wagon(elem, jack, opts) {
      var bbox, xmin, xmax, ymin, ymax, wide, high;
      var opts = up({}, opts)
      this.elem = elem;
      this.jack = jack;
      this.move = function (dx, dy) {
        var cur = elem.transformation(), off = cur.translate = cur.translate || [0, 0]
        if (wide)
          cur.translate[0] = clip(off[0] + dx, xmin, xmax)
        if (high)
          cur.translate[1] = clip(off[1] + dy, ymin, ymax)
        elem.transform(this.push(dx, dy, cur) || cur)
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        bbox = new Sky.Box(opts.bbox || {}, true)
        xmin = bbox.x; xmax = bbox.right;
        ymin = bbox.y; ymax = bbox.bottom;
        wide = bbox.width; high = bbox.height;
      }
      this.setOpts(opts)
    }),

    loop: Orb.type(function Loop(elem, jack, opts) {
      var bbox, xmin, xmax, ymin, ymax, wide, high, wrap;
      var opts = up({}, opts)
      this.elem = elem;
      this.jack = jack;
      this.move = function (dx, dy, cur) {
        var off = cur.translate || [0, 0]
        var ox = fnt(off[0], xmin), oy = fnt(off[1], ymin), lx = ox, ly = oy, over = true;
        while (over) {
          over = false;
          if (wide) {
            var wx = lx < xmin && 1 || lx > xmax && -1;
            if (wx) {
              over = true;
              lx += wx * wide;
              if (!wrap.call(this, wx, 0, ox, oy))
                ox += wx * wide;
            }
          }
          if (high) {
            var wy = ly < ymin && 1 || ly > ymax && -1;
            if (wy) {
              over = true;
              ly += wy * high;
              if (!wrap.call(this, 0, wy, ox, oy))
                oy += wy * high;
            }
          }
        }
        cur.translate = [ox, oy]
        return this.push(dx, dy, cur) || cur;
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        bbox = new Sky.Box(opts.bbox || {}, true)
        xmin = bbox.x; xmax = bbox.right;
        ymin = bbox.y; ymax = bbox.bottom;
        wide = bbox.width; high = bbox.height;
        wrap = opts.wrap || noop;
      }
      this.setOpts(opts)
    }),

    belt: Orb.type(function Belt(elem, jack, opts) {
      var wbox, bbox, draw;
      var opts = up({h: true, v: true}, opts)
      var self = this;
      var orbs = [].concat(jack), n = orbs.length;
      this.elem = elem;
      this.jack = orbs.map(function (o, k) {
        var e = o.elem; o.k = k;
        return e.wagon(e.loop(o, {
          wrap: function (wx, wy) {
            var k_ = o.k;
            if (draw.call(self, o, mapk(o.k += n * (wx + wy)), wx, wy))
              return o.k = k_, true;
          }
        }))
      }, [])

      this.sync = function () {
        orbs.map(function (o) { draw.call(self, o, mapk(o.k)) })
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        wbox = up(opts.h ? {} : {width: 0}, opts.v ? {} : {height: 0})
        bbox = opts.bbox || elem.bbox()
        draw = opts.draw || noop;
        mapk = opts.mapk || id;
        self.jack.map(function (w) {
          w.setOpts({bbox: wbox})
          w.jack.setOpts({bbox: bbox})
        })
      }
      this.setOpts(opts)
    }),

    treadmill: Orb.type(function Treadmill(elem, jack, opts) {
      var init, dims, soln, bbox, unit, shape, rows, cols;
      var opts = up({h: true, v: true}, opts)
      var orbs = []
      var self = this;
      this.elem = elem;

      this.setOpts = function (o) {
        opts = up(opts, o)
        init = opts.init || id;

        if (soln = Sky.Box.solve(up({bbox: opts.dims}, opts)) || soln) {
          dims = bbox = soln.bbox; unit = soln.unit; shape = soln.shape;
          shape = {rows: rows = shape.rows, cols: cols = shape.cols}
        } else {
          dims = bbox = unit = elem.bbox()
          shape = {rows: rows = 1, cols: cols = 1}
        }

        if (opts.h) {
          shape.cols = Math.ceil(cols + 1)
          bbox = Sky.Box.solve({unit: unit, shape: shape}).bbox.shift(1 - unit.w, 0)
        }
        if (opts.v) {
          shape.rows = Math.ceil(rows + 1)
          bbox = Sky.Box.solve({unit: unit, shape: shape}).bbox.shift(0, 1 - unit.h)
        }

        orbs.map(function (o) { o.elem.remove() })
        orbs = unit.stack(function (a, b) {
          var o = elem.group().shift(b.x, b.y).orb({dims: b.copy({x: 0, y: 0})})
          return a.push(init.call(self, o) || o), a;
        }, [], shape)

        self.dims = dims;
        self.bbox = bbox;
        self.unit = unit;
        self.rows = rows;
        self.cols = cols;
        self.jack = elem.belt(cat(orbs, jack), ext(opts, {bbox: bbox}))
        self.sync()
      }
      this.setOpts(opts)
    }),

    wheel: Orb.type(function Wheel(elem, jack, opts) {
      var kx, ky, rx, ry, gunit, settle, active, window, offset, range, zero, u, i;
      var opts = up({kx: 2, ky: 2, rx: 3, ry: 3}, opts)
      var self = this;
      var tmill = this.tmill = elem.treadmill(null)
      var guide = this.guide = elem.guide(tmill)
      var tether = guide.hook = elem.tether(cat(guide, jack))
      this.thru(tmill, ['dims', 'bbox', 'unit', 'rows', 'cols'])
      this.elem = elem;
      this.jack = tether;
      this.getActive = function () {
        return guide.slot().map(function (v, i) { return -v })
      }
      this.setActive = function (x, y) {
        return tether.goto(-x * u.w, -y * u.h)
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        kx = pop(opts, 'kx', kx)
        ky = pop(opts, 'ky', ky)
        rx = pop(opts, 'rx', rx)
        ry = pop(opts, 'ry', ry)
        gunit = pop(opts, 'gunit', gunit)
        settle = pop(opts, 'settle', settle)
        active = pop(opts, 'active', active)
        window = pop(opts, 'window', window)
        offset = pop(opts, 'offset', offset || [0, 0])
        range = pop(opts, 'range', range)
        zero = pop(opts, 'zero', zero || [0, 0])

        tmill.setOpts(ext(opts, {mapk: function (k) { return k - i }}))
        guide.setOpts({
          kx: kx,
          ky: ky,
          unit: gunit || self.unit,
          settle: function (x, y) { settle && settle(-x, -y) }
        })

        u = self.unit;
        i = zero[0] * self.cols + zero[1]

        if (range) {
          var r = up({rows: 1, cols: 1}, range)
          var w = up({rows: self.rows, cols: self.cols}, window)
          var a = Sky.box(0, 0, offset[0] * u.w, offset[1] * u.h)
          var b = u.times({cols: max(r.cols - w.cols, 0), rows: max(r.rows - w.rows, 0)}).align(a, 1, 1)
          tether.setOpts({bbox: b, rx: rx, ry: ry, px: 0, py: 0})
        }

        self.setActive.apply(this, active || [])
        self.sync()
      }
      this.setOpts(opts)
    })
  })

  Sky.SVGElem.prototype.update({
    dolly: Orb.type(function Dolly(elem, jack, opts) {
      var vbox, bbox, xmin, xmax, ymin, ymax;
      var opts = up({}, opts)
      this.elem = elem;
      this.jack = jack;
      this.move = function (dx, dy) {
        var cur = elem.node.viewBox.baseVal;
        var dim = [clip(cur.x - dx, xmin, xmax),
                   clip(cur.y - dy, ymin, ymax),
                   cur.width, cur.height]
        elem.attrs({viewBox: this.push(dx, dy, dim) || dim})
      }

      this.setOpts = function (o) {
        opts = up(opts, o)
        vbox = new Sky.Box(opts.vbox || elem.bbox())
        bbox = new Sky.Box(opts.bbox || {}, true)
        bbox = bbox.trim(0, vbox.width, 0, vbox.height)
        xmin = bbox.x; xmax = bbox.right;
        ymin = bbox.y; ymax = bbox.bottom;
        elem.attrs({viewBox: vbox})
      }
      this.setOpts(opts)
    })
  })
})();
