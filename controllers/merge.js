const fs = require('fs')
const { resolve } = require('path')

module.exports = async (ctx) => {
  const UPLOAD_DIR = resolve(__dirname, '../static/')


  const pipeStream = (path, writeStream) =>
    new Promise(resolve => {
      const readStream = fs.createReadStream(path);
      readStream.on("end", () => {
        fs.unlinkSync(path);
        resolve();
      });
      readStream.pipe(writeStream);
    });

  // 合并切片
  const mergeFileChunk = async (filePath, filename, size) => {
    const chunkDir = path.resolve(UPLOAD_DIR, filename);
    const chunkPaths = await fs.readdirSync(chunkDir);

    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序可能会错乱
    chunkPaths.sort((a, b) => a.split('.')[0] - b.split('.')[0]);
    // console.log('🚀 ~ chunkPaths', chunkPaths)

    await Promise.all(
      chunkPaths.map((chunkPath, index) =>
        pipeStream(
          path.resolve(chunkDir, chunkPath),
          // 指定位置创建可写流
          fs.createWriteStream(filePath, {
            start: index * size,
            end: (index + 1) * size
          })
        )
      )
    );
    fs.rmdirSync(chunkDir); // 合并后删除保存切片的目录
  };

  const { body, host } = ctx.request
  const { filename, size, ext } = body;

  const filePath = resolve(UPLOAD_DIR, `${ filename }.${ ext }`);

  await mergeFileChunk(filePath, filename, size);

  const fname = `${ host }/${ filename }.${ ext }`

  ctx.body = {
    code: 0,
    data: {
      filename: fname,
    },
    message: "file merged success",
  }
}
