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
    Easing
} from 'react-native-reanimated';
import { PhotoDatabaseService } from "@/src/services/PhotoDatabaseService"

const { width, height } = Dimensions.get('window');

// ✅ 새 양동이 로고 사용
const GiddaBucket = require('../assets/images/favicon2.png');

export default function IndexingPage() {
    const router = useRouter();
    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('#추억_저장소_여는_중');
    const slideIndex = useRef(0);

    // --- 🧩 애니메이션 SharedValues (행동 반경 축소) ---
    const logoScale = useSharedValue(1);
    const logoTranslateY = useSharedValue(0);

    useEffect(() => {
        startProcess();

        // 1️⃣ 양동이 애니메이션
        logoTranslateY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );

        logoScale.value = withRepeat(
            withTiming(1.03, { duration: 2000 }),
            -1,
            true
        );
    }, []);

    const startProcess = async () => {

        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status !== 'granted') { router.replace('/'); return; }
        let album = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 50 }).then(m => m.assets);

        console.log(``, album)

        const service = PhotoDatabaseService.getInstance();

        const slideInterval = setInterval(() => {
            slideIndex.current = (slideIndex.current + 1) % album.length;
            setCurrentPhoto(album[slideIndex.current].uri);
        }, 600); // 사진 전환 속도

        for await (const { progress, assets } of service.savePhotosToDB())
        {
            album = assets;
            setProgress(progress * 100);

            if (progress >= 0.3) setStatusText('#여행의_기록');
            else if (progress >= 0.6) setStatusText('#맛있는_음식');
            else if (progress >= 0.9) setStatusText('#분석_마무리_중');
        }

        clearInterval(slideInterval);
        router.replace('/welcome');
    };

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: logoTranslateY.value }, { scale: logoScale.value }]
    }));

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <StatusBar style="dark" />

            {/* 📸 1. 상단 사진 슬라이드 영역 (양동이 위쪽 배치) */}
            <View style={styles.photoFrame}>
                <View style={styles.orangeLine} />
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    {currentPhoto && (
                        <Animated.View key={currentPhoto} entering={FadeIn.duration(400)} style={{ flex: 1 }}>
                            <Image source={{ uri: currentPhoto }} style={styles.bgImage} contentFit="cover" />
                        </Animated.View>
                    )}
                </View>
                <View style={styles.orangeLine} />
            </View>

            {/* 📊 2. 중앙 로딩 정보 (네모 박스 제거) */}
            <View style={styles.centerContent} pointerEvents="none">
                <Animated.View style={[styles.bucketWrapper, logoAnimatedStyle]}>
                    <Image source={GiddaBucket} style={styles.bucketIcon} contentFit="contain" />
                </Animated.View>

                <View style={styles.infoArea}>
                    <Text style={styles.hashtag}>{statusText}</Text>

                    {/* ✅ 로딩바 추가 */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>

                    <Text style={styles.progressText}>{progress}%</Text>
                </View>
            </View>

            {/* 🏷️ 3. 최하단 안내 문구 */}
            <SafeAreaView style={styles.footer}>
                <Text style={styles.footerText}>AI가 당신의 소중한 어제를 긷고 있습니다.</Text>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    photoFrame: {
        position: 'absolute',
        top: height * 0.12,
        height: height * 0.35, // 사진 영역 축소로 로고와 분리
        width: '100%',
    },
    bgImage: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
    orangeLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#F38A2C',
        opacity: 0.5,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: height * 0.2, // 로고 위치 하향 조정
    },
    bucketWrapper: {
        marginBottom: 25,
    },
    bucketIcon: {
        width: 200,
        height: 100,
    },
    infoArea: {
        alignItems: 'center',
        width: '100%',
    },
    hashtag: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 18,
        color: '#F38A2C',
        marginBottom: 15,
    },
    progressBarContainer: {
        width: width * 0.6,
        height: 8,
        backgroundColor: '#EEE',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#F38A2C',
    },
    progressText: {
        fontFamily: 'Montserrat-Regular',
        fontSize: 24,
        fontWeight: '700',
        color: '#F38A2C',
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: 'Pretendard-Regular',
        fontSize: 14,
        color: '#F38A2C',
        opacity: 0.8,
    }
});