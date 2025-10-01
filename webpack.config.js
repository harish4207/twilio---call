const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.js'),
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'bundle.js',
    clean: true,
  },
  mode: 'development',
  module: {
    rules: [
      // If you need Babel, add babel-loader here.
    ],
  },
  resolve: {
    fallback: {
      // Add fallbacks if bundler complains about node built-ins
    },
  },
};
