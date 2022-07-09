const path = require('path')
const multiparty = require('multiparty')
const { fsSyncCatch: fs, CODE, getQiniuTokenWithName, getQiniuMacConfig } = require('../extends')
const Qiniu = require('qiniu')
const { HOST, QINIU_CONFIG } = require('../config')

class UploadFile {
  constructor (
    ABSOLUTE_UPLOAD_DIR = path.resolve(__dirname, '../upload/'),
    uploadDir = 'upload'
  ) {
    this.ABSOLUTE_UPLOAD_DIR = ABSOLUTE_UPLOAD_DIR;
    this.uploadDir = uploadDir;
  }

  getFileInfo (fields, file) {
    const [index] = fields.index || []
    const [hash] = fields.hash || []
    const [total] = fields.total || []
    const [{ path: pathname = '', size }] = file.file || []
    const [, ext] = pathname.split('.')

    const filename = `${ hash }`

    return {
      index,
      hash,
      total,
      size,
      ext,
      oldFilename: pathname,
      filename,
    }
  }

  checkFileState (ctx) {
    const { ABSOLUTE_UPLOAD_DIR } = this
    const { hash = '', ext = '' } = ctx.request.body

    const filename = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }.${ ext }`)
    const [err, isExistFile] = fs.existsSyncCatch(filename)
    // console.log('🚀 ~ filename', filename)

    if (err) {
      return CODE.CHECK_PATHNAME_ERROR
    }

    // 文件存在
    if (isExistFile) {
      const url = `${ ctx.host }/${ hash }.${ ext }`

      ctx.body = {
        ...CODE.SUCCESS,
        data: {
          is_exist: isExistFile,
          url,
        }
      }
      return
    }

    // 文件不存在
    const dirname = path.resolve(ABSOLUTE_UPLOAD_DIR, hash)
    const [err1, isExistDir] = fs.existsSyncCatch(dirname)

    if (err1) {
      return CODE.CHECK_PATHNAME_ERROR
    }

    const chunks = []

    if (isExistDir) {
      const [err2, dirList] = fs.readdirSyncCatch(dirname)

      if (err2) {
        ctx.body = CODE.READ_DIR_ERROR
        return
      }

      Object.assign(chunks, dirList.map(file => file.split('.')[0])).sort((a, b) => a - b)
    }

    ctx.body = {
      ...CODE.SUCCESS,
      data: {
        chunks,
      }
    }
  }

  async upload (ctx) {
    const { ABSOLUTE_UPLOAD_DIR, uploadDir } = this
    const form = new multiparty.Form({
      uploadDir,
    })

    const ret = await new Promise((resolve, reject) => {
      form.parse(ctx.req, async (err, fields, file) => {
        // console.log('🚀 ~ fields, file', fields)

        const paramArr = [fields, file, ABSOLUTE_UPLOAD_DIR, ctx]

        const fileInfo = this.getFileInfo(fields, file)

        const isSliceUpload = (fileInfo.index && fileInfo.total) != null

        const ret = await (
          isSliceUpload
            ? this.sliceUpload(...paramArr)
            : this.commonUpload(...paramArr)
        )

        resolve(ret)
      })
    })

    ctx.body = ret
  }

  async sliceUpload (fields, file, ABSOLUTE_UPLOAD_DIR) {
    const { index, hash, ext, oldFilename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }/${ index }`)
    const chunkDir = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }`)

    const [err0, isExist] = fs.existsSyncCatch(chunkDir)

    if (err0) {
      return CODE.CHECK_PATHNAME_ERROR
    }

    // console.log('🚀 ~ isExist', isExist, path, chunkDir)
    if (!isExist) {
      const [err1] = fs.mkdirSyncCatch(chunkDir);

      if (err1) {
        return CODE.MAKE_DIR_ERROR
      }
    }
    // console.log(oldName, nowName);
    const [err2] = fs.renameSyncCatch(oldName, nowName)

    if (err2) {
      return CODE.RENAME_FILE_ERROR
    }

    return CODE.SUCCESS
  }

  async commonUpload (fields, file, ABSOLUTE_UPLOAD_DIR, ctx) {
    const { oldFilename, filename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(ABSOLUTE_UPLOAD_DIR, filename)

    const [err0] = fs.renameSyncCatch(oldName, nowName)

    if (err0) {
      return CODE.RENAME_FILE_ERROR
    }

    const url = `${ ctx.host }/${ filename }`

    return {
      ...CODE.SUCCESS,
      data: {
        url,
      },
    }
  }

  async merge (ctx) {
    const { ABSOLUTE_UPLOAD_DIR } = this
    const { body, host } = ctx.request
    const { hash, size, ext, total, chunk_size, } = body;
    const chunkDir = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }`);
    const filePath = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }.${ ext }`);

    if (fs.existsSync(`${ chunkDir }/${ hash }.${ ext }`)) {
      ctx.body = {
        ...CODE.SUCCESS,
        data: {
          url: `${ host }/${ hash }/${ hash }.${ ext }`,
        }
      }
      return
    }

    const url = `${ host }/${ hash }/${ hash }.${ ext }`
    const ret = await this.mergeFileChunk({ ext, filePath, hash, size, chunk_size, url, total, host });

    ctx.body = ret
  }

  // 拼接切片
  pipeStream (path, writeStream) {
    return new Promise((resolve, reject) => {
      try {
        const readStream = fs.createReadStream(path)

        readStream.on('end', async () => {
          const [err] = fs.unlinkSyncCatch(path)

          if (err) {
            reject(err)
          }
          resolve(path)
        });

        try {
          readStream.pipe(writeStream)
        } catch (error) {
          console.log(error)
        }

      } catch (error) {
        reject(error)
      }
    });
  }

  // 合并切片
  async mergeFileChunk ({ ext, filePath, hash, size, chunk_size, url }) {
    const { ABSOLUTE_UPLOAD_DIR } = this
    const chunkDir = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }`);
    const [err0, chunkPaths] = fs.readdirSyncCatch(chunkDir);

    if (err0) {
      return CODE.READ_DIR_ERROR
    }

    // const len = chunkPaths.length

    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序可能会错乱
    chunkPaths.sort((a, b) => a - b);
    chunkPaths.forEach((chunkPath) => {
      const cp = `${ chunkDir }/${ chunkPath }`
      const mp4Path = `${ chunkDir }/${ hash }.${ ext }`
      const [_, content] = fs.readFileSyncCatch(cp)

      !fs.existsSyncCatch(mp4Path)
        ? fs.writeFileSyncCatch(mp4Path, content)
        : fs.appendFileSyncCatch(mp4Path, content)

      fs.unlinkSyncCatch(cp)
    })

    return {
      ...CODE.SUCCESS,
      data: {
        url,
      },
    }
  }

  async uploadToQiniuSpace (filename, localFilename) {
    const uploadToken = getQiniuTokenWithName(filename)  // 生成token这个方法调用了好多次
    const { config } = getQiniuMacConfig  // 根据你的上传空间选择zone对象
    const formUploader = new Qiniu.form_up.FormUploader(config)
    // console.log('🚀 ~ config', config)
    const putExtra = new Qiniu.form_up.PutExtra()
    // console.log('🚀 ~ putExtra', putExtra)

    return await new Promise((resolve, reject) => {
      formUploader.putFile(uploadToken, filename, localFilename, putExtra, (respErr,
        respBody, respInfo) => {
        if (respErr) {
          reject([true, respErr])
        }

        if (respInfo.statusCode == 200) {
          resolve([false, respBody])

        } else {
          console.log(respInfo.statusCode);
          resolve([false, respBody])
        }
      })
    })
  }

  async uploadToQiniu (ctx) {
    const { filename = '', ext = '', hash = '', removeLocalFile = true } = ctx.request.body

    if (!filename) {
      ctx.body = CODE.FILE_NOT_FOUND
      return
    }

    const localFilename = path.resolve(this.ABSOLUTE_UPLOAD_DIR, `${ hash }/${ hash }.${ ext }`)

    const [err, isExistFile] = fs.existsSyncCatch(localFilename)

    if (err) {
      ctx.body = CODE.CHECK_PATHNAME_ERROR
      return
    }

    if (!isExistFile) {
      ctx.body = CODE.FILE_NOT_FOUND
      return
    }

    const [err1, data] = await this.uploadToQiniuSpace(filename, localFilename)

    if (err1) {
      const error = err1
      ctx.body = {
        ...CODE.ERROR,
        error,
      }
      return
    }

    if (removeLocalFile) {
      const [err3, ret3] = fs.unlinkSyncCatch(localFilename)

      if (err3) {
        ctx.body = CODE.FILE_REMOVE_ERROR
        return
      }
    }


    Object.assign(data, { url: `upload.${ HOST }/${ data.key }` })

    ctx.body = {
      ...CODE.SUCCESS,
      data,
    }
  }

  async checkQiniuSpaceState (filename) {
    const { mac, config } = getQiniuMacConfig
    const bucketManager = new Qiniu.rs.BucketManager(mac, config)
    const bucket = QINIU_CONFIG.bucket['upload-imgs']

    return await new Promise((resolve, reject) => {
      let hasError = true
      let data = null

      bucketManager.stat(bucket, filename, function (err, respBody, respInfo) {
        try {
          if (err) {
            data = err
            //throw err;
          } else {
            if (respInfo.statusCode == 200) {
              hasError = false
            }
            data = respBody
          }

        } catch (error) {
          data = error

        } finally {
          const ret = [hasError, data]

          !hasError
            ? resolve(ret)
            : reject(ret)
        }
      })
    })
  }
}

module.exports = UploadFile
