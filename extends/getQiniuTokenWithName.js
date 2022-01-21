const { QINIU_CONFIG } = require('../config')
const Qiniu = require('qiniu')
const { mac } = require('./getQiniuMacConfig')

// 获取上传Token并且能指定文件名字
module.exports = function getQiniuTokenWithName(nameReWrite, expires = 60 * 60 * 5) {
  const options = {
      scope: QINIU_CONFIG.bucket['upload-imgs'] + ":" + nameReWrite,
      expires,
      returnBody: '{"key":"$(key)","etag":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
  }
  const putPolicy = new Qiniu.rs.PutPolicy(options)
  const uploadToken = putPolicy.uploadToken(mac)

  return uploadToken
}
