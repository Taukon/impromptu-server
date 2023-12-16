const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  //mode: 'development',
  mode: "production",

  target: 'web',

  entry: {
    browser: path.join(__dirname, 'src', 'app', 'browser.ts'),
    proxy: path.join(__dirname, 'src', 'app', 'proxy.ts'),
  },

  output: {
    path: path.resolve("..", "public"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
            {
              loader: "ts-loader", 
            },
          ],
      }
    ]
  },
  resolve: {
    extensions:['.ts', '.js']
  },
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,
    })],
  },
};