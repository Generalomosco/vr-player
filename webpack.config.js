const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'web',
  devtool: 'source-map',
  entry: [
    './src/style/index.scss',
    './src/index.js'
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'VRPlayer.js',
    publicPath: './',
    libraryTarget: 'var',
    library: 'VRPlayer'
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          },
        ]
      },
      {
        test: /\.(jpg|png)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]'
            }
          }
        ]
      }
    ]
  },
  plugins: [new webpack.ProvidePlugin({
      _: "underscore",
      THREE: "three"
    }),
    new MiniCssExtractPlugin({
      filename: 'VRPlayer.css',
    })  
  ]
}