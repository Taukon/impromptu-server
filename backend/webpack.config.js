const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
  mode: 'development',
  // mode: "production",

  target: 'node',
  externals: [nodeExternals()],

  entry: {
    https: path.join(__dirname, 'src', 'app', 'https.ts'),
    http: path.join(__dirname, 'src', 'app', 'http.ts')
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
}
