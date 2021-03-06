const path = require('path')
const fs = require('fs-extra')
const globby = require('globby')
const ware = require('ware')

class Stream {
  constructor() {
    this.middlewares = []
    this.meta = {}
  }

  source(source, {
    baseDir = '.',
    dotFiles = true
  } = {}) {
    this.baseDir = path.resolve(baseDir)
    this.sourcePatterns = source
    this.dotFiles = dotFiles
    return this
  }

  use(middleware) {
    this.middlewares.push(middleware)
    return this
  }

  async process() {
    const statCache = {}
    const paths = await globby(this.sourcePatterns, {
      nodir: true,
      cwd: this.baseDir,
      dot: this.dotFiles,
      statCache
    })

    this.files = {}

    await Promise.all(paths.map(relative => {
      const absolutePath = path.resolve(this.baseDir, relative)
      return fs.readFile(absolutePath)
        .then(contents => {
          const stats = statCache[path.isAbsolute(this.baseDir) ? absolutePath : relative]
          const file = { contents, stats, path: absolutePath }
          this.files[relative] = file
        })
    }))

    await new Promise((resolve, reject) => {
      ware().use(this.middlewares).run(this, err => {
        if (err) return reject(err)
        resolve()
      })
    })

    return this.files
  }

  filter(fn) {
    return this.use(context => {
      for (const relative in context.files) {
        if (!fn(relative, context.files[relative])) {
          delete context.files[relative]
        }
      }
    })
  }

  transform(relative, fn) {
    const contents = this.files[relative].contents.toString()
    const result = fn(contents)
    if (!result.then) {
      this.files[relative].contents = Buffer.from(result)
      return
    }
    return result.then(newContents => {
      this.files[relative].contents = Buffer.from(newContents)
    })
  }

  async dest(dest, {
    baseDir = '.',
    clean
  } = {}) {
    const destPath = path.resolve(baseDir, dest)
    const files = await this.process()

    if (clean) {
      await fs.remove(destPath)
    }

    await Promise.all(Object.keys(files).map(filename => {
      const { contents } = files[filename]
      const target = path.join(destPath, filename)
      return fs.ensureDir(path.dirname(target))
        .then(() => fs.writeFile(target, contents))
    }))
  }

  fileContents(relative) {
    return this.file(relative).contents.toString()
  }

  writeContents(relative, string) {
    this.files[relative].contents = Buffer.from(string)
    return this
  }

  fileStats(relative) {
    return this.file(relative).stats
  }

  file(relative) {
    return this.files[relative]
  }

  deleteFile(relative) {
    delete this.files[relative]
    return this
  }

  createFile(relative, file) {
    this.files[relative] = file
    return this
  }

  get fileList() {
    return Object.keys(this.files).sort()
  }
}

module.exports = opts => new Stream(opts)
