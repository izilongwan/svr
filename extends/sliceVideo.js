const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')

ffmpeg.setFfmpegPath(ffmpegPath)

module.exports = function sliceVideo(path, options = {}) {
  const o = Object.assign( {
    codec: 'libx264',
    format: 'hls',
    outputOptions: '-hls_list_size 0',
    outputOption: '-hls_time 5',
    output: '',
    onError() {},
    onEnd() {},
  }, options)

  const {
    codec,
    format,
    outputOptions,
    outputOption,
    output,
    onError,
    onEnd,
  } = o

  ffmpeg(path)
    .videoCodec(codec)
    .format(format)
    .outputOptions(outputOptions)
    .outputOption(outputOption)
    .output(output)
    .on('error', onError)
    .on('end', onEnd)
    .run()
}
