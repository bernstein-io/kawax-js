const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: process.env.NODE_ENV,
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'index.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: { loader: 'babel-loader' }
      }
    ]
  },
  node: {
    net: 'empty',
    fs: 'empty',
    tls: 'empty'
  },
};
