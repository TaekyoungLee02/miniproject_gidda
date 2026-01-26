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
 
// 🔴 [연결] 백엔드 및 서비스 함수 임포트
import { getPhotosByIds } from '../src/db/database';
import { SearchType } from '../src/lib/enums/enums';
 
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
    
    // Home에서 넘어온 데이터들
    const userPrompt = params.prompt as string || "추억";
    const entitiesStr = params.entities as string; // Azure 분석 결과 (JSON 문자열)
    const weightsStr = params.weights as string;   // 가중치 정보
 
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
        // 1. 갤러리 이미지로 배경 셔플 애니메이션 시작
        const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 50 });
        let shuffleInterval: any;
        if (assets.assets.length > 0) {
            shuffleInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * assets.assets.length);
                setCurrentPhoto(assets.assets[randomIndex].uri);
            }, 120);
        }
 
        // 2. Azure 분석 결과에서 키워드 추출하여 화면에 표시
        let keywordList: string[] = [];
        if (entitiesStr) {
            try {
                const entities = JSON.parse(entitiesStr);
                // Context(0), Time(1), Space(2)의 단어들을 합쳐서 키워드로 사용
                const allWords = [
                    ...(entities[SearchType.Context] || []),
                    ...(entities[SearchType.Time] || []),
                    ...(entities[SearchType.Space] || [])
                ];
                keywordList = allWords.map(word => `#${word}`);
                
                // 순차적으로 화면에 키워드 뿌려주기
                keywordList.slice(0, 3).forEach((tag, i) => {
                    setTimeout(() => setExtractedKeywords(prev => [...prev, tag]), (i + 1) * 800);
                });
            } catch (e) {
                console.error("키워드 파싱 에러:", e);
            }
        }
 
        // 3. 🔴 [백엔드 파트] DB에서 사진 정보 가져오기
        // 주의: 현재는 유사도 계산팀의 결과 ID 리스트가 필요함.
        // 우선은 동작 확인을 위해 '전달받은 ID가 있다고 가정'하거나 백엔드 로직을 기다리는 시점입니다.
        // 여기서는 예시 ID들로 DB 조회를 수행합니다.
        const mockIdsFromSimilarityTeam = ["1", "2", "3"]; // 나중에 이 부분을 유사도 팀 변수로 교체!
        const searchResults = await getPhotosByIds(mockIdsFromSimilarityTeam);
 
        // 4. 연출 후 결과 페이지로 이동
        setTimeout(() => {
            if (shuffleInterval) clearInterval(shuffleInterval);
            router.replace({
                pathname: '/save-page', // 실제 결과 페이지 경로 확인 필요
                params: {
                    prompt: userPrompt,
                    photos: JSON.stringify(searchResults), // 실제 DB에서 가져온 사진 객체들
                    keywords: JSON.stringify(keywordList)
                }
            });
        }, 4500); // 4.5초 동안 '긷는' 연출 후 이동
    };
 
 
    const animatedBucketStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: bucketY.value },
            { rotate: `${bucketRotate.value}deg` }
        ]
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