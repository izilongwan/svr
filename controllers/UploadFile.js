const path = require('path')
const multiparty = require('multiparty')
const { fsSyncCatch: fs, CODE } = require('../extends')

class UploadFile {
  constructor (
    ABSOLUTE_UPLOAD_DIR = path.resolve(__dirname, '../upload/'),
    uploadDir = 'upload'
  ) {
    this.ABSOLUTE_UPLOAD_DIR = ABSOLUTE_UPLOAD_DIR;
    this.uploadDir = uploadDir;
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
    console.log('🚀 ~ dirname', dirname)
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

  async sliceUpload(fields, file, ABSOLUTE_UPLOAD_DIR) {
    const { index, hash, ext, oldFilename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }/${ index }.${ ext }`)
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

  async commonUpload(fields, file, ABSOLUTE_UPLOAD_DIR, ctx) {
    const { oldFilename, filename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(ABSOLUTE_UPLOAD_DIR, filename)

    const [err0] = fs.renameSyncCatch(oldName, nowName)

    if (err0) {
      return CODE.RENAME_FILE_ERROR
    }

    const url = `${ ctx.host }/${filename}`

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

    const filePath = path.resolve(ABSOLUTE_UPLOAD_DIR, `${ hash }.${ ext }`);

    const url = `${ host }/${ hash }.${ ext }`
    const ret = await this.mergeFileChunk({ filePath, hash, size, chunk_size, url, total, });

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
  async mergeFileChunk ({ filePath, hash, size, chunk_size, url }) {
    const { ABSOLUTE_UPLOAD_DIR } = this
    const chunkDir = path.resolve(ABSOLUTE_UPLOAD_DIR, hash);
    const [err0, chunkPaths] = fs.readdirSyncCatch(chunkDir);

    if (err0) {
      return CODE.READ_DIR_ERROR
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
      return CODE.RENAME_FILE_ERROR
    }

    return {
      ...CODE.SUCCESS,
      data: {
        url,
      },
    }
  }
}

module.exports = UploadFile
