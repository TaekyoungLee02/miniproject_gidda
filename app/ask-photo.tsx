import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { ArrowLeft, Send } from 'lucide-react-native';

export default function AskPhotoPage() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // 🛠️ [수정] params로 넘어온 URI 리스트 파싱
    let photoUris: string[] = [];
    if (params.uris) {
        try {
            photoUris = JSON.parse(params.uris as string);
        } catch (e) {
            photoUris = [];
        }
    } else if (params.uri) {
        photoUris = [params.uri as string];
    }

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { id: 1, text: "선택하신 사진들에 대해 무엇이든 물어보세요! 🧐", isAi: true }
    ]);

    const handleSend = () => {
        if (!input.trim()) return;

        const newMsgs = [...messages, { id: Date.now(), text: input, isAi: false }];
        setMessages(newMsgs);
        setInput('');

        setTimeout(() => {
            setMessages(prev => [
                ...prev,
                { id: Date.now() + 1, text: "이 사진들은 2024년 1월, 행복한 순간을 담고 있네요! 표정이 정말 생생합니다.", isAi: true }
            ]);
        }, 1000);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* 헤더 */}
            <View className="px-4 py-2 flex-row items-center border-b border-gray-100 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ArrowLeft color="black" size={24} />
                </TouchableOpacity>
                <Text className="text-lg font-bold">AI에게 질문하기</Text>
            </View>

            {/* 채팅 영역 */}
            <ScrollView className="flex-1 px-4 py-4 bg-[#F5F5F5]">

                {/* 🛠️ [수정] 선택한 사진들 보여주기 (여러 장일 경우 가로 스크롤) */}
                <View className="mb-6">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}>
                        {photoUris.map((uri, index) => (
                            <View key={index} className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                                <Image
                                    source={{ uri: uri }}
                                    style={{ width: 200, height: 200, borderRadius: 10 }}
                                    contentFit="cover"
                                />
                                {/* 사진 번호 배지 */}
                                {photoUris.length > 1 && (
                                    <View className="absolute top-3 right-3 bg-black/60 w-6 h-6 rounded-full items-center justify-center">
                                        <Text className="text-white text-xs font-bold">{index + 1}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                    <Text className="text-center text-gray-400 text-xs mt-2">
                        {photoUris.length}장의 사진이 선택되었습니다.
                    </Text>
                </View>

                {/* 메시지 리스트 */}
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        className={`max-w-[80%] p-4 rounded-2xl mb-3 ${msg.isAi ? 'bg-white self-start rounded-tl-none border border-gray-200' : 'bg-orange-500 self-end rounded-tr-none'
                            }`}
                    >
                        <Text className={msg.isAi ? 'text-gray-800' : 'text-white font-medium'}>
                            {msg.text}
                        </Text>
                    </View>
                ))}
                <View className="h-10" />
            </ScrollView>

            {/* 하단 입력창 */}
            <View className="p-4 bg-white border-t border-gray-100 flex-row items-center">
                <TextInput
                    className="flex-1 bg-gray-100 rounded-full px-5 py-3 mr-3 text-base"
                    placeholder="질문을 입력하세요..."
                    value={input}
                    onChangeText={setInput}
                />
                <TouchableOpacity onPress={handleSend} className="bg-orange-500 w-12 h-12 rounded-full items-center justify-center">
                    <Send color="white" size={20} />
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}