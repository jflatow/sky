var Sky = require('../sky')
var Sun = require('../sun')
var Orb = require('../ext/orb')
var UFO = require('../kit/ufo')

var U = Sky.util, P = Sky.path, dfn =U.dfn, map = U.map, pop = U.pop, pre = U.pre;
var L = Sun.list, up = Sun.up, cat = Sun.cat, get = Sun.get;

var optify = function (opts, key, over) {
  return up((opts instanceof Object) ? opts : Sun.object([[key, opts]]), over)
}

var prepend = function (opts, path, pre) {
  return Sun.modify(opts, path, function (v) { return cat(pre, v) })
}

var Widget = Orb.derive({
  stdOpts: function (o, f, c, d) {
    var opts = this.opts = up(f ? d || {} : this.opts, o)
    if (f || o.classes)
      this.elem.attrs({class: c || ''}).addClass(opts.classes)
    if (o.style)
      this.elem.style(opts.style)
    if (o.mutex)
      this.mutex = opts.mutex;
    if (o.upon)
      Sun.fold(function (e, i, w) { return e.upon(i[0], i[1]) }, this.elem, o.upon)
    return opts;
  },

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
    return map(this.kids, this.removeKid.bind(this))
  },
  selectKid: function (kid) {
    map(this.kids, function (k) {
      k.activate(k === kid)
      k.collapse(k !== kid)
    })
  },

  // body delegation methods
  // NB: could index paths here for faster access
  createItem: function () {
    return this.walk('body', 'createKid', arguments)
  },
  removeItem: function (item) {
    return this.walk('body', 'removeKid', arguments)
  },
  selectItem: function (item) {
    return this.walk('body', 'selectKid', arguments)
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
    var p = this.path || [], e = this.mutex;
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
  path: 'opts'
})

Sky.Elem.prototype.update({
  stack: Widget.type(function Stack(root, opts) {
    this.elem = root.g()
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
          self[k] && self[k].elem.addClass(k)
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
          'flex': '1 1 80%'
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
          'font-weight': 600
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
      if (f || o.control)
        ctrl.clear().apply(opts.control || ['input'])
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
          'border-bottom': theme.border('crisp-br')
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
          b.head = ['barbell', prepend(optify(opts.title, 'body'), ['classes'], ['title-bar'])]
        if (opts.items)
          b.body = ['stack', {items: opts.items}]
        if (opts.status)
          b.foot = ['barbell', prepend(optify(opts.status, 'body'), ['classes'], ['status-bar'])]
        this.base.setOpts(b)
      }
    }
  }),

  popup: Widget.type(function Popup(root, opts) {
    this.base = root.pillar()
    this.setOpts(opts || {}, true)
    this.elem.tapout(this.activate.bind(this, false))
    this.activate()
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
      var ax = dfn(opts.ax, 1), ay = dfn(opts.ay, 0),
          bx = dfn(opts.bx, -ax), by = dfn(opts.by, -ay),
          dx = dfn(opts.dx, 16 * ax), dy = dfn(opts.dy, 16 * ay)
      var abox = (opts.abox || this.elem.parent().bbox(opts.fixed))
      var elem = this.elem
          .align(abox.shift(dx, dy), ax, ay).anchor(bx, by)
          .style({position: opts.fixed ? 'fixed' : 'absolute', zIndex: 1})
      if (f || o.items)
        this.base.setOpts(Sun.select(opts, ['head', 'body', 'foot']))
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
        '.list-editor .stack:empty': {
          'padding': '1em',
          'text-align': 'center'
        },

        '.list-editor .stack:empty::after': {
          'content': '"No items"',
          'font-size': '0.8em',
          'color': theme.color('light-text')
        },

        '.list-editor-item + .list-editor-item': {
          'border-top': theme.border('gentle-br')
        },

        '.list-editor-item .foot': {
          'opacity': 0,
          'transition': 'opacity 0.3s'
        },

        '.list-editor-item:hover .foot': {
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
            foot: ['addButton', {action: function () { self.listAdd() }}]
          })
        })
    },

    load: function (json) {
      var part = Sun.lookup(json || {}, this.path || [])
      var items = this.walk('body').kids;
      map(items, this.listRemove.bind(this))
      map(part, this.listAdd.bind(this))
      return this;
    },
    dump: function (json) {
      var items = this.walk('body').kids;
      return Sun.modify(json, this.path || [], items.map(function (i) { return i.dump() }))
    },

    listAdd: function (data) {
      var self = this;
      var item = this.createItem(['barbell', {
        classes: ['list-editor-item'],
        body: this.opts.item,
        foot: ['removeButton', {action: function () { self.listRemove(item) }}]
      }]).load(data)
      item.elem.on('click', this.bind('selectItem', item))
      this.selectItem(item)
      this.elem.fire('list-change', {editor: this, item: item, kind: 'add'}, {bubbles: true})
    },

    listRemove: function (item) {
      this.removeItem(item)
      this.elem.fire('list-change', {editor: this, item: item, kind: 'remove'}, {bubbles: true})
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
      'invalid': Sky.rgb(255, 192, 203),
      'crisp-br': Sky.rgb(220, 220, 220),
      'gentle-br': Sky.rgb(240, 240, 240),
      'white-bg': Sky.rgb(255, 255, 255),
      'light-bg': Sky.rgb(246, 246, 246),
      'light-text': Sky.rgb(110, 110, 110)
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

    __css__: {
      '*': {
        'box-sizing': 'border-box'
      },
      '*[hidden]': {
        'display': 'none !important'
      },

      'button': {
        'cursor': 'pointer'
      },

      '.icon': {
        'width': '2em',
        'height': '2em'
      }
    }
  })
})
