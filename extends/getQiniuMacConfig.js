const Qiniu = require('qiniu')
const { QINIU_CONFIG } = require('../config')

const config = new Qiniu.conf.Config()

config.zone = Qiniu.zone.Zone_z0

module.exports = {
  mac: new Qiniu.auth.digest.Mac(QINIU_CONFIG.AK, QINIU_CONFIG.SK),

  config
}
