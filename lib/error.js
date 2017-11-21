module.exports = class yoyoError extends Error {
  constructor(message) {
    super(message)
    this.name = this.constructor.name
  }
}
