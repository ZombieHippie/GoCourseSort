var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	entry: './webpack-entry.js',
  output: {
    filename: 'bundle.js',
    path: __dirname
  },
  module: {
    loaders: [
      { test: /\.css$/,
        loader: ExtractTextPlugin.extract("css-loader") },
      { test: /\.png$/, loader: "file-loader" },
      { test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel' }
    ]
  },
  resolve: {
    extensions: ["", ".web.jsx", ".web.js", ".jsx", ".js"],
    alias: {
      "gocoursesort": "../../js/gocoursesort.js"
    }
  },
  plugins: [
    new ExtractTextPlugin("bundle.css", { allChunks: true })
    , new webpack.optimize.UglifyJsPlugin({
      mangle: {
        except: ['$', 'exports', 'require']
      }
    })
  ]
};
