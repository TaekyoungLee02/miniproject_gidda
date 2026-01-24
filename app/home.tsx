import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Dimensions, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, X, Search, ChevronRight, Play } from 'lucide-react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, Easing
} from 'react-native-reanimated';
import { useRouter } from 'expo-router'; // ✅ router추가

const { width, height } = Dimensions.get('window');

export default function HomePage() {
    const router = useRouter(); // ✅ router 정의

    const [inputText, setInputText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // 사이드바 애니메이션 값 (0: 닫힘, 1: 열림)
    const slideAnim = useSharedValue(-width * 0.7);
    const opacityAnim = useSharedValue(0);

    // 사이드바 토글 함수
    const toggleSidebar = () => {
        const toValue = isSidebarOpen ? -width * 0.7 : 0;
        slideAnim.value = withTiming(toValue, {
            duration: 300,
            easing: Easing.out(Easing.quad),
        });

        opacityAnim.value = withTiming(isSidebarOpen ? 0 : 1, { duration: 300 });
        setIsSidebarOpen(!isSidebarOpen);
        Keyboard.dismiss();
    };

    const sidebarStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: slideAnim.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacityAnim.value,
    }));

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5F5] relative">
            <StatusBar style="dark" />

            {/* --- 1. 상단 헤더 (햄버거 버튼) --- */}
            <View className="px-6 py-4 z-10">
                <TouchableOpacity onPress={toggleSidebar} className="p-2 -ml-2">
                    <Menu color="#FB923C" size={32} strokeWidth={2.5} />
                </TouchableOpacity>
            </View>

            {/* --- 2. 메인 컨텐츠 (중앙 정렬) --- */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1 items-center justify-center px-6 -mt-20">

                    <Text className="text-orange-500 text-6xl font-bold mb-10 tracking-tighter">
                        GIDDA
                    </Text>

                    {/* 프롬프트 입력창 */}
                    <View className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex-row items-center h-16">
                        <TextInput
                            className="flex-1 px-4 text-lg text-gray-800 h-full"
                            placeholder="예) 강아지랑 찍은 사진 찾아줘!"
                            placeholderTextColor="#9CA3AF"
                            value={inputText}
                            onChangeText={setInputText}
                            returnKeyType="search"
                        />
                        <TouchableOpacity
                            className="bg-orange-500 w-12 h-12 rounded-xl items-center justify-center active:bg-orange-600"
                            onPress={() => {
                                if (inputText.trim().length > 0) {
                                    // ✅  router로 검색 페이지로 이동 + 프롬프트 전달
                                    router.push({
                                        pathname: '/searching',
                                        params: { prompt: inputText }
                                    });
                                }
                            }}
                        >
                            <Search color="white" size={20} strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>


            {/* --- 3. 커스텀 사이드바 (Overlay) --- */}

            {isSidebarOpen && (
                <TouchableWithoutFeedback onPress={toggleSidebar}>
                    <Animated.View
                        style={[
                            { position: 'absolute', width: width, height: height, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 20 },
                            backdropStyle
                        ]}
                    />
                </TouchableWithoutFeedback>
            )}

            <Animated.View
                style={[
                    { position: 'absolute', top: 0, left: 0, width: width * 0.7, height: height, backgroundColor: 'white', zIndex: 30, padding: 24 },
                    sidebarStyle
                ]}
            >
                <SafeAreaView>
                    <View className="flex-row justify-between items-center mb-10 mt-2">
                        <Text className="text-2xl font-bold text-gray-800">MENU</Text>
                        <TouchableOpacity onPress={toggleSidebar}>
                            <X color="#9CA3AF" size={28} />
                        </TouchableOpacity>
                    </View>

                    <View className="space-y-6">
                        <TouchableOpacity className="flex-row items-center space-x-3 active:opacity-50">
                            <Play color="#FB923C" size={18} fill="#FB923C" style={{ transform: [{ rotate: '0deg' }] }} />
                            <Text className="text-lg font-medium text-gray-700">사진 저장 내역</Text>
                        </TouchableOpacity>

                        <View className="h-[1px] bg-gray-100 w-full" />

                        <TouchableOpacity className="flex-row items-center space-x-3 active:opacity-50">
                            <Play color="#FB923C" size={18} fill="#FB923C" />
                            <Text className="text-lg font-medium text-gray-700">정리된 앨범 목록</Text>
                        </TouchableOpacity>

                        <View className="h-[1px] bg-gray-100 w-full" />
                    </View>

                    <View className="absolute top-[80vh] left-0 px-6">
                        <Text className="text-gray-300 text-xs">Ver 1.0.0</Text>
                    </View>

                </SafeAreaView>
            </Animated.View>

        </SafeAreaView>
    );
}