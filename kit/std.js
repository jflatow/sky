var Sky = require('../sky')
var Sun = require('../sun')
var Orb = require('../ext/orb')
var UFO = require('../kit/ufo')

var U = Sky.util, P = Sky.path, dfn = U.dfn, pop = U.pop, pre = U.pre;
var L = Sun.list, cp = Sun.cp, up = Sun.up, get = Sun.get, map = Sun.map;

var optify = function (opts, key, over) {
  return up((opts instanceof Object) ? opts : Sun.object([[key, opts]]), over)
}

var Widget = Orb.derive({
  stdOpts: function (o, f, c, d) {
    var opts = this.opts = up(f ? up(d || {}, this.opts) : this.opts, o)
    if (f || o.classes)
      this.elem.attrs({class: c || ''}).addClass(opts.classes)
    if (o.style)
      this.elem.style(opts.style)
    if (o.upon)
      Sun.fold(function (e, i, w) { return e.upon(i[0], i[1]) }, this, o.upon)
    return opts;
  },

  fadeHide: function (b) { this.elem.fadeHide(b) },
  fadeRemove: function (b) { this.elem.fadeRemove(b) },

  // direct manipulation methods
  createKid: function (desc, elem) {
    var kid = (elem || this.elem).apply(desc)
    return L.append(pre(this, 'kids', []), kid), kid;
  },
  removeKid: function (kid) {
    return L.drop(pre(this, 'kids', []), kid), kid.remove()
  },
  removeKids: function () {
    // NB: remove mutates list: must use copy-map
    return map(this.kids.slice(), this.removeKid.bind(this))
  },
  selectKid: function (kid) {
    map(this.kids, function (k) {
      k.activate(k === kid)
      k.collapse(k !== kid)
    })
  },

  // delegation methods for managing other widgets
  // item(s) refers to member(s) of the collection
  // NB: could index paths here for faster access
  createItem: function (desc) {
    return this.walk('body', 'createKid', [desc])
  },
  removeItem: function (item) {
    return this.walk('body', 'removeKid', [item])
  },
  selectItem: function (item) {
    return this.walk('body', 'selectKid', [item])
  },

  removeItems: function (items) {
    return map(items || this.getItems(), this.bind('removeItem'))
  },

  // collection either has keys or not, default is based on item template
  collectionKey: function (datum) {
    if (dfn(this.keys, this.item instanceof Function))
      return Sun.key(datum)
  },

  getItems: function () {
    return this.walk('body').kids.slice()
  },
  findItem: function (key) {
    var path = [key]
    if (key != null)
      return Sun.first(this.getItems(), function (i) { return Sun.equals(i.path, path) })
  },

  // obtain & remove items from data (infers descriptors)
  // if widget is a collection, it manages its items using data
  obtainItemFor: function (datum) {
    var datum = this.peel(datum), key = this.collectionKey(datum)
    var item = this.findItem(key) || this.createItem(this.call('item', key, datum))
    if (key)
      item.path = [key]
    return item.load(key == null ? datum : [datum])
  },
  removeItemFor: function (datum) {
    var datum = this.peel(datum), key = this.collectionKey(datum)
    var item = this.findItem(key)
    return item && this.removeItem(item)
  },

  obtainItemsFor: function (data) {
    return map(data, this.bind('obtainItemFor'))
  },
  removeItemsFor: function (data) {
    return map(data, this.bind('removeItemFor'))
  },

  peel: function (json) { var o = this.opts, f = o && o.peel; return f ? f.call(this, json) : json },
  wrap: function (json) { var o = this.opts, f = o && o.wrap; return f ? f.call(this, json) : json },
  load: function (json) {
    var path = this.path || [], peel = this.bind('peel')
    if (this.item) {
      this.removeItems()
      this.obtainItemsFor(Sun.lookup(json, path))
      return this;
    }
    return Orb.prototype.load.call(this, Sun.modify(cp(json), path, peel))
  },

  dump: function (json) {
    var path = this.path || [], wrap = this.bind('wrap')
    if (this.item) {
      var data = map(this.getItems(), function (i) {
        return wrap(i.path ? i.dump([])[0] : i.dump())
      })
      return Sun.modify(json, path, data)
    }
    return Sun.modify(Orb.prototype.dump.call(this, json), path, wrap)
  },

  // path manipulation methods
  lookupPath: function (path) {
    var p = this.path || []
    for (var i = 0; i < p.length; i++)
      if (path[i] != p[i])
        return;
    if (i == path.length)
      return this;
    return this.find('lookupPath', [path.slice(i)])
  },
  removePath: function (path, parent) {
    var p = this.path || []
    for (var i = 0; i < p.length; i++)
      if (path[i] != p[i])
        return;
    if (i == path.length)
      return parent ? parent.removeItem(this) : this.remove()
    return this.find('removePath', [path.slice(i), this])
  },
  selectPath: function (path) {
    // NB: parent is not active if child is, but does not collapse
    //     hopefully CSS :has(.activated) will be supported soon...
    var p = this.path || [], e = this.opts.mutex;
    for (var i = 0; i < p.length; i++)
      if (path[i] != p[i])
        return e && this.collapse(true), this.activate(false, true), false;
    if (i == path.length)
      return this.activate().collapse(false)
    if (Orb.do(this.kids, 'selectPath', [path.slice(i)]))
      return this.activate(false).collapse(false, false)
    return e && this.collapse(true, false), this.activate(false), false;
  }
})

// The default for Widgets is to proxy key variables through the base
// methods are parameterized by the variables, as opposed to propagating
// e.g. createKid operates on the 'elem' & 'kids', rather than calling base itself

Orb.thru(Widget.prototype, {
  head: 'base',
  body: 'base',
  foot: 'base',
  elem: 'base',
  kids: 'base',
  opts: 'base',
  path: 'opts',
  keys: 'opts',
  item: 'opts'
})

Sky.Elem.prototype.update({
  fade: function (b, f, r) {
    var b = dfn(b, true), r = r || 1.5;
    return this.animate(function (n, i) {
      var o = Math.max(getComputedStyle(n).opacity, .005)
      if (b) {
        if (o > 0.01 && i < 100)
          return n.style.opacity = o / r;
        f && f(b)
      } else {
        if (i == 0)
          f && f(b)
        if (o < 0.99 && i < 100)
          return n.style.opacity = o * r;
      }
    })
  },

  fadeHide: function (b) { this.fade(b, this.bind('hide')) },
  fadeRemove: function (b) { this.fade(b, this.bind('remove')) },

  stack: Widget.type(function Stack(root, opts, elem) {
    this.elem = elem || root.g()
    this.kids = []
    this.setOpts(opts || {}, true)
  }, {
    setOpts: function (o, f) {
      var self = this;
      var opts = this.stdOpts(o, f, 'stack')
      if (f || o.items) {
        this.removeKids()
        map(opts.items, function (k) { self.createKid(k) })
      }
    },

    collapse: function (b, r) {
      this.kids.reduce(function (r, kid, i) {
        if (r)
          kid.collapse(b, r)
        if (i)
          kid.hide(b, r)
        return r
      }, dfn(r, true))
      return this.does('elem', 'collapse', arguments)
    }
  }),

  barbell: Widget.type(function Barbell(root, opts) {
    this.elem = root.g().flex(['fit', '100%', 'fit'], true)
    this.kids = []
    this.setOpts(opts || {}, true)
  }, {
    __css__: {
      '.barbell': {
        'align-items': 'center'
      }
    },

    setOpts: function (o, f) {
      var self = this;
      var opts = this.stdOpts(o, f, 'barbell')
      if (f || o.head || o.body || o.foot) {
        this.removeKids()
        map(['head', 'body', 'foot'], function (k, i) {
          var elem = self.elem.nth(i).addClass(k)
          self[k] = opts[k] && self.createKid(opts[k], elem)
        })
      }
    }
  }),

  pillar: Widget.type(function Pillar(root, opts) {
    this.elem = root.g()
    this.kids = []
    this.setOpts(opts || {}, true)
  }, {
    setOpts: function (o, f) {
      var self = this;
      var opts = this.stdOpts(o, f, 'pillar', {body: ['stack']})
      if (f || o.head || o.body || o.foot) {
        this.removeKids()
        map(['head', 'body', 'foot'], function (k, i) {
          self[k] = opts[k] && self.createKid(opts[k])
          self[k] && Orb.do(self[k].elem, 'addClass', [k])
        })
      }
    },

    collapse: function (b, r) {
      if (dfn(r, true))
        this.kids.map(function (kid) { kid.collapse(b, r) })
      this.does('body', 'hide', arguments)
      return this.does('elem', 'collapse', arguments)
    }
  }),

  field: Widget.type(function Field(root, opts) {
    this.elem = root.g()
    this.kids = []
    this.setOpts(opts || {}, true)
  }, {
    __css__: function (theme) {
      return {
        '.field': {
          'margin': '1em 1.5em'
        },

        '.field.inline': {
          'display': 'flex',
          'align-items': 'center'
        },
        '.field.inline .description': {
          'flex': '1 1 30%'
        },
        '.field.inline .epithet': {
          'padding': '0 2em 0 0'
        },
        '.field.inline .control': {
          'flex': '0 0 auto'
        },

        '.field .epithet:empty, .field .advice:empty': {
          'display': 'none'
        },
        '.field .epithet': {
          'padding': '0 0 1ex 0',
          'font-size': '0.8em',
          'font-weight': 600,
          'color': theme.color('medium-text')
        },
        '.field .advice': {
          'padding': '0 0 1ex 0',
          'font-size': '0.8em',
          'white-space': 'pre-line',
          'color': theme.color('light-text')
        },

        '.field .control label': {
          'display': 'inline-flex',
          'flex-direction': 'row-reverse',
          'align-items': 'center',
          'font-size': '0.8em'
        },
        '.field .control label input': {
          'margin': '0 1ex'
        },
        '.field .control label + label': {
          'margin-left': '1ex'
        },
        '.field .control .invalidated': {
          'outline': theme.border('invalid', 3)
        }
      }
    },

    setOpts: function (o, f) {
      var opts = this.stdOpts(o, f, 'field')
      var desc = this.elem.q('description')
      var ctrl = this.elem.q('control')
      desc.q('epithet').txt(opts.epithet || '')
      desc.q('advice').txt(opts.advice || '')
      if (f || o.control) {
        this.removeKids()
        this.createKid(opts.control || ['input'], ctrl)
      }
    },

    collapse: function (b, r) {
      this.elem.each('.advice', function (e) { Sky.$(e).hide(b) })
      return this.does('elem', 'collapse', arguments)
    }
  }),

  panel: Widget.type(function Panel(root, opts) {
    this.base = root.pillar()
    this.setOpts(opts || {}, true)
  }, {
    __css__: function (theme) {
      return {
        '.panel': {
          'margin-bottom': '1em',
          'border': theme.border('crisp-br')
        },

        '.panel > .title-bar': {
          'background-color': theme.color('light-bg'),
          'border-bottom': theme.border('crisp-br'),
          'color': theme.color('medium-text')
        },

        '.panel > .title-bar .body': {
          'padding': '1em'
        }
      }
    },

    setOpts: function (o, f) {
      var opts = this.stdOpts(o, f, 'panel')
      if (f || o.title || o.items || o.status) {
        var b = {}
        if (opts.title)
          b.head = ['barbell', Sun.prepend(optify(opts.title, 'body'), ['classes'], ['title-bar'])]
        if (opts.items)
          b.body = ['stack', {items: opts.items}]
        if (opts.status)
          b.foot = ['barbell', Sun.prepend(optify(opts.status, 'body'), ['classes'], ['status-bar'])]
        this.base.setOpts(b)
      }
    }
  }),

  popup: Widget.type(function Popup(root, opts) {
    this.base = root.pillar()
    this.setOpts(opts || {}, true)
  }, {
    __css__: function (theme) {
      return {
        '.popup': {
          'padding': '1ex',
          'background-color': theme.color('white-bg'),
          'box-shadow': theme.shadow('crisp-br', 0, 0, 3),
          'border': theme.border('crisp-br')
        }
      }
    },

    setOpts: function (o, f) {
      var opts = this.stdOpts(o, f, 'popup', {dismiss: 'remove'})
      var ax = dfn(opts.ax, 0), ay = dfn(opts.ay, 0),
          bx = dfn(opts.bx, -ax), by = dfn(opts.by, -ay),
          dx = dfn(opts.dx, 16 * ax), dy = dfn(opts.dy, 16 * ay)
      var abox = (opts.abox || this.elem.parent().bbox(opts.fixed))
      var elem = this.elem
          .align(abox.shift(dx, dy), ax, ay).anchor(bx, by)
          .style({position: opts.fixed ? 'fixed' : 'absolute', zIndex: 1})
      if (f || o.head || o.body || o.foot)
        this.base.setOpts(Sun.select(opts, ['head', 'body', 'foot']))
      if (f || o.activate)
        this.activate(dfn(opts.activate, true))
      if (f && o.activate == false)
        this.elem.hide()
      if (f && !o.inert)
        this.elem.tapout(this.activate.bind(this, false))
      if (o.timer)
        setTimeout(this.activate.bind(this, false), o.timer)
    },

    activate: function (b, r) {
      Widget.prototype.activate.apply(this, arguments)
      return this[this.opts.dismiss](!dfn(b, true)), this;
    }
  }),

  listEditor: Widget.type(function ListEditor(root, opts) {
    this.base = root.panel()
    this.setOpts(opts || {}, true)
  }, {
    __css__: function (theme) {
      return {
        '.list-editor > .stack:empty': {
          'padding': '1em',
          'text-align': 'center'
        },

        '.list-editor > .stack:empty::after': {
          'content': '"No items"',
          'font-size': '0.8em',
          'color': theme.color('light-text')
        },

        '.list-editor-item + .list-editor-item': {
          'border-top': theme.border('gentle-br')
        },

        '.list-editor-item > .foot': {
          'opacity': 0,
          'transition': 'opacity 0.3s'
        },

        '.list-editor-item:hover > .foot': {
          'opacity': 1,
          'transition': 'opacity 0.3s'
        }
      }
    },

    setOpts: function (o, f) {
      var self = this;
      var opts = this.stdOpts(o, f, 'panel list-editor')
      if (f || o.title)
        this.base.setOpts({
          title: optify(opts.title, 'body', {
            foot: ['addButton', {action: function () { self.createItem(self.call('item')) }}]
          })
        })
    },

    createItem: function (desc) {
      var self = this;
      var item = Widget.prototype.createItem.call(this, ['barbell', {
        classes: ['list-editor-item'],
        body: desc,
        foot: ['removeButton', {action: function () { self.removeItem(item) }}]
      }])
      item.elem.on('click', this.bind('selectItem', item))
      this.selectItem(item)
      this.elem.fire('list-change', {editor: this, item: item, kind: 'add'}, {bubbles: true})
      return item;
    },

    removeItem: function (item) {
      var item = Widget.prototype.removeItem.call(this, item)
      this.elem.fire('list-change', {editor: this, item: item, kind: 'remove'}, {bubbles: true})
      return item;
    }
  }),

  tokenListEditor: Widget.type(function TokenListEditor(root, opts) {
    var self = this;
    var base = this.base = root.stack({items: [['input']]})
    var input = this.inp = base.kids.splice(0, 1)[0]
    input.on('keydown', function (e) {
      switch (e.which) {
      case 8: return self.deleteBackward()
      case 13: return self.confirmEntry()
      default: return self.activate(false, true)
      }
    })
    this.setOpts(opts || {}, true)
  }, {
    __css__: function (theme ) {
      return {
        '.token-list-editor': {
          'display': 'flex',
          'align-items': 'center',
          'flex-direction': 'row',
          'flex-wrap': 'wrap',
          'border': theme.border('crisp-br'),
          'padding': '0.5ex',
          'min-height': '2.5em'
        },
        '.token-list-editor output': {
          'border': theme.border('gentle-br'),
          'background-color': theme.color('faint-bg'),
          'margin': '0.25ex',
          'padding': '0 1ex',
          'overflow': 'hidden',
          'text-overflow': 'ellipsis',
          'cursor': 'pointer'
        },
        '.token-list-editor output.activated': {
          'border': theme.border('focus-br'),
        },
        '.token-list-editor input': {
          'flex': '1 1',
          'margin': '1ex 1.5ex',
          'border': 'none',
          'outline': 'none',
          'min-width': '2em !important'
        }
      }
    },

    setOpts: function (o, f) {
      var self = this;
      var opts = this.stdOpts(o, f, 'token-list-editor')
      if (f || o.input)
        this.inp.attrs(opts.input)
    },

    keys: false,
    item: function () {
      var self = this;
      return function (elem) {
        return elem.output().before(self.inp).upon('click', function () {
          self.selectKid(this)
          self.inp.node.focus()
        })
      }
    },

    confirmEntry: function () {
      var text = this.inp.node.value;
      if (text) {
        this.obtainItemFor(text)
        this.inp.node.value = ''
      }
    },
    deleteBackward: function () {
      var kids = this.kids, active = Sun.first(kids, function (k) {
        return k.hasClass('activated') && k;
      })
      if (active)
        return this.removeKid(active)
      if (this.inp.node.value == '') {
        if (kids.length)
          return this.selectKid(L.item(kids, -1))
      }
    }
  }),

  addButton: function (opts) {
    return this.button(up({class: 'add', icon: '#add'}, opts))
  },
  removeButton: function (opts) {
    return this.button(up({class: 'remove', icon: '#remove'}, opts))
  }
})

var Std = module.exports = UFO.derive({
  Widget: Widget,
  Nav: UFO.Nav.derive({
    toHistory: function (state) {
      var keep = this.path(state)
      if (state.data)
        keep.data = state.data;
      return keep;
    }
  }),

  Theme: UFO.Theme.derive({
    colors: {
      'primary': Sky.rgb(99, 181, 228),
      'accent': Sky.rgb(254, 203, 46),
      'danger': Sky.rgb(218, 51, 49),
      'invalid': Sky.rgb(255, 192, 203),
      'crisp-br': Sky.rgb(220, 220, 220),
      'gentle-br': Sky.rgb(240, 240, 240),
      'focus-br': Sky.rgb(169, 209, 225),
      'hover-br': Sky.rgb(180, 180, 180),
      'white-bg': Sky.rgb(255, 255, 255),
      'faint-bg': Sky.rgb(252, 252, 252),
      'light-bg': Sky.rgb(246, 246, 246),
      'light-text': Sky.rgb(110, 110, 110),
      'medium-text': Sky.rgb(80, 80, 80),
      'dark-text': Sky.rgb(33, 33, 33)
    }
  }),

  Frame: UFO.Frame.derive({
    init: function () {
      this.defs.symbol({id: 'add', viewBox: [-10, -10, 20, 20]})
        .path(P.arc(0, 0, 10, 10, 360) + 'M-1,-6 h2 v5 h5 v2 h-5 v5 h-2 v-5 h-5 v-2 h5z')
        .attrs({'fill-rule': 'evenodd'})
      this.defs.symbol({id: 'remove', viewBox: [-10, -10, 20, 20]})
        .path(P.arc(0, 0, 10, 10, 360) + 'M-1,-6 h2 v5 h5 v2 h-5 v5 h-2 v-5 h-5 v-2 h5z')
        .attrs({'fill-rule': 'evenodd'})
        .transform({rotate: 45})
    },

    __css__: function (theme) {
      return {
        '*': {
          'box-sizing': 'border-box',
        },
        '*[hidden]': {
          'display': 'none !important'
        },

        'button': {
          'cursor': 'pointer'
        },

        'button': {
          'padding': '1em',
          'background': 'none',
          'border': theme.border('crisp-br'),
          'color': theme.color('primary'),
          'cursor': 'pointer',
          'font-weight': 600,
          'transition': 'all 0.3s'
        },

        'button:hover': {
          'border': theme.border('hover-br'),
          'transition': 'all 0.3s'
        },

        'button.add, button.remove': {
          'padding': '0 1em',
          'border': '0'
        },

        'button.add': {
          'fill': theme.color('accent')
        },

        'button.remove': {
          'fill': theme.color('danger')
        },

        '.danger button': {
          'color': theme.color('danger')
        },

        '.icon': {
          'width': '2em',
          'height': '2em'
        }
      }
    }
  })
})
