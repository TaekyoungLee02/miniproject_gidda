import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { X, Share2, Info, MessageCircle } from 'lucide-react-native'; // ✅ 아이콘 추가
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function DetailPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const photoUri = params.uri as string;

    const fakeTags = ["#강아지", "#귀여움", "#산책", "#2023년_추억"];

    return (
        <View className="flex-1 bg-black relative">
            <StatusBar style="light" />

            {/* --- 1. 상단 헤더 --- */}
            <SafeAreaView className="absolute top-0 w-full z-20 flex-row justify-between px-6 pt-2">
                {/* 뒤로 가기 (X) */}
                <TouchableOpacity onPress={() => router.back()} className="bg-black/40 p-2 rounded-full">
                    <X color="white" size={28} />
                </TouchableOpacity>

                {/* 우측 아이콘 묶음 (질문하기 + 정보) */}
                <View className="flex-row space-x-3">

                    {/* ✅ 질문하기 버튼 (AskPhoto로 이동) */}
                    <TouchableOpacity
                        className="bg-black/40 p-2 rounded-full"
                        onPress={() => router.push({ pathname: '/ask-photo', params: { uri: photoUri } })}
                    >
                        <MessageCircle color="white" size={24} />
                    </TouchableOpacity>

                    {/* 정보 버튼 (기존 유지) */}
                    <TouchableOpacity className="bg-black/40 p-2 rounded-full">
                        <Info color="white" size={24} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* --- 2. 메인 사진 (전체 화면) --- */}
            <View className="flex-1 justify-center items-center">
                {photoUri ? (
                    <Image
                        source={{ uri: photoUri }}
                        style={{ width: width, height: height * 0.8 }}
                        contentFit="contain"
                    />
                ) : (
                    <Text className="text-white">사진 로드 실패</Text>
                )}
            </View>

            {/* --- 3. 하단 정보 오버레이 --- */}
            <View className="absolute bottom-0 w-full bg-black/60 pt-6 pb-12 px-6 rounded-t-3xl">
                <View className="flex-row justify-between items-end mb-4">
                    <View>
                        <Text className="text-white text-2xl font-bold mb-1">AI 분석 결과</Text>
                        <Text className="text-gray-300 text-sm">2024년 1월 24일 • 서울특별시</Text>
                    </View>
                    <TouchableOpacity className="bg-orange-500 p-3 rounded-full mb-2">
                        <Share2 color="white" size={20} />
                    </TouchableOpacity>
                </View>

                {/* 태그 리스트 */}
                <View className="flex-row flex-wrap gap-2">
                    {fakeTags.map((tag, index) => (
                        <View key={index} className="bg-white/20 px-3 py-1 rounded-full border border-white/10">
                            <Text className="text-white font-medium">{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}