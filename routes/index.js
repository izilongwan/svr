const router = require('koa-router')(),
      { homeRoute,
        aboutRoute,
        noLayoutRoute,
        notFoundRoute,

        UploadFile,
        upload,
        merge, } = require('../controllers')

const uploadFile = new UploadFile()

router
  .get('/home', homeRoute)
  .get('/about', aboutRoute)
  .get('/no-layout', noLayoutRoute)
  .get('/(.*)', notFoundRoute)
  .post('/api/upload', uploadFile.upload.bind(uploadFile))
  .post('/api/merge', uploadFile.merge.bind(uploadFile))
  .post('/api/check_file_state', uploadFile.checkFileState.bind(uploadFile))

module.exports = router;
