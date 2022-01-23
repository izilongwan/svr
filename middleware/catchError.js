const { CODE } = require('../extends')

module.exports = async (ctx, next) => {
  try {
    await next()

  } catch (error) {
    let reason = error.message

    if (Array.isArray(error)) {
      const [e, data = {}] = error

      error = data
      reason = data.data
    }

    ctx.body = {
      ...CODE.ERROR,
      error,
      reason,
    }
  }
}
