const multiparty = require('multiparty')
const { resolve } = require('path')
const fs = require('fs')
const fsPromises = fs.promises

module.exports = async (ctx) => {
  const form = new multiparty.Form({
    uploadDir: 'static'
  })

  const UPLOAD_DIR = resolve(__dirname, '../static/')

  form.parse(ctx.req, async (err, fields, file) => {
    console.log('🚀 ~ fields, file', fields)

    const [index] = fields.index
    const [hash] = fields.hash
    const [total] = fields.total
    const [{ path, size }] = file.file
    const [, ext] = path.split('.')
    const oldName = resolve(__dirname, `../${ path }`)
    const nowName = resolve(UPLOAD_DIR, `${ hash }/${ index }.${ ext }`)
    const chunkDir = resolve(UPLOAD_DIR, `${ hash }`)

    const isExist = await fs.existsSync(chunkDir)

    // console.log('🚀 ~ isExist', isExist)
    if (!isExist) {
      await fs.mkdirSync(chunkDir);
    }

    const ret = await fsPromises.rename(oldName, nowName)
    // console.log('🚀 ~ ret', ret)
  })

  ctx.body = {
    code: 0,
    msg: 'success',
  }
}
