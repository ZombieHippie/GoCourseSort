var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	entry: './webpack-entry.js',
  output: {
    filename: 'bundle.js',
    path: __dirname
  },
  devtool: "eval",
  module: {
    loaders: [
      { test: /\.css$/,
        loader: ExtractTextPlugin.extract("css-loader") },
      { test: /\.png$/, loader: "url-loader?limit=100000" },
      { test: /\.jsx$/,
        exclude: /(node_modules|bower_components|vendor)/,
        loader: 'babel?optional[]=runtime&stage=0' },
      { test: /\.jade$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'jade' },
      { test: /\.styl$/,
        exclude: /(node_modules|bower_components)/,
        loader: ExtractTextPlugin.extract("css-loader!stylus-loader") }
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
    //, new webpack.optimize.UglifyJsPlugin({
    //  mangle: {
    //    except: ['$', 'exports', 'require']
    //  }
    //})
  ]
};
