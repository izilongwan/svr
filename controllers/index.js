const homeRoute     = require('./homeRoute')
const aboutRoute    = require('./aboutRoute')
const noLayoutRoute = require('./noLayoutRoute')
const notFoundRoute = require('./notFoundRoute')
const upload        = require('./upload')
const merge         = require('./merge')
const UploadFile         = require('./UploadFile')

module.exports = {
  homeRoute,
  aboutRoute,
  noLayoutRoute,
  notFoundRoute,

  upload,
  merge,
  UploadFile,
}
