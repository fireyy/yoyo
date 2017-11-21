'use strict'

const path = require('path')
const pathExists = require('path-exists')

const cacheDir = path.join(require('user-home'), '.yoyo-templates')

exports.cacheDir = cacheDir

exports.isLocal = function(input) {
  return /^[./]|(^[a-zA-Z]:)/.test(input)
}

exports.isRepo = function(input) {
  return /.+\/.+/.test(input)
}

exports.exists = function(input) {
  return pathExists(input)
}
