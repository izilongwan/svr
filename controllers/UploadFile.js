const path = require('path')
const multiparty = require('multiparty')
const { fsSyncCatch: fs } = require('../extends')

class UploadFile {
  constructor (
    ABSOLUTE_UPLOAD_DIR = path.resolve(__dirname, '../upload/'),
    uploadDir = 'upload'
  ) {
    this.ABSOLUTE_UPLOAD_DIR = ABSOLUTE_UPLOAD_DIR;
    this.uploadDir = uploadDir;
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

  getFileInfo(fields, file) {
    const [index] = fields.index || []
    const [hash] = fields.hash || []
    const [total] = fields.total || []
    const [{ path: pathname = '', size }] = file.file || []
    const [, ext] = pathname.split('.')

    const filename = `${ hash }.${ ext }`

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

  async sliceUpload(fields, file, ABSOLUTE_UPLOAD_DIR) {
    const { index, hash, ext, oldFilename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }/${ index }.${ ext }`)
    const chunkDir = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }`)

    const [err0, isExist] = fs.existsSyncCatch(chunkDir)

    if (err0) {
      return {
        code: -1,
        message: 'Check File exists failed',
      }
    }

    // console.log('🚀 ~ isExist', isExist, path, chunkDir)
    if (!isExist) {
      const [err1] = fs.mkdirSyncCatch(chunkDir);

      if (err1) {
        return {
          code: -1,
          message: 'Make dir failed',
        }
      }
    }
    // console.log(oldName, nowName);
    const [err2] = fs.renameSyncCatch(oldName, nowName)

    if (err2) {
      return {
        code: -1,
        message: 'Rename file failed',
      }
    }

    return {
      code: 0,
      message: 'Slice file upload success',
    }
  }

  async commonUpload(fields, file, ABSOLUTE_UPLOAD_DIR, ctx) {
    const { oldFilename, filename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(ABSOLUTE_UPLOAD_DIR, filename)

    const [err0] = fs.renameSyncCatch(oldName, nowName)

    if (err0) {
      return {
        code: -1,
        message: 'Rename file failed',
      }
    }

    const url = `${ ctx.host }/${filename}`

    return {
      code: 0,
      data: {
        url,
      },
      message: 'file upload success',
    }
  }

  async merge (ctx) {
    const { ABSOLUTE_UPLOAD_DIR } = this

    const { body, host } = ctx.request
    const { hash, size, ext, total, chunk_size, } = body;

    const filePath = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }.${ ext }`);

    const url = `${ host }/${ hash }.${ ext }`
    const ret = await this.mergeFileChunk({ filePath, hash, size, chunk_size, url, total, });

    ctx.body = ret
  }

  // 拼接切片
  pipeStream (path, writeStream) {
    return new Promise((resolve, reject) => {
      try {
        const readStream = fs.createReadStream(path);
        readStream.on('end', async () => {
          const [err] = fs.unlinkSyncCatch(path);

          if (err) {
            reject(err)
          }
          resolve(path);
        });
        readStream.pipe(writeStream);
      } catch (error) {
        reject(error)
      }
    });
  }

  // 合并切片
  async mergeFileChunk ({ filePath, hash, size, chunk_size, url }) {
    const { ABSOLUTE_UPLOAD_DIR } = this
    const chunkDir = path.resolve(ABSOLUTE_UPLOAD_DIR, hash);
    const [err0, chunkPaths] = fs.readdirSyncCatch(chunkDir);

    if (err0) {
      return {
        code: -1,
        message: 'Read dir failed',
      }
    }

    const len = chunkPaths.length

    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序可能会错乱
    chunkPaths.sort((a, b) => a.split('.')[0] - b.split('.')[0]);
    console.log('🚀 ~ chunkPaths', chunkPaths, size)

    const ret = await Promise.all(
      chunkPaths.map((chunkPath, index) =>
        this.pipeStream(
          path.resolve(chunkDir, chunkPath),
          // 指定位置创建可写流
          fs.createWriteStream(filePath, {
            start: index * chunk_size,
            end: (index === len - 1 ? size : (index + 1) * chunk_size),
          })
        )
      )
    );

    const [err1] = fs.rmdirSyncCatch(chunkDir); // 合并后删除保存切片的目录

    if (err1) {
      return {
        code: -1,
        message: 'Remove file failed',
      }
    }

    return {
      code: 0,
      data: {
        url,
      },
      message: 'file merged success',
    }
  }
}

module.exports = UploadFile
