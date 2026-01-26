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
    Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const M_Icon = require('../assets/images/splash-icon.png');

export default function WelcomePage() {
    const router = useRouter();
    const [photoCount, setPhotoCount] = useState<number>(0);

    // --- 애니메이션 SharedValues ---
    const buttonScale = useSharedValue(1); // 버튼 호흡용
    const textOpacity = useSharedValue(1); // 텍스트 깜빡임용

    useEffect(() => {
        const getCount = async () => {
            const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo' });
            setPhotoCount(assets.totalCount);
        };
        getCount();

        // 🔘 1. 버튼 호흡 애니메이션 (금색 없이 깔끔하게!)
        buttonScale.value = withRepeat(
            withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );

        // ✨ 2. 하단 텍스트 하얀색 깜빡임 (Opacity 조절)
        textOpacity.value = withRepeat(
            withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
    }, []);

    // 버튼 호흡 스타일
    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
        shadowOpacity: withTiming(buttonScale.value === 1 ? 0.2 : 0.4),
    }));

    // 텍스트 깜빡임 스타일
    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    const handleStart = () => {
        router.replace('/home');
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <StatusBar style="dark" />

            {/* 🟠 상단 오렌지 라인 (4px 두께 유지) */}
            <View style={[styles.orangeLine, { top: height * 0.12 }]} />

            <View style={styles.container}>
                {/* --- 중앙 로고 섹션 --- */}
                <View style={styles.logoSection}>
                    <Image source={M_Icon} style={styles.mIcon} contentFit="contain" />
                    <Text style={styles.giddaText}>GIDDA</Text>
                </View>

                {/* --- 🔘 유도 애니메이션(호흡) 버튼 --- */}
                <Animated.View style={animatedButtonStyle}>
                    <Pressable
                        onPress={handleStart}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                backgroundColor: pressed ? '#D6751F' : '#F38A2C',
                                transform: [{ scale: pressed ? 0.96 : 1 }], // 누를 때 쫀득하게
                            }
                        ]}
                    >
                        <Text style={styles.buttonText}>기억 찾으러 가기</Text>
                    </Pressable>
                </Animated.View>

                {/* --- ✨ 하단 분석 결과 텍스트 (깜빡임 적용) --- */}
                <Animated.View style={[styles.resultContainer, animatedTextStyle]}>
                    <Text style={styles.normalText}>
                        "<Text style={styles.highlightText}>{photoCount.toLocaleString()}개</Text>의 잊혀진 기억을 찾았습니다."
                    </Text>
                </Animated.View>
            </View>

            {/* 🟠 하단 오렌지 라인 */}
            <View style={[styles.orangeLine, { bottom: height * 0.12 }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orangeLine: {
        position: 'absolute',
        width: '100%',
        height: 3,
        backgroundColor: '#F38A2C',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 80,
    },
    mIcon: {
        width: 100,
        height: 100,
        marginBottom: 15,
    },
    giddaText: {
        fontFamily: 'Montserrat-Regular',
        fontSize: 64,
        color: '#F38A2C',
        letterSpacing: 3.2,
    },
    button: {
        paddingVertical: 18,
        paddingHorizontal: 25,
        borderRadius: 20,
        shadowColor: "#F38A2C",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    buttonText: {
        fontFamily: 'Pretendard-Bold',
        color: 'white',
        fontSize: 22,
    },
    resultContainer: {
        marginTop: 100,
    },
    normalText: {
        fontFamily: 'Pretendard-Regular',
        fontSize: 18,
        color: '#333',
    },
    highlightText: {
        fontFamily: 'Pretendard-Bold',
        color: '#F38A2C',
    },
});