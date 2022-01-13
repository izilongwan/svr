const HtmlWebpackPlugin = require('html-webpack-plugin'),
      MiniCssExtractPlugin = require('mini-css-extract-plugin'),
      path = require('path')

module.exports = {
  mode: 'production',

  entry: {
    index: '/src/js/index.js',
    file: '/src/js/file.js',
    home: '/src/js/home.js',
    about: '/src/js/about.js',
  },

  output: {
    clean: true,
    filename: 'js/[name].js',
    path: path.resolve(__dirname + '/public')
  },

  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|gif|jpg|jpeg|webp|ico)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1024 * 20,
              fallback: { // 大于limit怎么处理
                loader: 'file-loader',
                options: {
                  name: 'images/[name]-[contenthash:6].[ext]'
                }
              }
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]]
            }
          }
        ],
        exclude: /node_modules/,
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: '/src/static/index.html',
      title: 'INDEX',
      scriptLoading: 'blocking',
      chunks: ['index']
    }),

    new HtmlWebpackPlugin({
      filename: 'file.html',
      chunks: 'file',
      template: '/src/static/file.html',
      scriptLoading: 'blocking',
      chunks: ['file'],
    }),

    new MiniCssExtractPlugin({
      filename: 'css/[name].css'
    })
  ]
}
