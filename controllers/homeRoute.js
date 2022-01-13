module.exports = async (ctx) =>{
  await ctx.render('home', {
    CONF: {
      styles: ['css/home.css'],
      scripts: ['js/home.js']
    },
    title: 'HOME',
    data: [1, 2, 3],
  })
}
