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
    const userPrompt = params.prompt as string || "추억";
    const existingTags = params.tags as string;

    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);

    // --- ✨ 애니메이션 SharedValues ---
    const bucketY = useSharedValue(0);
    const bucketRotate = useSharedValue(0);

    useEffect(() => {
        startSearchingSimulation();

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
    }, []);

    const startSearchingSimulation = async () => {
        const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 50, sortBy: ['creationTime'] });
        let shuffleInterval: any;

        if (assets.assets.length > 0) {
            shuffleInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * assets.assets.length);
                setCurrentPhoto(assets.assets[randomIndex].uri);
            }, 120);

            const fakeKeywords = generateFakeKeywords(userPrompt);
            // 키워드가 하나씩 순차적으로 추가되도록 조정
            setTimeout(() => setExtractedKeywords([fakeKeywords[0]]), 800);
            setTimeout(() => setExtractedKeywords(prev => [...prev, fakeKeywords[1]]), 1800);
            setTimeout(() => setExtractedKeywords(prev => [...prev, fakeKeywords[2]]), 2800);

            setTimeout(() => {
                clearInterval(shuffleInterval);
                router.replace({ pathname: '/save-page-ui', params: { prompt: userPrompt, tags: existingTags } });

            }, 5000);
        }
    };

    const generateFakeKeywords = (text: string) => {
        const words = text.split(' ');
        const result = words.map(w => `#${w.replace(/[랑을를은는]/g, '')}`);
        while (result.length < 3) result.push('#추억');
        return result.slice(0, 3);
    };

    const animatedBucketStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bucketY.value }, { rotate: `${bucketRotate.value}deg` }]
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