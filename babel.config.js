// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            "nativewind/babel",
            "react-native-reanimated/plugin",
        ],
    };
};
// ---- 타입에러 발생 시 아래 코드 사용 by 명근님 ------
// module.exports = function (api) {
//     api.cache(true);
//     return {
//         presets: ['babel-preset-expo'],
//         plugins: [
//             ['module-resolver', {
//                 root: ['./'],
//                 alias: {
//                     '@': './',
//                 },
//             }],
//             'nativewind/babel',

//             // ⚠️ 반드시 마지막
//             'react-native-reanimated/plugin',
//         ],
//     };
// };