const path = require('path');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const dev = process.env.NODE_ENV !== 'production';

const libraryName = 'kawax-js';

const webpackConfig = {
  entry: './src/index.js',
  mode: dev ? 'development' : 'production',
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'kawax.js',
    library: libraryName,
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          failOnError: true,
        },
      },
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
      }
    ]
  },
  node: {
    net: 'empty',
    fs: 'empty',
    tls: 'empty'
  },
  plugins: []
};

if (!dev) {
  webpackConfig.plugins.push(new LodashModuleReplacementPlugin());
}

module.exports = webpackConfig;
