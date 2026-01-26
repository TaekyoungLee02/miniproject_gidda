import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ✅ 합체된 아이콘 사용 (좌우 조각 대신 splash-icon 사용을 권장합니다)
const M_Icon = require('../assets/images/splash-icon.png');

export default function IndexingPage() {
    const router = useRouter();
    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('#추억_저장소_여는_중');
    const slideIndex = useRef(0);

    // --- 🧩 M자 바운스 애니메이션용 SharedValues ---
    const mScale = useSharedValue(1);
    const mTranslateY = useSharedValue(0);

    useEffect(() => {
        startProcess();

        // 1️⃣ M자가 위아래로 통통 튀면서 커졌다 작아지는 효과
        mTranslateY.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 600, easing: Easing.out(Easing.quad) }),
                withSpring(0, { damping: 4, stiffness: 100 })
            ),
            -1,
            false
        );

        mScale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 600 }),
                withTiming(1, { duration: 600 })
            ),
            -1,
            true
        );
    }, []);

    const startProcess = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') { router.replace('/'); return; }

        const album = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 50 });
        if (album.assets.length > 0) {
            setCurrentPhoto(album.assets[0].uri);
            const slideInterval = setInterval(() => {
                slideIndex.current = (slideIndex.current + 1) % album.assets.length;
                setCurrentPhoto(album.assets[slideIndex.current].uri);
            }, 500);

            for (let i = 0; i <= 100; i++) {
                setProgress(i);
                if (i === 30) setStatusText('#여행의_기록');
                if (i === 60) setStatusText('#맛있는_음식');
                if (i === 90) setStatusText('#분석_마무리_중');
                await new Promise(r => setTimeout(r, 60));
            }
            clearInterval(slideInterval);
            router.replace('/welcome');
        }
    };

    const mAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: mTranslateY.value }, { scale: mScale.value }]
    }));

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <StatusBar style="dark" />

            {/* 📸 1. 중앙 사진 슬라이드 영역 (프레임 위아래 여백 최소화) */}
            <View style={styles.photoFrame}>
                <View style={styles.orangeLine} />
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    {currentPhoto && (
                        <Animated.View key={currentPhoto} entering={FadeIn.duration(300)} style={{ flex: 1 }}>
                            <Image source={{ uri: currentPhoto }} style={{ width: '100%', height: '100%', opacity: 0.9 }} contentFit="cover" />
                        </Animated.View>
                    )}
                </View>
                <View style={styles.orangeLine} />
            </View>

            {/* 📊 2. 글래스모피즘 박스 UI */}
            <View style={styles.overlay} pointerEvents="none">
                <View style={styles.glassBox}>
                    <Animated.View style={mAnimatedStyle}>
                        <Image source={M_Icon} style={styles.mIcon} contentFit="contain" />
                    </Animated.View>

                    <Text style={styles.hashtag}>{statusText}</Text>
                    <Text style={styles.progressText}>{progress}%</Text>
                </View>
            </View>

            {/* 🏷️ 3. 최하단 안내 문구 */}
            <SafeAreaView style={styles.footer}>
                <Text style={styles.footerText}>앱을 종료하지 마세요.</Text>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    photoFrame: {
        position: 'absolute',
        // ✅ 피그마 요청대로 위아래 여백을 대폭 줄여 사진 노출 극대화
        top: height * 0.1,
        height: height * 0.75,
        width: '100%',
    },
    orangeLine: {
        width: '100%',
        height: 4,
        backgroundColor: '#F38A2C',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassBox: {
        backgroundColor: 'rgba(255, 252, 245, 0.96)',
        width: 190,
        height: 190,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#F38A2C",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
    },
    mIcon: {
        width: 85, // 아이콘 크기 확대
        height: 85,
    },
    hashtag: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 18,
        color: '#F38A2C',
        marginTop: 15,
    },
    progressText: {
        fontFamily: 'Montserrat-Regular',
        fontSize: 28,
        fontWeight: '800',
        color: '#F38A2C',
        marginTop: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: 'Pretendard-Regular',
        fontSize: 14,
        color: '#BBB',
    }
});