import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { Menu, Sprout } from 'lucide-react-native'; // Sprout를 양동이 대용 혹은 커스텀 아이콘 사용
import Animated, {
    FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing
} from 'react-native-reanimated';
import { Photo } from '@/src/lib/types/photo';

// 🔴 [연결] 백엔드 및 서비스 함수 임포트
import { SearchType } from '../src/lib/enums/enums';
import { PhotoDatabaseService } from "@/src/services/PhotoDatabaseService";
import {SearchAnalysisResult} from "../src/lib/types/analysis";

const { width } = Dimensions.get('window');

// 타이핑 효과 커스텀 훅 (키워드용)
const TypingText = ({ text, style }: { text: string, style: any }) => {
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.substring(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 150);
        return () => clearInterval(interval);
    }, [text]);
    return <Text style={style}>{displayedText}</Text>;
};

export default function SearchingPage() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const jsonResult = params.result as string;
    const userPrompt = params.prompt as string || "추억";

    // 🆕 [수정] null 체크 및 타입 단언을 한 번에 처리
    const searchResult: SearchAnalysisResult | null = jsonResult 
        ? JSON.parse(jsonResult) 
        : null;

    const analysisResult = jsonResult ? JSON.parse(jsonResult) : null;
    console.log(analysisResult);
    // Home에서 넘어온 데이터들
    
    //const searchResult = JSON.parse(params.result as string) as SearchAnalysisResult;

    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);

    // --- ✨ 애니메이션 SharedValues ---
    const bucketY = useSharedValue(0);
    const bucketRotate = useSharedValue(0);

    useEffect(() => {
        // 1. 양동이(물 긷기) 애니메이션: 위아래로 움직이며 살짝 흔들림
        bucketY.value = withRepeat(
            withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
        bucketRotate.value = withRepeat(
            withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );

        processSearchAndNavigation();
    }, []);

    const processSearchAndNavigation = async () => {
        // 🆕 [추가] 분석 결과가 없으면 로직 중단 (에러 방지)
        if (!searchResult) {
            console.error("분석 결과(searchResult)가 없습니다.");
            router.back();
            return;
        }

        // 1. 갤러리 이미지 셔플 애니메이션 시작
        const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 50 });
        let shuffleInterval: any;
        if (assets.assets.length > 0) {
            shuffleInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * assets.assets.length);
                setCurrentPhoto(assets.assets[randomIndex].uri);
            }, 120);
        }

        // 2. 🔴 Azure 분석 결과에서 실제 키워드 추출 (Fake 제거)
        let keywordList: string[] = [];

        try {
            // 🛡️ 2. 정밀 방어: entities나 weights가 없으면 '빈 객체 {}'로 대체!
            // 이렇게 하면 undefined 에러가 절대 나지 않습니다.
            const entities = searchResult.entities || {}; 
            const weights = searchResult.weights || {};

            // Context, Time, Space 단어 합치기
            // 🆕 [수정] undefined일 경우를 대비해 빈 배열([]) 처리 추가 (안전성 확보)
            // '0', '1', '2'는 Enum(Context, Time, Space)에 해당한다고 가정
            const allWords = [
                ...(entities["0"] || []), 
                ...(entities["1"] || []),
                ...(entities["2"] || [])
            ];

            // 🆕 [추가] 가중치(Weights)도 키워드 개수에 맞춰서 쭉 펼쳐줘야 함! (Flatten)
            // 예: '여행'(Context) 관련 단어가 3개면, Context 가중치도 3번 반복해서 배열에 넣음
            const allWeights = [
            ...Array(entities["0"]?.length || 0).fill(weights["0"] ?? 1), // Context 가중치 반복
            ...Array(entities["1"]?.length || 0).fill(weights["1"] ?? 1), // Time 가중치 반복
            ...Array(entities["2"]?.length || 0).fill(weights["2"] ?? 1), // Space 가중치 반복
            ];
            // const allWords = [
            //     ...(entities["0"]),
            //     ...(entities["1"]),
            //     ...(entities["2"])
            // ];
            keywordList = allWords.map(word => `#${word}`);

            // 화면에 키워드 순차적 표시
            keywordList.slice(0, 3).forEach((tag, i) => {
                setTimeout(() => setExtractedKeywords(prev => [...prev, tag]), (i + 1) * 800);
            });

            // 3. 🔴 [백엔드 실시간 검색]
            const service = PhotoDatabaseService.getInstance();

            // 🆕 [수정] 펼쳐진 단어(allWords)와 펼쳐진 가중치(allWeights)를 전달!
            // 만약 여기서도 빨간줄이 뜨면서 'number[]'가 아니라 'string[]'을 원한다고 하면
            // PhotoDatabaseService.ts 파일의 searchPhoto 정의를 확인해야 합니다. (아마 number[]가 맞을 겁니다)
            const searchPromise = service.searchPhoto(allWords, allWeights);
            // const searchPromise = service.searchPhoto(entities, weights);

            // 최소 애니메이션 시간(4.5초) 보장하면서 검색 수행
            const [searchResults] = await Promise.all([
                searchPromise,
                new Promise((r) => setTimeout(r, 4500)),
            ]);

            
            const searchPhotos = searchResults.map((value) => value.photo as Photo);

            if (shuffleInterval) clearInterval(shuffleInterval);

            // 4. 결과 페이지로 이동 (데이터 전달)
            router.replace({
                pathname: '/save-page-ui' as any, 
                params: {
                    prompt: userPrompt,
                    photos: JSON.stringify(searchPhotos),
                    keywords: JSON.stringify(keywordList)
                }
            });

        } catch (error) {
            console.error("❌ 검색 프로세스 오류:", error);
            // 에러 로그를 좀 더 자세히 보고 싶다면 아래 주석 해제
            console.log("문제의 데이터:", JSON.stringify(searchResult, null, 2));
        
            if (shuffleInterval) clearInterval(shuffleInterval);
            router.back();
        }
    };

    const animatedBucketStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bucketY.value }, { rotate: `${bucketRotate.value}deg` }] as any
    }));

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={{ flex: 1, alignItems: 'center' }}>
                <View style={styles.header}>
                    <Menu color="#F38A2C" size={32} />
                    <Text style={styles.logoText}>GIDDA</Text>
                    <View style={{ width: 32 }} />
                </View>

                {/* --- 1. 상단 애니메이션: 물 긷는 양동이 컨셉 --- */}
                <View style={styles.bucketSection}>
                    <Animated.View style={[styles.bucketWrapper, animatedBucketStyle]}>
                        <View style={styles.bucketHandle} />
                        <View style={styles.bucketBody}>
                            <View style={styles.waterLine} />
                        </View>
                    </Animated.View>
                    <Text style={styles.statusText}>기억을 긷는 중...</Text>
                </View>

                {/* --- 2. 📸 폴라로이드 슬라이드 (살짝 정적인 느낌으로 유지) --- */}
                <View style={styles.polaroidFrame}>
                    <View style={styles.photoContainer}>
                        {currentPhoto ? (
                            <Image source={{ uri: currentPhoto }} style={styles.photo} contentFit="cover" />
                        ) : (
                            <View style={styles.photoPlaceholder}><ActivityIndicator color="#F38A2C" /></View>
                        )}
                    </View>
                </View>

                {/* --- 3. ✨ 키워드 타이핑 섹션 --- */}
                <View style={styles.keywordSection}>
                    <View style={styles.keywordWrapper}>
                        {extractedKeywords.map((keyword, index) => (
                            <TypingText key={`${keyword}-${index}`} text={keyword} style={styles.keywordText} />
                        ))}
                    </View>
                </View>

                <View style={styles.promptBox}>
                    <Text style={styles.promptText} numberOfLines={1}>"{userPrompt}"</Text>
                </View>

                <View style={styles.footer}>
                    <ActivityIndicator size="small" color="#F38A2C" />
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFCF5' },
    header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingVertical: 15 },
    logoText: { fontFamily: 'Montserrat-Regular', fontSize: 32, color: '#F38A2C', letterSpacing: 1.6 },

    // 양동이 애니메이션 스타일
    bucketSection: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
    bucketWrapper: { alignItems: 'center' },
    bucketHandle: { width: 30, height: 15, borderTopWidth: 3, borderColor: '#F38A2C', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
    bucketBody: { width: 40, height: 35, backgroundColor: 'white', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, borderWidth: 2, borderColor: '#F38A2C', overflow: 'hidden' },
    waterLine: { position: 'absolute', bottom: 0, width: '100%', height: '60%', backgroundColor: 'rgba(243, 138, 44, 0.2)' },
    statusText: { fontFamily: 'Pretendard-Regular', fontSize: 15, color: '#F38A2C', marginTop: 10, letterSpacing: 1 },

    polaroidFrame: { backgroundColor: 'white', padding: 12, paddingBottom: 35, borderRadius: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, transform: [{ rotate: '-2deg' }], marginBottom: 25 },
    photoContainer: { width: 220, height: 180, backgroundColor: '#F0F0F0' },
    photo: { width: '100%', height: '100%' },
    photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    keywordSection: { height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    keywordWrapper: { flexDirection: 'row', gap: 12 },
    keywordText: { fontFamily: 'Pretendard-Bold', fontSize: 22, color: '#F38A2C' },

    promptBox: { width: '80%', backgroundColor: 'white', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(243, 138, 44, 0.4)' },
    promptText: { fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#666', textAlign: 'center' },
    footer: { position: 'absolute', bottom: 50 }
});