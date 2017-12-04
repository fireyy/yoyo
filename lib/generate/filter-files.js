const match = require('minimatch')
const evaluate = require('./eval')

module.exports = function (filters) {
  return ctx => {
    if (!filters) return

    if (typeof filters === 'function') {
      filters = filters(ctx.meta.merged)
    }

    const fileList = ctx.fileList
    const data = ctx.meta.merged

    Object.keys(filters).forEach(glob => {
      fileList.forEach(file => {
        if (match(file, glob, { dot: true })) {
          const condition = filters[glob]
          if (!evaluate(condition, data)) {
            ctx.deleteFile(file)
          }
        }
      })
    })
  }
}
