import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Platform, Modal,
    TouchableWithoutFeedback, StyleSheet, FlatList, ActivityIndicator, Pressable
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Menu, X, Save, FolderPlus, Bot, Check, Play, Plus, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PhotoDatabaseService } from "@/src/services/PhotoDatabaseService";
import { createAlbum, addPhotosToAlbum, savePhotosToFavorite } from '../src/db/database';

// 🔴 [백엔드] Photo 타입 및 서비스 임포트
import { Photo } from '../src/lib/types';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 48) / COLUMN_COUNT;

export default function SavePageUI() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userPrompt = params.prompt as string || "";

    // 🔴 [수정] searching.tsx에서 넘어온 실제 검색 결과 데이터 파싱
    const incomingPhotos: Photo[] = params.photos ? JSON.parse(params.photos as string) : [];
    const incomingKeywords: string[] = params.keywords ? JSON.parse(params.keywords as string) : [];

    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [sessions, setSessions] = useState<{ [key: string]: Photo[] }>({}); 
    const [currentTagName, setCurrentTagName] = useState<string>("");
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '', onConfirm: () => { } });

    const slideAnim = useRef(new Animated.Value(-width * 0.7)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(1)).current;

    // 🔴 [데이터 이식] 진입 시 검색 결과와 키워드 세팅
    useEffect(() => {
        if (incomingPhotos.length > 0) {
            const tagName = userPrompt || "검색 결과";
            
            // 세션 데이터 저장
            setSessions(prev => ({ ...prev, [tagName]: incomingPhotos }));
            setCurrentTagName(tagName);
            setPhotos(incomingPhotos);
            
            // 상단 태그 바: 넘어온 키워드들 표시
            const tagsToShow = incomingKeywords.length > 0 
                ? incomingKeywords.map((k: string) => k.replace('#', '')) 
                : [tagName];
            setActiveTags(tagsToShow);
        }
    }, []);

    const showGiddaAlert = (title: string, message: string, onConfirm = () => { }) => {
        setAlertConfig({ title, message, onConfirm });
        setAlertVisible(true);
    };

    const handleTagPress = async (tag: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentTagName(tag);
        // 해당 태그에 맞는 사진 세션 로드 (없으면 기본 검색결과)
        setPhotos(sessions[tag] || incomingPhotos);
        setSelectedPhotos([]);
    };

    const toggleSidebar = () => {
        const nextIsOpen = !isSidebarOpen;
        if (nextIsOpen) setIsSidebarOpen(true);
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: nextIsOpen ? 0 : -width * 0.7, duration: 300, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: nextIsOpen ? 1 : 0, duration: 300, useNativeDriver: true })
        ]).start(({ finished }) => { if (finished && !nextIsOpen) setIsSidebarOpen(false); });
        if (nextIsOpen) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    // 로고 클릭 시 효과 및 이동
    const handleLogoPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.sequence([
            Animated.timing(logoScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(logoScale, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start(() => router.replace('/home'));
    };

    // + 버튼 클릭 시 방어 로직
    const handlePlusPress = () => {
        if (selectedPhotos.length > 0) {
            showGiddaAlert(
                "알림",
                "선택된 사진이 있습니다. 선택을 해제하거나 저장한 후 새로운 탐색을 시작할까요?",
                () => { setSelectedPhotos([]); router.push('/home'); }
            );
        } else {
            router.push('/home');
        }
    };

    const handleSavePhotos = async () => {
        if (selectedPhotos.length === 0) return showGiddaAlert("알림", "저장할 사진을 선택해주세요.");

        try {
            const selectedIds = selectedPhotos.map(p => p.id);
            
            // 🆕 [연결] 토글이 아니라 '무조건 저장'하는 함수 호출
            await savePhotosToFavorite(selectedIds);

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            showGiddaAlert("저장 완료", "선택한 사진이 '즐겨찾기' 앨범에 저장되었습니다.", () => {
                setSelectedPhotos([]);
                router.push('/add-photo'); 
            });

        } catch (error) {
            console.error(error);
            showGiddaAlert("오류", "사진 저장 중 문제가 발생했습니다.");
        }
    };

    const handleCreateAlbumAI = async () => {
        if (selectedPhotos.length === 0) return showGiddaAlert("알림", "앨범을 만들 사진을 선택해주세요.");
        setIsLoadingAI(true);
        setTimeout(() => {
            setIsLoadingAI(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showGiddaAlert("앨범 생성 완료", "새로운 추억 앨범이 '생성된 앨범'함에 추가되었습니다.", () => {
                router.push({
                    pathname: '/add-album-ui' as any,
                    params: {
                        selected: JSON.stringify(selectedPhotos.map((v) => JSON.stringify(v)))
                    }
                });
            });
        }, 2000);
    };

    const toggleSelection = (photo: Photo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const isSelected = selectedPhotos.find(p => p.id === photo.id);
        setSelectedPhotos(isSelected ? selectedPhotos.filter(p => p.id !== photo.id) : [...selectedPhotos, photo]);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            {isSidebarOpen && <TouchableWithoutFeedback onPress={toggleSidebar}><Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} /></TouchableWithoutFeedback>}

            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <SafeAreaView style={{ flex: 1 }} edges={['top', 'left']}>
                    <View style={styles.sidebarHeader}><Text style={styles.sidebarHeaderTitle}>Your Memories</Text></View>
                    <View style={styles.menuList}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/add-photo'); }}>
                            <Text style={styles.menuItemText}>사진 저장</Text><Play color="#F38A2C" size={14} fill="#F38A2C" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSidebar(); router.push('/add-album-ui'); }}>
                            <Text style={styles.menuItemText}>생성된 앨범</Text><Play color="#F38A2C" size={14} fill="#F38A2C" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Animated.View>

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={toggleSidebar}>
                            <Menu color="#F38A2C" size={32} />
                        </TouchableOpacity>

                        <Pressable onPress={handleLogoPress}>
                            <Animated.Text style={[styles.logoText, { transform: [{ scale: logoScale }] }]}>
                                GIDDA
                                </Animated.Text>
                        </Pressable>

                        {/* ✅ 디자인 개선된 + 버튼: 크림색 둥근 네모 배경 추가 */}
                        <TouchableOpacity 
                            onPress={handlePlusPress}
                            style={styles.plusButtonContainer}
                            activeOpacity={0.7}
                         >
                            <Plus color="#F38A2C" size={24} strokeWidth={3} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                        {activeTags.map((tag, index) => (
                            <TouchableOpacity key={index} onPress={() => handleTagPress(tag)} style={[styles.tagItem, currentTagName === tag && styles.tagItemActive]}>
                                <Text style={[styles.tagText, currentTagName === tag && styles.tagTextActive]}>#{tag}</Text>
                                <TouchableOpacity onPress={() => setActiveTags(activeTags.filter(t => t !== tag))}><X size={14} color={currentTagName === tag ? "#F38A2C" : "#999"} style={{ marginLeft: 5 }} /></TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView style={styles.gridScroll} contentContainerStyle={{ paddingBottom: 150 }}>
                    <View style={styles.photoGrid}>
                        {photos.map((photo) => {
                            const isSelected = selectedPhotos.find(p => p.id === photo.id);
                            return (
                                <TouchableOpacity key={photo.id} style={styles.photoWrap} onPress={() => toggleSelection(photo)}>
                                    <Image source={{ uri: photo.local_uri }} style={styles.photo} contentFit="cover" />
                                    {isSelected && <View style={styles.selectedOverlay} />}
                                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>{isSelected && <Check color="white" size={14} strokeWidth={4} />}</View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={styles.controlBar}>
                    <View style={styles.actionArea}>
                        <TouchableOpacity style={styles.mainActionBtn} onPress={handleSavePhotos}><Save color="#F38A2C" size={28} /><Text style={styles.actionLabel}>사진 저장</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.mainActionBtn} onPress={handleCreateAlbumAI}><FolderPlus color="#F38A2C" size={28} /><Text style={styles.actionLabel}>앨범 저장</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.mainActionBtn}><Bot color="#F38A2C" size={28} /><Text style={styles.actionLabel}>AI</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.kakaoActionBtn}>
                            <MessageCircle color="black" fill="#FEE500" size={28} />
                            <Text style={[styles.actionLabel, { color: '#333' }]}>카톡 공유</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Modal transparent visible={isLoadingAI}>
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#F38A2C" />
                            <Text style={styles.loadingText}>AI가 앨범을 긷고 있습니다...</Text>
                        </View>
                    </View>
                </Modal>

                <Modal transparent visible={alertVisible} animationType="fade">
                    <View style={styles.alertOverlay}>
                        <View style={styles.alertBox}>
                            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
                            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
                            <TouchableOpacity style={styles.alertConfirmBtn} onPress={() => { setAlertVisible(false); alertConfig.onConfirm(); }}>
                                <Text style={styles.alertConfirmText}>확인</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFCF5' },
    header: { paddingHorizontal: 25, paddingVertical: 15 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoText: { fontFamily: 'Montserrat-Regular', fontSize: 28, color: '#F38A2C' },

    // ✅ + 버튼 디자인: 크림색 배경 및 라운딩 처리
    plusButtonContainer: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(243, 138, 44, 0.08)', // 연한 크림 오렌지색
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(243, 138, 44, 0.2)'
    },

    tagScroll: { flexDirection: 'row', marginTop: 15 },
    tagItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F9F9F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
    tagItemActive: { backgroundColor: '#FFF5EB', borderColor: '#F38A2C' },
    tagText: { fontSize: 14, color: '#888' },
    tagTextActive: { color: '#F38A2C', fontWeight: 'bold' },
    gridScroll: { flex: 1, paddingHorizontal: 20 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    photoWrap: { marginBottom: 10, borderRadius: 15, overflow: 'hidden', position: 'relative' },
    photo: { width: IMAGE_SIZE, height: IMAGE_SIZE },
    selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(243, 138, 44, 0.3)' },
    checkCircle: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'white', backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    checkCircleSelected: { backgroundColor: '#F38A2C', borderColor: '#F38A2C' },
    controlBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE' },
    actionArea: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    mainActionBtn: { alignItems: 'center', flex: 1 },
    kakaoActionBtn: { alignItems: 'center', flex: 1 },
    actionLabel: { fontSize: 12, color: '#F38A2C', marginTop: 5, fontWeight: '600' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 20 },
    sidebar: { position: 'absolute', top: 0, left: 0, width: width * 0.7, height: height, backgroundColor: 'white', zIndex: 30, borderTopRightRadius: 40, borderBottomRightRadius: 40, elevation: 10 },
    sidebarHeader: { backgroundColor: '#F38A2C', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 25 },
    sidebarHeaderTitle: { fontFamily: 'Pretendard-Bold', fontSize: 22, color: 'white' },
    menuList: { paddingHorizontal: 20, paddingTop: 30 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'rgba(243, 138, 44, 0.2)', borderRadius: 18, marginBottom: 20 },
    menuItemText: { fontFamily: 'Pretendard-Medium', fontSize: 17, color: '#444' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    loadingBox: { backgroundColor: 'white', padding: 35, borderRadius: 25, alignItems: 'center', width: '80%' },
    loadingText: { marginTop: 20, fontFamily: 'Pretendard-Bold', color: '#F38A2C', fontSize: 16 },
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    alertBox: { width: width * 0.75, backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    alertTitle: { fontFamily: 'Pretendard-Bold', fontSize: 19, color: '#F38A2C', marginBottom: 10 },
    alertMessage: { fontFamily: 'Pretendard-Regular', fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    alertConfirmBtn: { backgroundColor: '#F38A2C', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 15 },
    alertConfirmText: { fontFamily: 'Pretendard-Bold', color: 'white', fontSize: 16 }
});
