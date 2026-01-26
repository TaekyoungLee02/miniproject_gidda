import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Dimensions, Keyboard, TouchableWithoutFeedback, StyleSheet,
    KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, Play, X, Save, FolderPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function HomePage() {
    const router = useRouter();
    const [inputText, setInputText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const slideAnim = useRef(new Animated.Value(-width * 0.7)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const toggleSidebar = () => {
        const nextIsOpen = !isSidebarOpen;
        const toValueSlide = nextIsOpen ? 0 : -width * 0.7;
        const toValueOpacity = nextIsOpen ? 1 : 0;

        if (nextIsOpen) setIsSidebarOpen(true);

        Animated.parallel([
            Animated.timing(slideAnim, { toValue: toValueSlide, duration: 300, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: toValueOpacity, duration: 300, useNativeDriver: true })
        ]).start(({ finished }) => {
            if (finished && !nextIsOpen) setIsSidebarOpen(false);
        });

        if (nextIsOpen) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Keyboard.dismiss();
    };

    const handleSearch = () => {
        if (!inputText.trim()) return;
        router.push({ pathname: '/searching', params: { prompt: inputText } });
    };

    return (
        <TouchableWithoutFeedback onPress={() => { if (isSidebarOpen) toggleSidebar(); Keyboard.dismiss(); }}>
            <View style={styles.container}>
                <StatusBar style="dark" />

                {isSidebarOpen && (
                    <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
                )}

                <Animated.View style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: slideAnim }],
                        display: isSidebarOpen ? 'flex' : 'none'
                    }
                ]}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left']}>
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarHeaderTitle}>Your Memories</Text>
                        </View>
                        <View style={styles.menuList}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/add-photo'); }}>
                                <View style={styles.menuIconText}>
                                    <Save color="#F38A2C" size={20} />
                                    <Text style={styles.menuItemText}>사진 저장</Text>
                                </View>
                                <Play color="#F38A2C" size={14} fill="#F38A2C" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/add-album-ui'); }}>
                                <View style={styles.menuIconText}>
                                    <FolderPlus color="#F38A2C" size={20} />
                                    <Text style={styles.menuItemText}>생성된 앨범</Text>
                                </View>
                                <Play color="#F38A2C" size={14} fill="#F38A2C" />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Animated.View>

                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={toggleSidebar}>
                            <Menu color="#F38A2C" size={32} />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContent}>
                        <View style={styles.logoSection}>
                            <Text style={styles.logoText}>GIDDA</Text>
                            <Text style={styles.subText}>기억을 긷다, 추억을 잇다</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="예시) 신분증 사진 찾아줘!"
                                placeholderTextColor="#888"
                                value={inputText}
                                onChangeText={setInputText}
                                returnKeyType="search"
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity style={styles.inputButton} onPress={handleSearch}>
                                <Text style={styles.inputButtonText}>Enter</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFCF5' },
    header: { paddingHorizontal: 25, paddingVertical: 15 },
    mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    logoSection: { alignItems: 'center', marginBottom: 50 },
    logoText: { fontFamily: 'Montserrat-Regular', fontSize: 60, color: '#F38A2C', letterSpacing: 4 },
    subText: { fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#999', marginTop: -5 },

    // ✅ 에러 났던 shadowColor 부분 수정 완료
    inputContainer: {
        flexDirection: 'row', width: '85%', height: 60, backgroundColor: 'white',
        borderRadius: 15, paddingHorizontal: 15, alignItems: 'center',
        shadowColor: "#F38A2C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },
    textInput: { flex: 1, fontSize: 16, fontFamily: 'Pretendard-Regular', color: '#333' },
    inputButton: { paddingHorizontal: 15, height: 40, backgroundColor: '#F38A2C', borderRadius: 10, justifyContent: 'center' },
    inputButtonText: { color: 'white', fontFamily: 'Pretendard-Bold' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 20 },
    sidebar: {
        position: 'absolute', top: 0, left: 0, width: width * 0.7, height: height,
        backgroundColor: 'white', zIndex: 30, borderTopRightRadius: 40, borderBottomRightRadius: 40,
        elevation: 10, shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10
    },
    sidebarHeader: { backgroundColor: '#F38A2C', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 25 },
    sidebarHeaderTitle: { fontFamily: 'Pretendard-Bold', fontSize: 22, color: 'white' },
    menuList: { paddingHorizontal: 20, paddingTop: 30 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1.5,
        borderColor: 'rgba(243, 138, 44, 0.2)', borderRadius: 18, marginBottom: 20
    },
    menuIconText: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    menuItemText: { fontFamily: 'Pretendard-Medium', fontSize: 17, color: '#444' },
});