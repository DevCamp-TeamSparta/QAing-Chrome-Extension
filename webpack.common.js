const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const HtmlPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
  entry: {
    popup: path.resolve(__dirname, 'src/popup/popup.tsx'),
    background: path.resolve(__dirname, 'src/background/background.ts'),
    contentScript: path.resolve(
      __dirname,
      'src/contentScript/contentScript.tsx'
    ),
  },
  module: {
    rules: [
      {
        use: 'ts-loader',
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                ident: 'postcss',
                plugins: ['tailwindcss', 'autoprefixer'],
              },
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          },
        ],
      },

      {
        type: 'asset/resource',
        test: /\.(png|svg|jpg|jpeg|woff|woff2|eot|ttf)$/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './src/static'),
          to: path.resolve(__dirname, 'dist'),
        },
      ],
    }),
    new HtmlPlugin({
      title: 'React Chrome Extension',
      filename: 'index.html',
      chunks: ['popup'],
    }),
    ...getHtmlPlugins(['popup', 'options']),
  ],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  optimization: {
    splitChunks: {
      chunks(chunk) {
        return chunk.name !== 'contentScript'
      },
    },
  },
}

function getHtmlPlugins(chunks) {
  return chunks.map(
    (chunk) =>
      new HtmlPlugin({
        title: 'React Extension',
        filename: `${chunk}.html`,
        chunks: [chunk],
      })
  )
}
