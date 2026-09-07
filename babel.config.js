module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Bundles Drizzle SQL migrations as strings.
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
