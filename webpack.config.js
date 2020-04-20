const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./frontend/scripts/main.js",
  output: {
    filename: "main-bundled.js",
    path: path.resolve(__dirname, "public"),
  },
  mode: "production",
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};

// https://stackoverflow.com/questions/49348365/webpack-4-size-exceeds-the-recommended-limit-244-kib
//devtool: mode === "development" ? "inline-source-map" : false,
