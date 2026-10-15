module.exports = function(api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Release builds: drop debug logs, keep errors for crash reports
      ...(isProd ? [['transform-remove-console', { exclude: ['error'] }]] : []),
      // Must stay last
      'react-native-reanimated/plugin',
    ],
  };
};
