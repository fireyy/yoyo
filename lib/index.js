'use strict'

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const mkdirp = require('mkdirp')
const inquirer = require('inquirer')
const yarnInstall = require('yarn-install')
const pathUtils = require('./path-utils')
const tplUtils = require('./tpl-utils')
const log = require('./log')
const yoyoError = require('./error')

// 列出所有已经缓存的模版
exports.list = () => {
  const templates = tplUtils.getAll()

  console.log(chalk.cyan(`\n  All installed templates:\n`))

  if (templates.length === 0) {
    console.log('  not yet')
  } else {
    for (const item of templates) {
      console.log(`  ${item.replace(/-([\s\S]+)/, (m, p1) => `/${chalk.bold(p1)}`)}`)
    }
  }
}

exports.init = async (options) => {

  let { source, target = './', update } = options

  // 判断 target 是否为 ./ 需要用户确认继续
  if (target === "./") {
    const { create } = await inquirer.prompt([
      {
        name: 'create',
        message: `Do you confirm to init new project in path ${chalk.yellow(path.resolve(target))}? May be you need to do in a subfolder.`,
        type: 'confirm',
        default: false
      }
    ])

    if (!create) return
  }

  // 确保缓存目录存在
  if (!fs.existsSync(pathUtils.cacheDir)) {
    mkdirp.sync(pathUtils.cacheDir)
  }

  const templateName = source.replace(/(.+)[#@].+$/, '$1')
  const spinner = require('ora')('Downloading...')

  let dest

  if (pathUtils.isLocal(source)) {
    // 本地目录
    dest = path.resolve(process.cwd(), source)
  } else if (pathUtils.isRepo(source)) {
    // 远程 git 仓库
    const folderName = templateName.replace('/', '-')
    dest = path.join(pathUtils.cacheDir, folderName)

    const exists = await pathUtils.exists(dest)
    if (options.update || !exists) {
      log.warn(`You don’t seem to have a template with the name \`${templateName}\` installed.`)
      log.info(`Start install missing template \`${templateName}\` for you.`)
      // 下载进度控制
      spinner.start()
      await tplUtils.download(source, dest, folderName).catch(err => {
        spinner.stop()
        throw new yoyoError('Download error, check if the url is vaild or retry later.')
      })
      spinner.stop()
      log.info('Installing its dependencies now.')
      yarnInstall({ cwd: dest, production: true })
    }
  } else {
    throw new yoyoError('ah~~')
  }

  return await tplUtils.render({
    fromPath: dest,
    targetPath: target,
    template: source,
    templateName
  }).catch(err => {
    spinner.stop()
    // 自定义错误只显示 message
    log.error(err.name == 'yoyoError' ? err.message : err.stack)
    process.exit(1)
  })

}
