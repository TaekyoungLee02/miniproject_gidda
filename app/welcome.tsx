import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolate
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const GiddaBucket = require('../assets/images/favicon2.png');

export default function WelcomePage() {
    const router = useRouter();
    const [photoCount, setPhotoCount] = useState<number>(0);

    // --- 애니메이션 SharedValues ---
    const buttonScale = useSharedValue(1);
    const shineValue = useSharedValue(-1); // 버튼 빛 번쩍임용

    useEffect(() => {
        const getCount = async () => {
            const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo' });
            setPhotoCount(assets.totalCount);
        };
        getCount();

        // 🔘 1. 버튼 호흡 애니메이션
        buttonScale.value = withRepeat(
            withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );

        // ✨ 2. 버튼 빛 흐름 애니메이션 (반복적으로 왼쪽에서 오른쪽으로)
        shineValue.value = withRepeat(
            withTiming(1.5, { duration: 2500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
            -1,
            false
        );
    }, []);

    // 버튼 호흡 스타일
    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    // 버튼 내부 빛(Shine) 이동 스타일
    const animatedShineStyle = useAnimatedStyle(() => {
        const translateX = interpolate(shineValue.value, [-1, 1.5], [-width * 0.7, width * 0.7]);
        return { transform: [{ translateX }] };
    });

    const handleStart = () => {
        router.replace('/home');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <StatusBar style="dark" />

            {/* 🟠 상/하단 오렌지 라인 (더 선명하게 수정) */}
            <View style={[styles.orangeLine, { top: height * 0.12, opacity: 0.8 }]} />

            <View style={styles.container}>
                <View style={styles.logoSection}>
                    <Image source={GiddaBucket} style={styles.bucketIcon} contentFit="contain" />
                    <Text style={styles.giddaText}>GIDDA</Text>
                    <Text style={styles.subText}>기억을 긷다, 추억을 잇다</Text>
                </View>

                <View style={styles.resultContainer}>
                    <Text style={styles.normalText}>
                        "<Text style={styles.highlightText}>{photoCount.toLocaleString()}개</Text>의 잊혀진 기억을 찾았습니다."
                    </Text>
                </View>

                {/* 🔘 하이라이트 글로우 버튼 */}
                <Animated.View style={[styles.buttonWrapper, animatedButtonStyle]}>
                    <Pressable
                        onPress={handleStart}
                        style={({ pressed }) => [
                            styles.button,
                            { backgroundColor: pressed ? '#D6751F' : '#F38A2C' }
                        ]}
                    >
                        {/* 🌟 빛이 흐르는 레이어 */}
                        <Animated.View style={[styles.shineLayer, animatedShineStyle]} />

                        <Text style={styles.buttonText}>기억 찾으러 가기</Text>
                    </Pressable>
                </Animated.View>
            </View>

            <View style={[styles.orangeLine, { bottom: height * 0.12, opacity: 0.8 }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    orangeLine: {
        position: 'absolute',
        width: '100%',
        height: 2.5,
        backgroundColor: '#F38A2C',
    },
    logoSection: { alignItems: 'center', marginBottom: 50 },
    bucketIcon: { width: 150, height: 110, marginBottom: 10 },
    giddaText: { fontFamily: 'Montserrat-Regular', fontSize: 56, color: '#F38A2C', letterSpacing: 4 },
    subText: { fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#999', marginTop: 5 },
    resultContainer: {
        marginBottom: 60,
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: 'rgba(243, 138, 44, 0.08)',
        borderRadius: 25,
    },
    normalText: { fontFamily: 'Pretendard-Regular', fontSize: 19, color: '#333', textAlign: 'center' },
    highlightText: { fontFamily: 'Pretendard-Bold', color: '#F38A2C', fontSize: 22 },
    buttonWrapper: { width: width * 0.75 },
    button: {
        height: 65,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // 빛 레이어 잘림 방지
        shadowColor: "#F38A2C",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4, // 그림자 더 선명하게
        shadowRadius: 15,
        elevation: 10,
    },
    buttonText: { fontFamily: 'Pretendard-Bold', color: 'white', fontSize: 20, zIndex: 2 },
    shineLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: [{ skewX: '-25deg' }], // 사선으로 흐르게
        zIndex: 1,
    },
});