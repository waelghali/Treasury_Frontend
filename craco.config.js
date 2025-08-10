const webpack = require('webpack');

module.exports = {
  // Your existing craco configuration
  // ...

  webpack: {
    plugins: [
      // This plugin makes the environment variable available in the build process
      new webpack.DefinePlugin({
        'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL),
      }),
    ],
  },
  // Your existing craco configuration for PostCSS
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
};