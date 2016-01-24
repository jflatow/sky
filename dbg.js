module.exports = {
  reload: function (path) {
    var path = path || module.filename;
    delete require.cache[require.resolve(path)]
    return require(path)
  }
}
