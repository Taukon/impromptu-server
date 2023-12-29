const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  //mode: 'development',
  mode: "production",

  target: 'web',

  entry: {
    browser: path.join(__dirname, 'src', 'app', 'index.tsx')
  },

  output: {
    path: path.resolve("..", "public"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
            {
              loader: "ts-loader", 
            },
          ],
      }
    ]
  },
  resolve: {
    extensions:[".ts", ".tsx", ".js", ".json"]
  },
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,
    })],
  },
};