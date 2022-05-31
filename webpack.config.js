const path = require('path');

const rules = [
  {
    test: /\.less$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'less-loader', options: { lessOptions: { javascriptEnabled: true } } },
    ],
  },
];

const resolve = {
  // Add '.ts' and '.tsx' as resolvable extensions.
  extensions: ['.webpack.js', '.ts', '.tsx', '.js', '.json']
};

module.exports = {
  module: {
    rules: rules,
  },
  resolve
};
