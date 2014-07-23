(function () {
  var P = Sky.path, U = Sky.util, up = Sun.up, Cage = Sun.Cage;

  Sky.Elem.prototype.update({
    button: function (fun, opts, jack) {
      return this.g({class: 'button'}).tap(fun, opts, jack)
    },
    chevron: function (cx, cy, w, h, t) {
      var box = Sky.box(0, 0, Math.abs(w), Math.abs(h || 2 * w))
      return this.svgX(box.center(cx, cy)).chevron(cx, cy, w, h, t)
    }
  })

  Sky.SVGElem.prototype.update({
    chevron: function (cx, cy, w, h, t) {
      return this.path(P.chevron(cx, cy, w, h, t)).addClass('chevron')
    }
  })

  var Nav = Sun.cls(function Nav(init, state, frame) {
    Cage.call(this)
    this.pages = init(this)
    this.state = state;
    this.frame = frame;
  }, new Cage, {
    action: function () {
      return this.segue(this.bind.apply(this, arguments))
    },

    transition: function (state, opts) {
      var self = this;
      return this.segue(function () { return self.load(state, opts) })
    },

    segue: function (fn) {
      var self = this;
      return function () {
        return Orb.drag(fn.apply(self, arguments), 'move', [100])
      }
    },

    bind: function (key) {
      var fn = this[key]
      return fn.bind.apply(fn, [this].concat([].slice.call(arguments, 1)))
    },

    draw: function (tag, win) {
      return this.pages[tag].draw(win) || win;
    },

    redraw: function (win) {
      return this.draw(win.state.tag, win.reset())
    },

    load: function (state, opts) {
      var state = up(state || this.state, {nav: this})
      return this.draw(state.tag, this.frame.window(state, opts))
    },

    reload: function (data) {
      var state = data ? up(this.state, {data: data}) : this.state;
      return this.load(state, {transition: 'same'})
    },

    step: function (tag, data) {
      var state = {tag: tag, data: data, prev: this.state, parent: this.state.parent}
      return this.load(state, {transition: 'next'})
    },
    back: function (data) {
      var state = data ? up(this.state.prev, {data: data}) : this.state.prev;
      return this.load(state, {transition: 'prev'})
    },

    open: function (tag, data) {
      var state = {tag: tag, data: data, parent: this.state}
      return this.load(state, {transition: 'new'})
    },
    shut: function (data) {
      var state = data ? up(this.state.parent, {data: data}) : this.state.parent;
      return this.load(state, {transition: 'old'})
    }
  })

  var otype = Orb.type;
  var iOS7x = {
    frame: otype(function Frame(pkg, root, opts) {
      var opts = up({kx: 1.5}, opts)
      var self = this;
      var elem = this.elem = root.g({class: 'frame'})
      Cage.call(this)
      this.on('top', function (n, o) { o && o != n && o.elem.remove() })
      this.setOpts = function (o) {
        self.opts = up(opts, o)
        self.dims = opts.dims || elem.bbox()
        self.line = opts.line || self.dims.copy({h: 20})
        self.top && self.top.state.nav.redraw(self.top)
      }
      this.setOpts(opts)
    }, new Cage, {
      window: otype(function Window(frame, state, opts) {
        var opts = up({kx: frame.opts.kx}, opts)
        var self = this; this.frame = frame;
        var elem = this.elem = frame.elem.g({class: 'window'})
        var content = this.content = elem.g({class: 'content'})
        var chrome = this.chrome = elem.g({class: 'chrome'})

        var xfer, percent;
        this.thru(frame, ['dims', 'line'])
        this.state = up(state, {win: this})
        this.jack = elem.spring(elem.orb({
          move: function (dx) { xfer.call(this, percent = U.clip(percent + dx, 0, 100)) }
        }, this.plugs = []), {
          kx: opts.kx,
          balance: function () {
            if (percent >= 50) {
              if (percent < 100)
                return this.move(100 - percent)
              state.nav.change('state', state)
              frame.change('top', self)
            } else {
              if (percent > 0)
                return this.move(-percent)
              elem.remove()
            }
          }
        })

        this.setOpts = function (o) {
          self.opts = up(opts, o)

          switch (opts.transition) {
          case 'same':
            xfer = function (p) { this.push(0) }
            break;
          case 'next':
            xfer = function (p) {
              if (frame.top) {
                frame.top.chrome.style({opacity: 1 - p / 100})
                Orb.move(frame.top.plugs, -p / 100)
              }
              chrome.style({opacity: p / 100})
              content.transform({translate: (1 - p / 100) * self.dims.w})
              this.push(1 - p / 100)
            }
            break;

          case 'prev':
            elem.insert(0)
            xfer = function (p) {
              if (frame.top) {
                frame.top.chrome.style({opacity: 1 - p / 100})
                frame.top.content.transform({translate: p / 100 * self.dims.w})
                Orb.move(frame.top.plugs, p / 100)
              }
              chrome.style({opacity: p / 100})
              this.push(p / 100 - 1)
            }
            break;

          case 'new':
            xfer = function (p) {
              elem.transform({translate: [0, (1 - p / 100) * self.dims.h]})
              this.push(0, 1 - p / 100)
            }
            break;

          case 'old':
          default:
            elem.insert(0)
            xfer = function (p) {
              if (frame.top) {
                frame.top.elem.transform({translate: [0, p / 100 * self.dims.h]})
                Orb.move(frame.top.plugs, 0, p / 100)
              }
            }
            break;
          }
          if (!frame.top)
            frame.change('top', this)
          xfer.call(this, percent = 0)
        }
        this.setOpts(opts)
      }, {
        reset: function () {
          this.chrome.clear()
          this.content.clear()
          this.plugs.splice(0, -1)
          return this;
        },

        background: otype(function Background(win, opts) {
          var opts = this.opts = up({}, opts)
          var dims = this.dims = win.dims;
          var elem = this.elem = win.content.g({class: 'background'})
          var bgrd = this.bgrd = elem.rectX(dims)
        }),
        navbar: otype(function NavBar(win, opts) {
          var x, y, w, h, d = win.dims;
          var opts = this.opts = up({}, opts)
          var line = this.line = win.line, q = line.h / 4;
          var dims = this.dims = Sky.box(x = d.x, y = d.y, w = d.w, h = 2 * line.h)
          var elem = this.elem = win.chrome.g({class: 'navbar'})

          var m = dims.midY, b = dims.part([.3, .4, .3], true)
          var state = win.state, nav = state.nav, page = nav.pages[state.tag], prev = state.prev;
          var title = opts.title || page.title, left = opts.left, right = opts.right;

          var bgrd = this.bgrd = elem.rect(x, y, w, h)

          if (left) {
            var lbtn = this.lbtn = elem.button(function () { left.action() }).addClass('left')
            lbtn.label(x + 3 * q, m, left.label, -1)
            lbtn.rectX(b[0]).insert(0)
          } else if (prev) {
            var back = this.back = elem.button(function () { nav.action('back')(state.data) }).addClass('back')
            back.chevron(x + 3 * q, m, -2 * q)
            back.label(x + 5 * q, m, nav.pages[prev.tag].title, -1)
            back.rectX(b[0]).insert(0)
          }
          if (right) {
            var rbtn = this.rbtn = elem.button(function () { right.action() }).addClass('right')
            rbtn.label(dims.right - 3 * q, m, right.label, 1)
            rbtn.rectX(b[2]).insert(0)
          }

          var tbar = this.tbar = elem.g()
          tbar.label(dims.midX, m, title).addClass('title')

          win.plugs.push({
            move: function (px) {
              tbar.transform({translate: px < 0 ? px * (w / 2 - 12) : px * (w / 2 - 6)})
            }
          })
        })
      })
    })
  }

  UFO = {
    Nav: Nav,
    iOS7x: iOS7x
  }
})();
