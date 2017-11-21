'use strict'

const path = require('path')

exports.process = function({ targetPath, templateName } = {}) {
  let gitUser

  return prompt => {
    // 处理默认值为当前目录名
    if (prompt.default === ':folderName:') {
      prompt.default = path.basename(path.resolve(process.cwd(), targetPath))
    }

    // 处理上下文关联
    if (typeof prompt.when === 'string') {
      const exp = prompt.when
      prompt.when = answers => (exp, answers) => {
        const fn = new Function('data', `with (data) { return ${exp} }`)
        try {
          return fn(data)
        } catch (err) {
          console.error(`Error when evaluating filter condition: ${exp}`)
        }
      }

    }

    return prompt
  }
}

exports.test = function() {
  //
}
