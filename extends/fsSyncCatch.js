const fs = require('fs')

Object.keys(fs).filter(key => key.endsWith('Sync')).forEach(key => {
  const method = fs[key]

  fs[`${key}Catch`] = (...args) => {
    try {
      const ret = method(...args)

      return [null, ret]
    } catch (error) {
      return [true, error]
    }
  }
})

module.exports = fs
