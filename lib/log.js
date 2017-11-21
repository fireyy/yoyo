'use strict'

const chalk = require('chalk')

function log(msg, label) {
  console.log(label, msg)
}

exports.success = function(msg) {
  log(msg, chalk.green('✅ '))
}

exports.error = function(msg) {
  log(msg, chalk.red('🚫 '))
}

exports.warn = function(msg) {
  log(msg, chalk.yellow('⚠️ '))
}

exports.info = function(msg) {
  log(msg, chalk.cyan('♻️ '))
}
