module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './',
        },
      }],
      'nativewind/babel',

      // ⚠️ 반드시 마지막
      'react-native-reanimated/plugin',
    ],
  };
};