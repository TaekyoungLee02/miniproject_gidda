import { useState, useEffect, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native'; // ❌ 여기서 Image 삭제
import { Image } from 'expo-image'; // ✅ expo-image에서 Image 가져오기
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function IndexingPage() {
    const router = useRouter();

    // 상태 관리
    const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('추억 저장소 여는 중...');

    const slideIndex = useRef(0);

    useEffect(() => {
        startProcess();
    }, []);

    const startProcess = async () => {
        // 1. 사진 가져오기
        const album = await MediaLibrary.getAssetsAsync({
            mediaType: 'photo',
            first: 100,
            sortBy: [[MediaLibrary.SortBy.creationTime, true]],
        });

        if (album.assets.length > 0) {
            setPhotos(album.assets);
            setCurrentPhoto(album.assets[0].uri);

            // 2. 슬라이드 쇼 (0.6초 간격)
            const slideInterval = setInterval(() => {
                slideIndex.current = (slideIndex.current + 1) % album.assets.length;
                setCurrentPhoto(album.assets[slideIndex.current].uri);
            }, 600);

            // 3. 분석 시뮬레이션
            await simulateIndexing(album.assets.length);

            // 4. 완료 후 이동
            clearInterval(slideInterval);
            router.replace('/welcome');

        } else {
            setStatusText('사진이 없어서 분석을 건너뜁니다.');
            setTimeout(() => router.replace('/welcome'), 2000);
        }
    };

    const simulateIndexing = async (totalCount: number) => {
        setStatusText('오래된 추억을 스캔하는 중...');

        for (let i = 0; i <= totalCount; i++) {
            const currentProgress = Math.round((i / totalCount) * 100);
            setProgress(currentProgress);

            if (currentProgress === 30) setStatusText('잊고 있던 여행 사진 발견...');
            if (currentProgress === 60) setStatusText('맛있는 음식 사진 분류 중...');
            if (currentProgress === 90) setStatusText('분석이 거의 끝났습니다!');

            await new Promise(resolve => setTimeout(resolve, 50));
        }
    };

    return (
        <View className="flex-1 bg-black items-center justify-center relative">
            <StatusBar style="light" />

            {/* 📸 배경 슬라이드 이미지 (expo-image 사용) */}
            {currentPhoto && (
                <Animated.View
                    key={currentPhoto}
                    entering={FadeIn.duration(500)}
                    className="absolute w-full h-full opacity-60"
                >
                    <Image
                        source={{ uri: currentPhoto }}
                        style={{ width: '100%', height: '100%' }} // NativeWind 대신 style 직접 사용 (호환성 최적화)
                        contentFit="cover" // resizeMode 대신 contentFit 사용
                        blurRadius={5}
                        transition={200} // 부드러운 전환 효과 추가
                    />
                    <View className="absolute w-full h-full bg-black/40" />
                </Animated.View>
            )}

            {/* 📊 전경 UI */}
            <SafeAreaView className="w-full px-8 items-center z-10">

                <View className="items-center mb-10">
                    <Text className="text-white text-2xl font-bold mb-2 tracking-widest">
                        INDEXING
                    </Text>
                    <Text className="text-gray-300 text-sm font-medium">
                        {statusText}
                    </Text>
                </View>

                <View className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <View
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </View>

                <Text className="text-orange-400 font-bold text-lg self-end">
                    {progress}%
                </Text>

                <View className="absolute bottom-[-100px] items-center">
                    <Text className="text-gray-500 text-xs">
                        앱을 종료하지 마세요.
                    </Text>
                </View>

            </SafeAreaView>
        </View>
    );
}