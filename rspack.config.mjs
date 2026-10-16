import { defineConfig } from '@rspack/cli';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    'yixi-lit': './src/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    module: true,
    library: { type: 'module' },
    clean: true,
  },
  experiments: {
    outputModule: true,
    css: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', decorators: true },
            transform: { legacyDecorator: true, decoratorMetadata: false },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  devServer: {
    static: [
      { directory: __dirname, publicPath: '/', watch: true },
      { directory: path.resolve(__dirname, 'dist'), publicPath: '/dist', watch: true },
    ],
    port: 8080,
    hot: false,
    liveReload: true,
    open: '/demo/index.html',
  },
  devtool: 'source-map',
});
