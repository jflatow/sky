var Sky = require('sky')

Sky.SVGElem.prototype.update({
  overflow: function (w, f) {
    var node = this.node, i, N = node.getNumberOfChars()
    for (i = N; i > 0; i--)
      if (node.getSubStringLength(0, i) < w)
        break;
    return f ? f.call(this, i, N) : i;
  },

  elide: function (w, e, l) {
    var e = def(e, '\u2026'), l = def(l, 4)
    return this.overflow(w, function (i, N) {
      if (i < N)
        this.txt(this.node.textContent.substr(0, i - l) + e)
      return this;
    })
  },

  wrap: function (box, opts) {
    var opts = up({sep: /\s/}, opts)
    var bbox = opts.bbox || box, sep = opts.sep;
    var trim = opts.trim || function (t) { return t.replace(/^\s+/, '') }
    var text = this.node.textContent, elem = this.txt('')
    var base = {'alignment-baseline': elem.attr('dominant-baseline'),
                'text-anchor': elem.attr('text-anchor'),
                'x': elem.attr('x')}
    var line = elem.tspan(text).attrs(base)
    while (line && line.overflow(box.w, function (i, N) {
      if (i == N)
        return;
      var k;
      for (var j = i - 1; j; j--) {
        if (text[j].match(sep)) {
          k = j + 1;
          line.txt(text.substr(0, k))
          line = elem.tspan(text = trim(text.substr(k))).attrs(base).attrs({dy: box.h})
          break;
        }
      }
      if (k)
        return line;
      line.elide(box.w)
    })) { bbox = bbox.copy({h: bbox.h + box.h}) }
    return bbox;
  }
})
