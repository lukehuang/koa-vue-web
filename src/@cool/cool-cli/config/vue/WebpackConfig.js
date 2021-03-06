const path = require('path')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const TimeFixPlugin = require('time-fix-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const Smp = new SpeedMeasurePlugin()
const BabelConfig = require('./JsBabel')

const staticPublicPath = require(path.join(process.cwd(), './src/app.config'))
  .staticAssets.publicPath

function srcPath (dir) {
  return path.join(process.cwd(), './src', dir)
}

console.log(srcPath(''))

exports._default = function (env) {
  env = env || 'development'

  const output = {
    path: path.join(process.cwd(), './dist/'),
    filename: '[name].js',
    chunkFilename: '[name].js',
    // sourceMapFilename: '[name].js.map'
    publicPath: `${staticPublicPath}/`
  }

  const AUTOPREFIXER_BROWSERS = [
    // 'Android 2.3',
    // 'Android >= 4',
    // 'iOS >= 6',
    'Chrome >= 35',
    'Firefox >= 31',
    'Explorer >= 9',
    'Opera >= 12',
    'Safari >= 7.1'
  ]

  const GLOBALS = {
    'process.env': {
      NODE_ENV: JSON.stringify(env)
    },
    __DEV__: env === 'development'
  }

  const plugins = [
    new webpack.DefinePlugin(GLOBALS),
    new VueLoaderPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new ProgressBarPlugin(),

    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[name].css'
    })
  ]

  const moduleConfig = {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: BabelConfig.get()
        }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },

      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'img/[name].[hash:6].[ext]'
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name].[hash:6].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'fonts/[name].[hash:6].[ext]'
        }
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: {} },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: [
                require('autoprefixer')({
                  browsers: AUTOPREFIXER_BROWSERS
                })
              ]
            }
          },
          { loader: 'sass-loader', options: {} }
        ]
      }
    ]
  }

  const resolve = {
    extensions: ['.js', '.vue', '.scss', '.json'],
    modules: [path.resolve('./src/static/'), path.resolve('./node_modules/')],
    alias: {
      vue: 'vue/dist/vue.esm.js',
      '@static': srcPath('static'),
      '@': srcPath('')
    }
  }

  const optimization = {
    minimizer: [
      // 自定义js优化配置，将会覆盖默认配置
      new UglifyJsPlugin({
        uglifyOptions: {
          cache: true,
          parallel: true, // 开启并行压缩，充分利用cpu
          sourceMap: true,
          extractComments: true, // 移除注释
          compress: {
            unused: true,
            warnings: false,
            drop_debugger: true
          },
          output: {
            comments: false,
            ascii_only: true
          }
        }
      }),
      // 配置css文件压缩
      new OptimizeCssAssetsPlugin({
        assetNameRegExp: /\.css$/g,
        cssProcessorOptions: {
          safe: true,
          autoprefixer: { disable: true }, // 这里是个大坑，稍后会提到
          mergeLonghand: false,
          discardComments: {
            removeAll: true // 移除注释
          }
        },
        canPrint: true
      })
    ],

    splitChunks: {
      cacheGroups: {
        libs: {
          test: /[\\/]node_modules[\\/]/,
          name: `chunk-libs`,
          priority: 10,
          chunks: 'initial' //  只打包初始时依赖的第三方
        },
        elementUI: {
          name: 'chunk-elementUI',
          priority: 20, // 权重要大于 libs 和 app 不然会被打包进 libs 或者 app
          test: /[\\/]node_modules[\\/]element-ui[\\/]/,
          chunks: 'initial'
        },
        commons: {
          // test: path.join(process.cwd(), './src/static/public'), // 可自定义拓展你的规则
          name: `chunk-commons`,
          minChunks: 2, // 最小共用次数,
          priority: 5,
          chunks: 'initial',
          reuseExistingChunk: false
        }
      }
    },
    runtimeChunk: {
      name: 'manifest'
    }
  }

  const config = {
    entry: {},
    output,
    mode: env,
    module: moduleConfig,
    plugins,
    resolve,
    optimization
  }
  return config
}

exports.production = function (env) {
  let config = this._default(env)
  return config
}

exports.development = function () {
  let config = this._default()
  config.devtool = '#inline-source-map'
  config.plugins = config.plugins.concat([
    new webpack.NamedModulesPlugin(),
    new TimeFixPlugin()
    // new BundleAnalyzerPlugin()
  ])
  return Smp.wrap(config)
}

exports.pkDevelopment = function (coolConfig) {
  const devServerConfig = coolConfig.devServer
  const config = coolConfig.webpackConfig

  var template = devServerConfig.template
    ? devServerConfig.template
    : path.join(__dirname, '../../template/index.html')

  Object.keys(config.entry).forEach(function (entry) {
    config.plugins.push(
      new HtmlWebpackPlugin({
        template: template,
        filename: `${entry}.html`,
        inject: true,
        chunks: [entry]
      })
    )
  })
}

exports.pkProduction = function (coolConfig) {
  const config = coolConfig.webpackConfi
  return config
}
