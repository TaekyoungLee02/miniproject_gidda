const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 👇 이 부분이 없으면 죽어도 안 됩니다!
config.resolver.assetExts.push('onnx', 'data');

module.exports = config;