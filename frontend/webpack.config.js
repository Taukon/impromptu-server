const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  //mode: 'development',
  mode: "production",

  target: 'web',

  entry: {
    app: path.join(__dirname, 'src', 'app', 'index.tsx')
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
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'postcss-loader',
        ],
      },
    ]
  },
  resolve: {
    extensions:[".ts", ".tsx", ".js", ".json"]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/app/index.html',
      filename: 'index.html'
    }),
  ],
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,
    })],
  },
};