import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';// 전체 갯수 확인용
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { insertPhoto } from '@/src/db/database';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 📦 [추가] 완료 처리를 위해 필요
// 🛠️ [수정] 서비스 파일 import
import { getGalleryPhotosSync } from '../src/db/syncService';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing
} from 'react-native-reanimated';

 


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
        // 전체 갯수만 먼저 파악 (진행률 표시용)
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') { router.replace('/'); return; }

        const totalAssets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo' });
        const totalCount = totalAssets.totalCount;
        let processedCount = 0;

        // 🚨 [추가] 사진이 하나도 없으면 바로 Welcome으로 토스!
        if (totalCount === 0) {
            await AsyncStorage.setItem('indexed_count', '0');
            await AsyncStorage.setItem('is_setup_complete', 'true');
            router.replace('/welcome');
            return; // 여기서 함수 종료
        }

        // 서비스 호출
        // syncService가 50장 처리할 때마다 여기로 'yield' 해줌
        const syncGenerator = getGalleryPhotosSync();
            
        for await (const batch of syncGenerator) {
            // 배치(50장) 단위로 화면 갱신
            if (batch && batch.length > 0) {
                // 배경 사진 바꾸기
                setCurrentPhoto(batch[0].uri);
                
                processedCount += batch.length;
                
                // 진행률 계산
                const percent = Math.min(Math.floor((processedCount / totalCount) * 100), 100);
                setProgress(percent);

                // 텍스트 업데이트
                if (percent < 30) setStatusText('#여행의_기록_스캔중');
                else if (percent < 60) setStatusText('#맛있는_음식_담는중');
                else setStatusText('#거의_다_됐어요');
            }
        }
        // 완료 처리
        // Welcome 페이지 등에서 쓰기 위해 저장
        await AsyncStorage.setItem('indexed_count', processedCount.toString());
        await AsyncStorage.setItem('is_setup_complete', 'true');

        setTimeout(() => {
            router.replace('/welcome');
        }, 500);
        
    };

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: logoTranslateY.value }, { scale: logoScale.value },] as const,
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