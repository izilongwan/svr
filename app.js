const Koa               = require('koa'),
      koaStatic         = require('koa-static'),
      koaConditionalGet = require('koa-conditional-get'),
      koaEtag           = require('koa-etag'),
      { resolve }       = require('path'),
      body              = require('koa-bodyparser'),
      koaEjs            = require('koa-ejs'),
      routes            = require('./routes');
      path              = require('path')
      // socket            = require('./socket')

const { cors } = require('./middleware');

const app = new Koa();

koaEjs(app, {
  root: path.join(__dirname, 'views'),
  cache: false,
  layout: 'layouts/default',
  viewExt: 'ejs'
})


app
  .use(cors)
  .use(body({ enableTypes: ['json', 'form', 'text'] }))
  .use(koaConditionalGet())
  .use(koaEtag())
  .use(async (ctx, next) => {
    ctx.set({ // 设置缓存
      // Expires 绝对时间戳
      // Cache-control，优先级高于Expires，默认值private只能被终端用户的浏览器缓存，不允许 CDN 等中继缓存服务器对其缓存。
      // 'Cache-control': 'max-age=20', // 关闭disabled-cache，验证memory-cache、disk-cache
      'Cache-Control': 'no-cache,max-age=20', // 使用协商缓存，发送请求到服务器确认是否使用缓存，验证e-tag、last-modified
    })

    await next();
  })

  .use(koaStatic(resolve(__dirname + '/public')))
  .use(koaStatic(resolve(__dirname + '/static')))
  .use(routes.routes(), routes.allowedMethods())


app.listen(3001, () => {
  console.log('RUNNING');
})
