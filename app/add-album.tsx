import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, FolderPlus } from 'lucide-react-native'; // 아이콘 변경

export default function AddAlbumPage() {
    const router = useRouter();
    const [text, setText] = useState('');

    const handleCreate = () => {
        if (text.length === 0) {
            Alert.alert("알림", "앨범 이름을 입력해주세요!");
            return;
        }
        Alert.alert("앨범 생성 완료!", `'${text}' 앨범이 성공적으로 만들어졌습니다.`, [
            { text: "확인", onPress: () => router.back() }
        ]);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5F5] relative">
            <StatusBar style="dark" />

            {/* 헤더 */}
            <View className="px-6 py-4">
                <Menu color="#FB923C" size={32} />
            </View>

            {/* 메인 컨텐츠 */}
            <View className="flex-1 px-8 pt-10">

                {/* 안내 문구 (수정됨) */}
                <View className="bg-white p-6 rounded-3xl rounded-tl-none border border-gray-200 shadow-sm mb-4">
                    <Text className="text-xl font-medium text-gray-800 leading-8">
                        선택한 사진들을 모아서{"\n"}
                        <Text className="font-bold text-orange-500">어떤 앨범</Text>으로 만들까요?
                    </Text>
                </View>

                {/* 장식용 아이콘 (앨범 추가 느낌) */}
                <FolderPlus color="#FB923C" size={40} style={{ marginLeft: 10 }} />

            </View>

            {/* 하단 입력창 */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="absolute bottom-10 w-full px-6"
            >
                <View className="bg-white rounded-2xl border border-gray-300 flex-row items-center p-2 h-16 shadow-sm">
                    <TextInput
                        className="flex-1 px-4 text-base text-gray-700 h-full"
                        placeholder="예) 2024년 여름 휴가, 우리집 댕댕이"  // 플레이스홀더 수정
                        value={text}
                        onChangeText={setText}
                        autoFocus={true} // 들어오자마자 키보드 띄우기
                    />
                    <TouchableOpacity
                        className="bg-orange-500 px-6 py-2 rounded-xl active:bg-orange-600"
                        onPress={handleCreate}
                    >
                        <Text className="font-bold text-white">생성</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
}