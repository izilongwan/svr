const { CODE } = require('../extends')

module.exports = async (ctx, next) => {
  try {
    await next()

  } catch (error) {
    const { message: ms } = CODE.ERROR

    let message = error.message
    let err = message

    if (Array.isArray(error)) {
      const [e, data = {}] = error

      message = data.data
      err = data
    }

    !message && (message = ms)

    ctx.body = {
      ...CODE.ERROR,
      message,
      error: err,
    }
  }
}
