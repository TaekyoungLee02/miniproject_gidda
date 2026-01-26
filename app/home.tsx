import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Dimensions, Keyboard, TouchableWithoutFeedback, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, Alert // 👈 bjy
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, Play } from 'lucide-react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, Easing
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { analyzeUserSearch } from '../src/api/AzureService'; // 👈 bjy

const { width, height } = Dimensions.get('window');

export default function HomePage() {
    const router = useRouter();
    const [inputText, setInputText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // 👈 bjy

    const slideAnim = useSharedValue(-width * 0.7);
    const opacityAnim = useSharedValue(0);

    const toggleSidebar = () => {
        const toValue = isSidebarOpen ? -width * 0.7 : 0;
        slideAnim.value = withTiming(toValue, { duration: 300, easing: Easing.out(Easing.quad) });
        opacityAnim.value = withTiming(isSidebarOpen ? 0 : 1, { duration: 300 });
        setIsSidebarOpen(!isSidebarOpen);
        Keyboard.dismiss();
    };

    const sidebarStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideAnim.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: opacityAnim.value }));

    // --- 🚀 새로 추가할 핸들러 함수 (bjy)---
    const handleSearch = async () => {
        if (!inputText.trim()) return;
        
        setIsLoading(true); // 분석 시작
        try {
            // 1. Azure 분석 함수 호출
            const analysisResult = await analyzeUserSearch(inputText);

            if (analysisResult && analysisResult.suitability) {
                // 2. 적합할 경우: 분석된 엔티티와 가중치를 가지고 이동
                router.push({
                    pathname: '/searching' as any, 
                    params: { 
                        prompt: inputText,
                        entities: JSON.stringify(analysisResult.entities),
                        weights: [analysisResult.weights["0"], analysisResult.weights["1"], analysisResult.weights["2"]]
                    }
                });
            } else {
                // 3. 부적합할 경우 (바디체크 등 보안 필터링)
                Alert.alert("알림", analysisResult?.reason || "이미지 검색에 적합하지 않은 검색어입니다.");
            }
        } catch (error) {
            console.error("분석 중 오류 발생:", error);
            Alert.alert("오류", "분석 중 문제가 발생했습니다.");
        } finally {
            setIsLoading(false); // 분석 종료
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <StatusBar style="dark" />

            {/* --- 1. 사이드바 오버레이 (Z-Index 관리) --- */}
            {isSidebarOpen && (
                <TouchableWithoutFeedback onPress={toggleSidebar}>
                    <Animated.View style={[styles.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>
            )}

            {/* --- 2. 커스텀 사이드바 (최상단 배치) --- */}
            <Animated.View style={[styles.sidebar, sidebarStyle]}>
                <SafeAreaView edges={['top', 'left', 'bottom']} style={{ flex: 1 }}>
                    <View style={styles.sidebarHeader}>
                        <Text style={styles.sidebarHeaderTitle}>Your Memories</Text>
                    </View>
                    <View style={styles.menuList}>
                        {['사진 저장', '생성된 앨범', '키워드 기록'].map((item, idx) => (
                            <TouchableOpacity key={idx} style={styles.menuItem} activeOpacity={0.7}>
                                <Text style={styles.menuItemText}>{item}</Text>
                                <Play color="#F38A2C" size={14} fill="#F38A2C" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </SafeAreaView>
            </Animated.View>

            {/* --- 3. 메인 컨텐츠 (키보드 반응형) --- */}
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={toggleSidebar} activeOpacity={0.7}>
                            <Menu color="#F38A2C" size={36} strokeWidth={3} />
                        </TouchableOpacity>
                    </View>

                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.mainContent}>
                            <Text style={styles.logoText}>GIDDA</Text>

                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={isLoading ? "분석 중..." : "예) 강아지랑 찍은 사진 찾아줘!"} // 👈 bjy
                                    placeholderTextColor="#CCC"
                                    value={inputText}
                                    onChangeText={setInputText}
                                    multiline={false} // 글자 잘림 방지
                                    textAlignVertical="center"
                                    editable={!isLoading} // 👈 bjy
                                />
                                <TouchableOpacity
                                    style={[styles.inputButton, isLoading && { opacity: 0.5 }]} // 👈 로딩 중 버튼 불투명 처리 bjy
                                    onPress={handleSearch} // 👈 여기서 handleSearch 호출! bjy
                                    disabled={isLoading} // 👈 로딩 중 클릭 방지 bjy
                                >
                                    <Text style={styles.inputButtonText}>입력</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: 25, paddingTop: 10, zIndex: 10 },
    mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, marginBottom: 50 },
    logoText: { fontFamily: 'Montserrat-Regular', fontSize: 72, color: '#F38A2C', letterSpacing: 3.6, marginBottom: 30 },
    inputContainer: {
        width: '100%', height: 75, borderWidth: 1.5, borderColor: '#F38A2C', borderRadius: 20,
        backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15,
        shadowColor: "#F38A2C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3
    },
    textInput: { flex: 1, fontSize: 16, fontFamily: 'Pretendard-Regular', color: '#333', height: '100%', paddingVertical: 0 },
    inputButton: { width: 70, height: 50, borderWidth: 1, borderColor: '#F38A2C', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
    inputButtonText: { fontFamily: 'Pretendard-Bold', fontSize: 17, color: '#333' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 20 },
    sidebar: {
        position: 'absolute', top: height * 0.1, left: 0, width: width * 0.65, height: height * 0.6,
        backgroundColor: 'white', zIndex: 30, borderTopRightRadius: 40, borderBottomRightRadius: 40,
        borderWidth: 1, borderColor: 'rgba(243, 138, 44, 0.2)', elevation: 10
    },
    sidebarHeader: { backgroundColor: '#F38A2C', paddingVertical: 20, paddingHorizontal: 25 },
    sidebarHeaderTitle: { fontFamily: 'Pretendard-Bold', fontSize: 20, color: 'white' },
    menuList: { paddingHorizontal: 20, paddingTop: 25 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(243, 138, 44, 0.3)', borderRadius: 15, marginBottom: 15 },
    menuItemText: { fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#666' }
});