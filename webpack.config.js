const nodeExternals = require('webpack-node-externals');

const path = require('path');

const mode = process.env.NODE_ENV || 'development';

module.exports = [
  {
    target: 'node',
    devtool: 'source-map',
    entry: path.resolve(__dirname, 'src/index.ts'),
    mode,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'dist.node.js'
    },
    cache: {
      type: 'filesystem',
      cacheLocation: path.join(__dirname, 'cache'),
      allowCollectingMemory: false,
      idleTimeout: 0,
      idleTimeoutForInitialStore: 0,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      profile: true,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: {
              sync: true,
              jsc: {
                parser: {
                  syntax: "typescript",
                },
              },
            },
          },
        },
      ],
    },
    externals: [nodeExternals()],
    resolve: {
      extensions: ['.ts', '.js'],
    },
  }
];
