module.exports = async (ctx) => {
  await ctx.render('about', {
    CONF: {
      styles: ['css/about.css'],
      scripts: ['js/about.js']
    },
    title: 'ABOUT',
  })
}
