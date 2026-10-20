import { defineConfig } from "@rspack/cli"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: {
    index: "./src/all.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist/browser"),
    filename: "[name].js",
    publicPath: "auto",
    module: true,
    library: { type: "module" },
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            target: "es2021",
            parser: { syntax: "typescript", decorators: true },
            transform: {
              legacyDecorator: true,
              decoratorMetadata: false,
              // Match tsconfig.json: Lit's reactive setters must not be shadowed.
              useDefineForClassFields: false,
            },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.css$/,
        type: "css",
      },
    ],
  },
  devServer: {
    devMiddleware: { publicPath: "/dist/browser/" },
    static: [
      // Serve docs on demand, but only demo assets should trigger live reload.
      { directory: path.resolve(__dirname, "demo"), publicPath: "/demo", watch: true },
      { directory: path.resolve(__dirname, "docs"), publicPath: "/docs", watch: false },
      {
        directory: path.resolve(__dirname, "dist"),
        publicPath: "/dist",
        // Browser bundles are already watched through Rspack's module graph.
        watch: false,
      },
    ],
    port: 8080,
    hot: false,
    liveReload: true,
    open: "/demo/index.html",
  },
  devtool: "source-map",
})
