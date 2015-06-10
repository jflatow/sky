var Sky = require('sky')
var Sun = require('sky/sun')
var Orb = require('sky/orb')
var UFO = require('sky/ufo')
var P = Sky.path, up = Sun.up;

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

var iOS7x = {
  frame: Orb.type(function iOS7xFrame(pkg, elem, opts) {
    var elem = this.elem = elem.g({class: 'frame'})
    UFO.Frame.call(this, pkg, elem, opts)
  }, UFO.Frame.prototype),

  window: Orb.type(function iOS7xWindow(frame, state, opts) {
    var opts = up({}, opts)
    var self = this;
    var elem = this.elem = frame.elem.g({class: 'window'})
    var content = this.content = elem.g({class: 'content'})
    var chrome = this.chrome = elem.g({class: 'chrome'})

    switch (opts.transition) {
      case 'same':
        self.xfer = function (p) { this.push(0) }
        break;

      case 'next':
        self.xfer = function (p) {
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
        elem.order(0)
        self.xfer = function (p) {
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
        self.xfer = function (p) {
          elem.transform({translate: [0, (1 - p / 100) * self.dims.h]})
          this.push(0, 1 - p / 100)
        }
        break;

      case 'old':
      default:
        elem.order(0)
        self.xfer = function (p) {
          if (frame.top) {
            frame.top.elem.transform({translate: [0, p / 100 * self.dims.h]})
            Orb.move(frame.top.plugs, 0, p / 100)
          }
          this.push(0)
        }
        break;
    }

    UFO.Window.call(this, frame, state, opts)
  }, UFO.Window.prototype, {
    reset: function () {
      this.chrome.clear()
      this.content.clear()
      this.plugs.splice(0, -1)
    },

    background: Orb.type(function Background(win, opts) {
      var opts = this.opts = up({}, opts)
      var dims = this.dims = win.dims;
      var elem = this.elem = win.content.g({class: 'background'})
      var bgrd = this.bgrd = elem.rectX(dims)
    }),

    navbar: Orb.type(function NavBar(win, opts) {
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
        lbtn.rectX(b[0]).order(0)
      } else if (prev) {
        var back = this.back = elem.button(function () { win.action('back')(state.data) }).addClass('back')
        back.chevron(x + 3 * q, m, -2 * q)
        back.label(x + 5 * q, m, nav.pages[prev.tag].title, -1)
        back.rectX(b[0]).order(0)
      }
      if (right) {
        var rbtn = this.rbtn = elem.button(function () { right.action() }).addClass('right')
        rbtn.label(dims.right - 3 * q, m, right.label, 1)
        rbtn.rectX(b[2]).order(0)
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
}

iOS = module.exports = {
  iOS7x: iOS7x
}
