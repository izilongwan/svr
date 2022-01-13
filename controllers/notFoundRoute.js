module.exports = async (ctx) => {
  await ctx.render('_404', {
    CONF: {
      links: []
    },
    title: 404,
    data: [3, 4, 5],
    text: '404 Not Found',
    layout: 'layouts/_404' // 使用特殊模版
  })
}
