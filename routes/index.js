const router = require('koa-router')(),
      { homeRoute,
        aboutRoute,
        noLayoutRoute,
        notFoundRoute,
        UploadFile, } = require('../controllers')

const uploadFile = new UploadFile()

router
  .get('/home', homeRoute)
  .get('/about', aboutRoute)
  .get('/no-layout', noLayoutRoute)
  .post('/api/upload', uploadFile.upload.bind(uploadFile))
  .post('/api/merge', uploadFile.merge.bind(uploadFile))
  .post('/api/check_file_state', uploadFile.checkFileState.bind(uploadFile))
  .get('/api/upload_to_qiniu/:hash', uploadFile.uploadToQiniu.bind(uploadFile))
  .get('/(.*)', notFoundRoute)

module.exports = router;
