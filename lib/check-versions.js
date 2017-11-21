var fetch = require('node-fetch')
var semver = require('semver')
var chalk = require('chalk')
var packageConfig = require('../package.json')

module.exports = function () {
  // Ensure minimum supported node version is used
  if (!semver.satisfies(process.version, packageConfig.engines.node)) {
    return console.log(chalk.red(
      '  You must upgrade node to >=' + packageConfig.engines.node + '.x to use yoyo'
    ))
  }

  return fetch('https://registry.npmjs.org/yoyo', {timeout: 1000})
  .then(res => res.json())
  .then(body => {
    var latestVersion = body['dist-tags'].latest
    var localVersion = packageConfig.version
    if (semver.lt(localVersion, latestVersion)) {
      console.log(chalk.yellow('  A newer version of yoyo is available.'))
      console.log()
      console.log('  latest:    ' + chalk.green(latestVersion))
      console.log('  installed: ' + chalk.red(localVersion))
      console.log()
    }
  }).catch(err => {
    //
  })
}
