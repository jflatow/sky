var Sky = require('../sky')
var Sun = require('../sun')
var Orb = require('../ext/orb')
var UFO = require('../kit/ufo')

var U = Sky.util, P = Sky.path, map = U.map, pop = U.pop;
var L = Sun.list, up = Sun.up, cat = Sun.cat;

var optify = function (opts, key, over) {
  return up((opts instanceof Object) ? opts : Sun.object([[key, opts]]), over)
}

Sky.Elem.prototype.update({
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
  inputs: function (desc) {
    var desc = up({options: []}, desc)
    return desc.options.reduce(function (s, d) {
      var d = [].concat(d)
      return s.input(up(desc, {value: d[0], label: d[1] || d[0]})), s;
    }, this)
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

Sky.Elem.prototype.update({
  barbell: Orb.type(function Barbell(root, opts) {
    var opts = this.opts = up({}, opts)
    var path = this.path = opts.path;
    var elem = this.elem = root.g({class: 'barbell'}).addClass(opts.classes)
    elem.flex(['fit', '100%', 'fit'], true)
    this.kids = ['l', 'c', 'r'].reduce(function (kids, k, i) {
      var e = elem.nth(i).addClass(k)
      if (opts[k])
        kids.push(e.apply(opts[k]))
      return kids
    }, [])
  }, {
    __css__: {
      '.barbell': {
        'align-items': 'center'
      }
    },

    collapse: function (b) {
      Orb.prototype.collapse.apply(this, arguments)
      this.kids.map(function (kid) { kid.collapse(b) })
    }
  }),

  stack: Orb.type(function Stack(root, opts) {
    var opts = this.opts = up({}, opts)
    var path = this.path = opts.path;
    var elem = this.elem = root.g({class: 'stack'}).addClass(opts.classes)
    this.kids = elem.map(opts.items)
  }, {
    collapse: function (b) {
      Orb.prototype.collapse.apply(this, arguments)
      this.kids.map(function (kid, i) { kid[i ? 'hide' : 'collapse'](b) })
    }
  }),

  panel: Orb.type(function Panel(root, opts) {
    var opts = this.opts = up({}, opts)
    var path = this.path = opts.path;
    var elem = this.elem = root.g({class: 'panel'}).addClass(opts.classes)
    var head = this.head = elem.titleBar(optify(opts.title, 'c'))
    var body = this.body = elem.stack({items: opts.items})
    this.kids = [body]
  }, {
    __css__: function (theme) {
      return {
        '.panel': {
          'margin-bottom': '1em',
          'border': theme.lookup(['borders', 'crisp'])
        },

        '.panel .title-bar': {
          'background-color': theme.lookup(['colors', 'light-bg']),
          'border-bottom': theme.lookup(['borders', 'crisp'])
        },

        '.panel .title-bar .c': {
          'padding': '1em'
        }
      }
    },

    collapse: function (b) {
      Orb.prototype.collapse.apply(this, arguments)
      this.body.collapse(b)
    }
  }),

  field: Orb.type(function Field(root, opts) {
    var opts = this.opts = up({}, opts)
    var path = this.path = opts.path;
    var elem = this.elem = root.g({class: 'field'}).addClass(opts.classes)
    var desc = elem.g({class: 'description'})
    opts.epithet && desc.g({class: 'epithet'}).txt(opts.epithet)
    opts.advice && desc.g({class: 'advice'}).txt(opts.advice)
    var ctrl = elem.g({class: 'control'})
    ctrl.apply(opts.control || ['input'])
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
        '.field.inline .control': {
          'flex': '0 0 auto'
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
          'color': theme.lookup(['colors', 'light-text'])
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
        }
      }
    },

    collapse: function (b) {
      Orb.prototype.collapse.apply(this, arguments)
      this.elem.each('.advice', function (e) { Sky.$(e).hide(b) })
        }
  }),

  listEditor: Orb.type(function ListEditor(root, opts) {
    var self = this;
    var opts = this.opts = up({}, opts)
    var path = this.path = opts.path;
    var base = this.base = root.panel({
      classes: cat(['list-editor'], opts.classes),
      title: optify(opts.title, 'c', {
        r: ['addButton', {action: function () { self.addItem() }}]
      })
    })
    this.kids = []
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
          'color': theme.lookup(['colors', 'light-text'])
        },

        '.list-editor-item + .list-editor-item': {
          'border-top': theme.lookup(['borders', 'gentle'])
        },

        '.list-editor-item .r': {
          'opacity': 0,
          'transition': 'opacity 0.3s'
        },

        '.list-editor-item:hover .r': {
          'opacity': 1,
          'transition': 'opacity 0.3s'
        }
      }
    },

    load: function (json) {
      var path = this.path || []
      var part = Sun.lookup(json || {}, path)
      map(this.kids, this.removeItem.bind(this)) // NB: mutates list, must use copy-map
      return map(part, this.addItem.bind(this)), this;
    },
    dump: function (json) {
      return Sun.modify(json, this.path || [], this.kids.map(function (k) { return k.dump() }))
    },

    collapse: function (b) {
      Orb.prototype.collapse.apply(this, arguments)
      this.base.collapse(b)
    },

    addItem: function (data) {
      var self = this;
      var item = this.base.body.elem.barbell({
        classes: ['list-editor-item'],
        c: this.opts.item,
        r: ['removeButton', {action: function () { self.removeItem(item) }}]
      })
      item.elem.on('click', this.selectItem.bind(this, item))
      L.append(this.kids, item.load(data))
      this.base.elem.fire('list-change', {editor: this, item: item, kind: 'add'}, {bubbles: true})
      this.selectItem(item)
    },

    removeItem: function (item) {
      L.drop(this.kids, item).elem.remove()
      this.base.elem.fire('list-change', {editor: this, item: item, kind: 'remove'}, {bubbles: true})
    },

    selectItem: function (item) {
      this.kids.map(function (kid) {
        kid.activate(kid == item)
        kid.collapse(kid != item)
      })
    }
  }),

  titleBar: function (opts) {
    return this.barbell(up(opts, {classes: cat(['title-bar'], opts.classes)}))
  },

  addButton: function (opts) {
    return this.button(up({class: 'add', icon: '#add'}, opts))
  },
  removeButton: function (opts) {
    return this.button(up({class: 'remove', icon: '#remove'}, opts))
  }
})

var Std = module.exports = UFO.derive({
  Nav: UFO.Nav.derive({
    toHistory: function (state) {
      var keep = this.path(state)
      if (state.data)
        keep.data = state.data;
      return keep;
    }
  }),

  Theme: UFO.Theme.derive({
    borders: {
      'crisp': '1px solid rgb(220, 220, 220)',
      'gentle': '1px solid rgb(240, 240, 240)'
    },
    colors: {
      'light-bg': 'rgb(246, 246, 246)',
      'light-text': 'rgb(110, 110, 110)'
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
    }
  }, {
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
