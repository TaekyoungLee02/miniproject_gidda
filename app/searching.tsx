import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { Menu } from 'lucide-react-native';

export default function SearchingPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userPrompt = params.prompt as string || "강아지랑 안고 있는 사진 찾아줘!";

    // SavePage에서 맡긴 태그 짐을 받습니다.
    const existingTags = params.tags as string;

    // 상태 관리
    const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
    const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
    const [statusText, setStatusText] = useState('기억을 탐색하고 있습니다...');

    useEffect(() => {
        startSearchingSimulation();
    }, []);

    const startSearchingSimulation = async () => {
        const assets = await MediaLibrary.getAssetsAsync({
            mediaType: 'photo',
            first: 50,
            sortBy: ['creationTime'],
        });

        // 에러 발생하던 부분!
        // NodeJS.Timeout 대신 'any'를 써서 React Native의 숫자 타입도 받아주게 수정 완료.
        let shuffleInterval: any;

        if (assets.assets.length > 0) {
            shuffleInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * assets.assets.length);
                setCurrentPhoto(assets.assets[randomIndex].uri);
            }, 100);

            const fakeKeywords = generateFakeKeywords(userPrompt);

            setTimeout(() => setExtractedKeywords([fakeKeywords[0]]), 1000);
            setTimeout(() => setExtractedKeywords([fakeKeywords[0], fakeKeywords[1]]), 2000);
            setTimeout(() => {
                setExtractedKeywords(fakeKeywords);
                setStatusText('관련된 추억을 발견했습니다!');
            }, 2800);

            // 3.5초 뒤 결과 페이지로 이동
            setTimeout(() => {
                clearInterval(shuffleInterval);

                // 결과 페이지로 돌아갈 때 태그 짐을 다시 돌려줍니다.
                router.replace({
                    pathname: '/save-page',
                    params: {
                        prompt: userPrompt,
                        tags: existingTags // 이거 없으면 태그 리셋됨!
                    }
                });
            }, 3500);
        }
    };

    const generateFakeKeywords = (text: string) => {
        const words = text.split(' ');
        const result = words.map(w => `[${w.replace('랑', '').replace('을', '')}]`);
        if (result.length < 3) result.push('[추억]');
        return result.slice(0, 3);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5F5] items-center relative">
            <StatusBar style="dark" />

            {/* 헤더 */}
            <View className="w-full flex-row items-center justify-between px-6 py-2 mb-10">
                <Menu color="#FB923C" size={28} />
                <Text className="text-orange-500 text-2xl font-bold tracking-widest">GIDDA</Text>
                <View className="w-7" />
            </View>

            {/* 상태 텍스트 */}
            <Text className="text-gray-600 text-base mb-8 font-medium">
                {statusText}
            </Text>

            {/* 📸 폴라로이드 프레임 */}
            <View className="bg-white p-4 pb-12 shadow-2xl rotate-2 border border-gray-100 mb-12">
                {currentPhoto ? (
                    <Image
                        source={{ uri: currentPhoto }}
                        style={{ width: 260, height: 200 }}
                        contentFit="cover"
                        className="bg-gray-200"
                    />
                ) : (
                    <View className="w-[260px] h-[200px] bg-black items-center justify-center">
                        <ActivityIndicator color="white" />
                    </View>
                )}
            </View>

            {/* 사용자 프롬프트 표시 */}
            <View className="w-[85%] bg-white px-6 py-4 rounded-full shadow-sm border border-gray-200 mb-6 items-center">
                <Text className="text-gray-800 text-base text-center" numberOfLines={1}>
                    "{userPrompt}"
                </Text>
            </View>

            {/* AI 키워드 추출 결과 */}
            <View className="flex-row space-x-2">
                {extractedKeywords.map((keyword, index) => (
                    <Text key={index} className="text-orange-500 text-lg font-bold animate-pulse">
                        {keyword}
                    </Text>
                ))}
                {extractedKeywords.length === 0 && (
                    <Text className="text-gray-400 text-sm">키워드 분석 중...</Text>
                )}
            </View>

            {/* 하단 로딩 인디케이터 */}
            <View className="absolute bottom-20">
                <ActivityIndicator size="small" color="#9CA3AF" />
            </View>

        </SafeAreaView>
    );
}