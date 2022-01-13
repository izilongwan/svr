const router = require('koa-router')(),
      { homeRoute,
        aboutRoute,
        noLayoutRoute,
        notFoundRoute,
        upload,
        merge, } = require('../controllers')

router
  .get('/home', homeRoute)
  .get('/about', aboutRoute)
  .get('/no-layout', noLayoutRoute)
  .get('/(.*)', notFoundRoute)
  .post('/api/upload', upload)
  .post('/api/merge', merge)

module.exports = router;
