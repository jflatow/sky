var Sky = require('sky')
var Sun = require('sky/sun')
var Orb = require('sky/orb')
var U = Sky.util, up = Sun.up, Cage = Sun.Cage;

var Nav = Sun.cls(function Nav(init, frame, opts) {
  Cage.call(this)
  this.pages = init(this)
  this.frame = frame;
  this.setOpts(opts)
}, new Cage, {
  setOpts: function (o) {
    var self = this;
    var opts = this.opts = up(this.opts || {manageHistory: false}, o)
    if (opts.manageHistory) {
      window.setTimeout(function () {
        window.onpopstate = function (e) {
          if (e.state)
            self.go(self.fromHistory(e.state), null, true)
        }
      }, 1)
    }
  },

  path: function (state) {
    return {
      tag: state.tag,
      prev: state.prev ? this.path(state.prev) : undefined,
      parent: state.parent ? this.path(state.parent) : undefined
    }
  },

  toHash: function (keep, prior) {
    var prior = prior || Sun.form.decode(window.location.hash.substr(1))
    return '#' + Sun.form.encode(up(prior, {page: btoa(JSON.stringify(keep))}))
  },

  fromHash: function (hash) {
    var obj = Sun.form.decode((hash || window.location.hash).substr(1))
    return JSON.parse(atob(obj.page || '') || 'null')
  },

  toHistory: function (state) {
    var page = this.pages[state.tag]
    return page.toHistory ? page.toHistory(state) : this.path(state)
  },

  fromHistory: function (state) {
    var page = this.pages[state.tag]
    return page.fromHistory ? page.fromHistory(state) : state;
  },

  changeHistory: function (state, replace) {
    var page = this.pages[state.tag]
    var keep = this.toHistory(state)
    window.history[replace ? 'replaceState' : 'pushState'](keep, page.title, this.toHash(keep))
  },

  launch: function (state, opts) {
    var kept = this.opts.manageHistory && this.fromHash()
    if (kept)
      return this.go(this.fromHistory(kept), opts, true)
    return this.go(state, opts)
  },

  do: function () {
    return this.action.apply(this, arguments)()
  },
  go: function (state, opts, load) {
    return this.do(load ? 'load' : 'push', state, opts)
  },

  action: function () {
    return this.segue(this.bind.apply(this, arguments))
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
    return this.draw(win.state.tag, win.reset() || win)
  },

  // -> to STATE

  load: function (state, opts) {
    var state = up(state, {nav: this})
    return this.draw(state.tag, this.frame.window(state, opts))
  },

  reload: function (state, data) {
    var state = data ? up(state, {data: data}) : state;
    return this.load(state, {transition: 'same'})
  },

  push: function (state, opts) {
    if (this.opts.manageHistory)
      this.changeHistory(state)
    return this.load(state, opts)
  },

  // from STATE ->

  step: function (state, tag, data) {
    var state = {tag: tag, data: data, prev: state, parent: state.parent}
    return this.push(state, {transition: 'next'})
  },
  back: function (state, data) {
    var state = up(state.prev, {data: U.dfn(data, state.data)})
    return this.push(state, {transition: 'prev'})
  },

  open: function (state, tag, data) {
    var state = {tag: tag, data: data, parent: state}
    return this.push(state, {transition: 'new'})
  },
  shut: function (state, data) {
    var state = up(state.parent, {data: U.dfn(data, state.data)})
    return this.push(state, {transition: 'old'})
  }
})

var Frame = Sun.cls(function Frame(pkg, elem, opts) {
  Cage.call(this)
  this.elem = elem;
  this.window = pkg.window;
  this.windows = []
  this.on('top', function (n, o) {
    if (o !== n) {
      o && o.didBecomeInactive()
      n && n.didBecomeActive()
    }
  })
  this.setOpts(opts)
}, new Cage, {
  setOpts: function (o) {
    this.opts = up(this.opts || {kx: 1.5}, o)
    this.dims = this.opts.dims || this.elem.bbox()
    this.line = this.opts.line || this.dims.copy({h: 20})
    this.windows.map(function (win) {
      win.state.nav.redraw(win)
    })
  },
  addWindow: function (win) {
    this.windows.push(win)
  },
  removeWindow: function (win) {
    Sun.list.drop(this.windows, win)
  }
})

var Window = Sun.cls(function Window(frame, state, opts) {
  var self = this;
  var elem = this.elem = this.elem || frame.elem;
  this.thru(frame, ['dims', 'line'])
  this.frame = frame;
  this.state = up(state, {win: this})
  this.percent = 0;
  this.jack = elem.spring(elem.orb({
    move: function (dx) {
      self.xfer.call(this, self.percent = U.clip(self.percent + dx, 0, 100))
    }
  }, this.plugs = []), {
    balance: function () {
      var percent = self.percent;
      if (percent >= 50) {
        if (percent < 100)
          return this.move(100 - percent)
        else
          self.doBecomeActive()
      } else {
        if (percent > 0)
          return this.move(-percent)
        else
          self.didNotBecomeActive()
      }
    }
  })
  this.setOpts(opts)
  this.frame.addWindow(self)
}, {
  setOpts: function (o) {
    this.opts = up(this.opts || {kx: this.frame.opts.kx}, o)
    this.jack.setOpts({kx: this.opts.kx})
  },
  doBecomeActive: function () {
    this.frame.change('top', this)
  },
  didBecomeActive: function () { },
  didBecomeInactive: function () { this.remove() },
  didNotBecomeActive: function () { this.remove() },
  remove: function () {
    if (this.elem !== this.frame.elem)
      this.elem.remove()
    this.frame.removeWindow(this)
  },
  reset: function () { return this },
  xfer: function (p) { this.push(p) },

  do: function (what) {
    var state = this.state, nav = state.nav;
    return nav.do.apply(nav, [what, state].concat([].slice.call(arguments, 1)))
  },
  action: function (what) {
    var state = this.state, nav = state.nav;
    return nav.action.apply(nav, [what, state].concat([].slice.call(arguments, 1)))
  }
})

var Basic = {
  frame: Orb.type(Frame, Frame.prototype),
  window: Orb.type(Window, Window.prototype)
}

UFO = module.exports = {
  Nav: Nav,
  Frame: Frame,
  Window: Window,
  Basic: Basic
}
