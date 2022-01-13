module.exports = async (ctx) => {
  await ctx.render('no-layout', {
    CONF: {
      links: []
    },
    title: 404,
    data: [3, 4, 5],
    layout: false // 不使用模版
  })
}
