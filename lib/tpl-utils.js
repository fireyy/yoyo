'use strict'

const fs = require('fs')
const path = require('path')
const generate = require('./generate')
const chalk = require('chalk')
const shelljs = require('shelljs')
const downloadRepo = require('download-git-repo')
const pathUtils = require('./path-utils')
const promptUtils = require('./prompt-utils')
const log = require('./log')
const yoyoError = require('./error')

const getConfig = function(dir, configFileName) {
  return new Promise((resolve, reject) => {
    const configPath = path.join(dir, configFileName)
    fs.exists(configPath, exists => {
      if (!exists) return resolve(null)
      try {
        resolve(require(configPath))
      } catch (err) {
        reject(err)
      }
    })
  })
}

exports.getAll = function() {
  return fs.readdirSync(pathUtils.cacheDir)
}

exports.getConfig = getConfig

exports.download = async function(repo, dest, folderName) {
  return new Promise((resolve, reject) => {
    downloadRepo(repo, dest, err => {
      if (err) return reject(err)
      resolve(dest)
    })
  })
}

exports.render = async function(
  {
    fromPath,
    targetPath,
    template,
    templateName
  } = {}
) {
  let configFileName = 'yoyo.config.js';

  const templateExists = await pathUtils.exists(fromPath)

  if (!templateExists) {
    throw new yoyoError(`Template path "${fromPath}" does not exist!`)
  }

  let projectConfig = await getConfig(fromPath, configFileName)
  let skips
  let prompts
  let filters
  let complete
  let templateFolder = './'
  let move
  let install

  if (projectConfig) {
    templateFolder = projectConfig.templateFolder || 'template'
    // 需要忽略的文件
    skips = projectConfig.skips
    // 文件筛选规则
    filters = projectConfig.filters
    // 移动文件
    move = projectConfig.move
    // 是否安装 npm 依赖
    install = projectConfig.install
    // 执行完毕的回调
    complete = projectConfig.complete

    // 获得用户输入的答案
    if (projectConfig.prompts) {
      if (Array.isArray(projectConfig.prompts)) {
        prompts = projectConfig.prompts
      } else {
        prompts = Object.keys(projectConfig.prompts).map(name =>
          Object.assign(
            {
              name
            },
            projectConfig.prompts[name]
          )
        )
      }

      prompts = prompts.map(
        promptUtils.process({
          targetPath,
          templateName
        })
      )
    }
  }

  const folderPath = path.resolve(process.cwd(), targetPath)
  const folderName = path.basename(folderPath)
  const isNewFolder = targetPath !== './'
  const templateContext = {
    folderName,
    folderPath,
    isNewFolder
  }

  return await generate(path.join(fromPath, templateFolder), targetPath, {
    skipInterpolation: skips,
    prompts,
    data (answers) {
      const templateData =
        typeof projectConfig.data === 'function'
          ? projectConfig.data(answers)
          : projectConfig.data
      return Object.assign({}, templateData, { _: templateContext })
    },
    filters,
    move,
    clean: false,
    // 无配置的时候跳过模版渲染
    disableInterpolation: !projectConfig
  }).then(res => {
    // 创建回调
    const actionContext = Object.assign(
      {},
      res,
      {
        shelljs,
        chalk,
        log,
        install: () => {
          require('yarn-install')({ cwd: folderPath })
        },
        show: () => {
          log.success('Done!')
          if (isNewFolder) {
            log.info(`cd ${chalk.yellow(folderName)} to get started!`)
          }
        }
      },
      templateContext
    )

    if (install) {
      actionContext.install()
    }

    if (complete) {
      const action = complete(actionContext)
      if (action && action.then) return action.then(() => res)
    } else {
      // 没有回调显示默认信息
      actionContext.show()
    }
  })
}
