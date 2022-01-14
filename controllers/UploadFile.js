const path = require('path')
const fs = require('fs')
const multiparty = require('multiparty')

class UploadFile {
  constructor (
    UPLOAD_DIR = path.resolve(__dirname, '../upload/')) {
    this.UPLOAD_DIR = UPLOAD_DIR;
  }

  async upload (ctx) {
    const { UPLOAD_DIR } = this
    const form = new multiparty.Form({
      uploadDir: 'upload',
    })

    const ret = await new Promise((resolve, reject) => {
      form.parse(ctx.req, async (err, fields, file) => {
        // console.log('🚀 ~ fields, file', fields)

        const paramArr = [fields, file, UPLOAD_DIR, ctx]

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

    ctx.body = ret || {
      code: 0,
      msg: 'success',
    }
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

  async sliceUpload(fields, file, UPLOAD_DIR) {
    const { index, hash, ext, oldFilename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(UPLOAD_DIR, `${ hash }/${ index }.${ ext }`)
    const chunkDir = path.resolve(UPLOAD_DIR, `${ hash }`)

    const isExist = await fs.existsSync(chunkDir)

    // console.log('🚀 ~ isExist', isExist, path, chunkDir)
    if (!isExist) {
      await fs.mkdirSync(chunkDir);
    }
    // console.log(oldName, nowName);
    await fs.renameSync(oldName, nowName)
  }

  async commonUpload(fields, file, UPLOAD_DIR, ctx) {
    const { oldFilename, filename } = this.getFileInfo(fields, file)
    const oldName = path.resolve(__dirname, `../${ oldFilename }`)
    const nowName = path.resolve(UPLOAD_DIR, filename)

    await fs.renameSync(oldName, nowName)

    const url = `${ ctx.host }/${filename}`

    return {
      code: 0,
      data: {
        url,
      },
      message: "file upload success",
    }
  }

  async merge (ctx) {
    const { UPLOAD_DIR } = this

    const { body, host } = ctx.request
    const { hash, size, ext, total, chunk_size, } = body;

    const filePath = path.resolve(UPLOAD_DIR, `${ hash }.${ ext }`);

    const url = `${ host }/${ hash }.${ ext }`
    const ret = await this.mergeFileChunk({ filePath, hash, size, chunk_size, url, total, });

    ctx.body = ret
  }


  // 拼接切片
  pipeStream (path, writeStream) {
    return new Promise(resolve => {
      try {
        const readStream = fs.createReadStream(path);
        readStream.on("end", () => {
          fs.unlinkSync(path);
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
    const { UPLOAD_DIR } = this
    const chunkDir = path.resolve(UPLOAD_DIR, hash);
    const chunkPaths = await fs.readdirSync(chunkDir);
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

    try {
      await fs.rmdirSync(chunkDir); // 合并后删除保存切片的目录
    } catch (error) {

    }

    // console.log(ret);

    return {
      code: 0,
      data: {
        url,
      },
      message: "file merged success",
    }
  }
}

module.exports = UploadFile
