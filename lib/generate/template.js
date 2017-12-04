const match = require('multimatch')
const isBinaryPath = require('is-binary-path')

module.exports = (
  {
    skipInterpolation
  } = {}
) => {
  return ctx => {
    const fileList = ctx.fileList
    let matchedFile
    if (skipInterpolation) {
      if (typeof skipInterpolation === 'function') {
        matchedFile = skipInterpolation
      } else {
        const matches = match(fileList, skipInterpolation)
        matchedFile = file => matches.indexOf(file) !== -1
      }
    }

    return Promise.all(fileList.map(relative => run(relative)))

    function run(file) {
      const content = ctx.fileContents(file)

      const shouldSkip = matchedFile && matchedFile(file, content)

      // we skip unmathed files (by multimatch or your own function)
      // and binary files
      if (shouldSkip || isBinaryPath(file)) {
        return
      }

      const res = require('ejs').render(
        content,
        ctx.meta.merged
      )
      ctx.writeContents(file, res)
    }
  }
}
