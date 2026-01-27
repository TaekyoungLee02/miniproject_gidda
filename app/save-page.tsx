/**
 * 📢 백엔드(명근님/지연님) 연동 가이드
 * * 1. 검색 키워드 적재 (명근님):
 * - handleNewSearchSession 함수 내에서 새로운 tagName이 들어올 때 
 * DB의 SearchHistory 테이블에 저장하는 로직을 추가해 주세요.
 * * 2. 사진 필터링 연동 (태경님/명근님):
 * - 현재는 MediaLibrary에서 더미 데이터를 가져오고 있습니다.
 * - handleTagPress 또는 handleNewSearchSession 실행 시, 
 * AI 분석 결과나 DB 쿼리를 통해 특정 태그에 맞는 사진 리스트를 
 * setPhotos()에 담아주시면 UI에 바로 반영됩니다.
 * * 3. 저장소 로직 (명근님):
 * - handleSavePhotos(사진 저장)와 handleCreateAlbumAI(앨범 저장) 함수 내에
 * 실제 DB insert 로직을 구현해 주세요. 
 * (현재는 기기 앨범 'GIDDA Saved'에 물리적으로 저장하는 로직만 있음)
 */
import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, Animated, Platform, Modal,
    TouchableWithoutFeedback, StyleSheet, FlatList, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Menu, X, MessageSquare, Save, FolderPlus, Bot, Check, MessageCircle, Play } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 48) / COLUMN_COUNT;

const formatDateFull = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes().toString().padStart(2, '0')}분`;
};

export default function SavePage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userPrompt = params.prompt as string || "";

    // --- 기존 상태 (건들지 않음) ---
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [sessions, setSessions] = useState<{ [key: string]: MediaLibrary.Asset[] }>({});
    const [currentTagName, setCurrentTagName] = useState<string>("");
    const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [viewingPhoto, setViewingPhoto] = useState<MediaLibrary.Asset | null>(null);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
    const [isAiSheetVisible, setIsAiSheetVisible] = useState(false);
    const sheetAnim = useRef(new Animated.Value(height)).current;

    // --- 신규 상태: 사이드바 및 AI 로딩 ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const slideAnim = useRef(new Animated.Value(-width * 0.7)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const isModalOpenRef = useRef(false);

    useEffect(() => {
        if (userPrompt) handleNewSearchSession(userPrompt);
    }, [userPrompt]);

    // --- 기존 로직 (건들지 않음) ---
    const handleNewSearchSession = async (tagName: string) => {
        setActiveTags(prev => [tagName, ...prev.filter(t => t !== tagName)].slice(0, 5));
        const { assets } = await MediaLibrary.getAssetsAsync({ first: 50, sortBy: ['creationTime'] });
        const filtered = assets.filter((_, i) => (i + tagName.length) % 2 === 0);
        setSessions(prev => ({ ...prev, [tagName]: filtered }));
        setCurrentTagName(tagName);
        setPhotos(filtered);
    };

    const handleTagPress = async (tag: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentTagName(tag);
        setPhotos(sessions[tag] || []);
        setSelectedPhotos([]);
    };

    const toggleSelection = async (photo: MediaLibrary.Asset) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const isSelected = selectedPhotos.find(p => p.id === photo.id);
        setSelectedPhotos(isSelected ? selectedPhotos.filter(p => p.id !== photo.id) : [...selectedPhotos, photo]);
    };

    const handleCloseModal = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        isModalOpenRef.current = false;
        setIsDetailsExpanded(false);
        setViewingPhoto(null);
    };

    // --- 사이드바 제어 ---
    const toggleSidebar = () => {
        const nextIsOpen = !isSidebarOpen;
        const toValue = nextIsOpen ? 0 : -width * 0.7;
        Animated.parallel([
            Animated.timing(slideAnim, { toValue, duration: 300, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: nextIsOpen ? 1 : 0, duration: 300, useNativeDriver: true })
        ]).start();
        setIsSidebarOpen(nextIsOpen);
    };

    // --- 앨범 생성 로직 ---
    const ensureMediaPermissions = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
            return false;
        }
        return true;
    };

    const saveToAlbum = async (albumName: string, assets: MediaLibrary.Asset[]) => {
        if (assets.length === 0) return;
        const existing = await MediaLibrary.getAlbumAsync(albumName);
        if (!existing) {
            const created = await MediaLibrary.createAlbumAsync(albumName, assets[0], false);
            if (assets.length > 1) {
                await MediaLibrary.addAssetsToAlbumAsync(assets.slice(1), created, false);
            }
            return;
        }
        await MediaLibrary.addAssetsToAlbumAsync(assets, existing, false);
    };

    const handleSavePhotos = async () => {
        if (selectedPhotos.length === 0) return Alert.alert("알림", "사진을 선택해주세요.");
        if (!(await ensureMediaPermissions())) return;
        try {
            await saveToAlbum('GIDDA Saved', selectedPhotos);
            Alert.alert("저장 완료", "선택한 사진이 보관함 앨범에 저장되었습니다.");
            setSelectedPhotos([]);
        } catch (error) {
            Alert.alert("저장 실패", "사진 저장 중 문제가 발생했습니다.");
        }
    };

    const handleCreateAlbumAI = async () => {
        if (selectedPhotos.length === 0) return Alert.alert("알림", "사진을 선택해주세요.");
        if (!(await ensureMediaPermissions())) return;
        setIsLoadingAI(true);
        setTimeout(() => {
            setIsLoadingAI(false);
            const albumName = currentTagName ? `GIDDA_${currentTagName}` : 'GIDDA Album';
            saveToAlbum(albumName, selectedPhotos)
                .then(() => {
                    Alert.alert("AI 앨범 생성 완료", `앨범 "${albumName}"에 저장되었습니다.`, [
                        { text: "확인", onPress: () => setSelectedPhotos([]) }
                    ]);
                })
                .catch(() => {
                    Alert.alert("저장 실패", "앨범 저장 중 문제가 발생했습니다.");
                });
        }, 2500);
    };

    const handleOpenPhoto = async (photo: MediaLibrary.Asset) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        isModalOpenRef.current = true;
        setViewingPhoto(photo);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* --- 1. HomePage 스타일 사이드바 --- */}
            {isSidebarOpen && (
                <TouchableWithoutFeedback onPress={toggleSidebar}>
                    <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
                </TouchableWithoutFeedback>
            )}
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.sidebarHeader}><Text style={styles.sidebarHeaderTitle}>Your Memories</Text></View>
                    <View style={styles.menuList}>
                        {['사진 저장', '생성된 앨범', '키워드 기록'].map((item, idx) => (
                            <TouchableOpacity key={idx} style={styles.menuItem}>
                                <Text style={styles.menuItemText}>{item}</Text>
                                <Play color="#F38A2C" size={14} fill="#F38A2C" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </SafeAreaView>
            </Animated.View>

            <SafeAreaView style={{ flex: 1 }}>
                {/* --- 헤더 --- */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={toggleSidebar}><Menu color="#F38A2C" size={32} /></TouchableOpacity>
                        <Text style={styles.logoText}>GIDDA</Text>
                        <TouchableOpacity onPress={() => router.push('/home')}><MessageSquare color="#F38A2C" size={32} /></TouchableOpacity>
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

                {/* --- 사진 그리드 (기존 유지) --- */}
                <ScrollView style={styles.gridScroll} contentContainerStyle={{ paddingBottom: 150 }}>
                    <View style={styles.photoGrid}>
                        {photos.map((photo) => {
                            const isSelected = selectedPhotos.find(p => p.id === photo.id);
                            return (
                                <TouchableOpacity key={photo.id} style={styles.photoWrap} onPress={() => selectedPhotos.length > 0 ? toggleSelection(photo) : handleOpenPhoto(photo)} onLongPress={() => toggleSelection(photo)}>
                                    <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                                    {isSelected && <View style={styles.selectedOverlay} />}
                                    <TouchableOpacity style={[styles.checkCircle, isSelected && styles.checkCircleSelected]} onPress={() => toggleSelection(photo)}>
                                        {isSelected && <Check color="white" size={14} strokeWidth={4} />}
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* --- 하단 바 --- */}
                <View style={styles.controlBar}>
                    <View style={styles.actionArea}>
                        <TouchableOpacity style={styles.mainActionBtn} onPress={handleSavePhotos}><Save color="#F38A2C" size={28} /><Text style={styles.actionLabel}>사진 저장</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.mainActionBtn} onPress={handleCreateAlbumAI}><FolderPlus color="#F38A2C" size={28} /><Text style={styles.actionLabel}>앨범 저장</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.mainActionBtn} onPress={() => { setIsAiSheetVisible(true); Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true }).start(); }}><Bot color="#F38A2C" size={28} /><Text style={styles.actionLabel}>AI 설명</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.kakaoActionBtn}><MessageCircle color="black" fill="#FEE500" size={28} /><Text style={[styles.actionLabel, { color: '#333' }]}>카톡 공유</Text></TouchableOpacity>
                    </View>
                </View>

                {/* --- AI 생성 로딩 모달 --- */}
                <Modal transparent visible={isLoadingAI}>
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#F38A2C" />
                            <Text style={styles.loadingText}>AI가 앨범을 생성 중입니다...</Text>
                        </View>
                    </View>
                </Modal>

                {/* --- AI 설명 시트 (기존 유지) --- */}
                {isAiSheetVisible && (
                    <TouchableWithoutFeedback onPress={() => setIsAiSheetVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <Animated.View style={[styles.aiSheet, { transform: [{ translateY: sheetAnim }] }]}>
                                <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>#{currentTagName} 분석 리포트</Text><Text style={styles.assistantChatText}>이 세션의 사진들은 주로 #{currentTagName}와 관련된 맥락을 담고 있습니다.</Text>
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                )}
            </SafeAreaView>

            {/* --- 사진 상세 보기 모달 (기존 유지) --- */}
            <Modal visible={!!viewingPhoto} transparent={false} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <TouchableOpacity style={styles.closeFullView} onPress={handleCloseModal}><X color="white" size={28} /></TouchableOpacity>
                        <FlatList
                            data={photos}
                            horizontal
                            pagingEnabled
                            initialScrollIndex={photos.findIndex(p => p.id === viewingPhoto?.id)}
                            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                            onMomentumScrollEnd={(e) => {
                                if (!isModalOpenRef.current) return;
                                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                                setViewingPhoto(photos[index]);
                            }}
                            renderItem={({ item }) => (
                                <View style={{ width, height: '100%', justifyContent: 'center' }}>
                                    <Image source={{ uri: item.uri }} style={{ width, height: '100%' }} contentFit="contain" />
                                </View>
                            )}
                        />
                        <View style={[styles.photoInfoSection, !isDetailsExpanded && { height: 60 }]}>
                            <TouchableOpacity onPress={() => setIsDetailsExpanded(!isDetailsExpanded)} style={styles.infoDragHandleArea}><View style={styles.infoHandle} /></TouchableOpacity>
                            {isDetailsExpanded && (<View style={{ paddingHorizontal: 25, paddingBottom: 20 }}><Text style={styles.infoDate}>{viewingPhoto?.creationTime ? formatDateFull(viewingPhoto.creationTime) : ""}</Text><Text style={styles.keywordTag}>#{currentTagName}</Text></View>)}
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFCF5' },
    header: { paddingHorizontal: 25, paddingVertical: 15, backgroundColor: '#FFFCF5' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    logoText: { fontFamily: 'Montserrat-Regular', fontSize: 28, color: '#F38A2C' },
    tagScroll: { flexDirection: 'row' },
    tagItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F9F9F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
    tagItemActive: { backgroundColor: '#FFF5EB', borderColor: '#F38A2C' },
    tagText: { fontSize: 14, color: '#888' },
    tagTextActive: { color: '#F38A2C', fontWeight: 'bold' },
    gridScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#FFFCF5' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    photoWrap: { marginBottom: 10, borderRadius: 15, overflow: 'hidden', position: 'relative' },
    photo: { width: IMAGE_SIZE, height: IMAGE_SIZE },
    selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    checkCircle: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'white', backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    checkCircleSelected: { backgroundColor: '#F38A2C', borderColor: '#F38A2C' },
    controlBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE' },
    actionArea: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    mainActionBtn: { alignItems: 'center', flex: 1 },
    kakaoActionBtn: { alignItems: 'center', flex: 1 },
    actionLabel: { fontSize: 12, color: '#F38A2C', marginTop: 5, fontWeight: '600' },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', zIndex: 10 },
    aiSheet: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: height * 0.35, padding: 25 },
    sheetHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 5, alignSelf: 'center', marginBottom: 15 },
    sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    assistantChatText: { color: '#444', fontSize: 16, lineHeight: 24 },
    photoInfoSection: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0, width: '100%', overflow: 'hidden' },
    infoDragHandleArea: { paddingVertical: 15, width: '100%', alignItems: 'center' },
    infoHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 5 },
    infoDate: { fontSize: 16, color: '#333', fontFamily: 'Pretendard-Regular', marginBottom: 10 },
    keywordTag: { fontSize: 16, color: '#F38A2C', fontWeight: '600' },
    closeFullView: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, padding: 10 },

    // 신규 스타일
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
    menuItemText: { fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#666' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    loadingBox: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center' },
    loadingText: { marginTop: 15, fontFamily: 'Pretendard-Bold', color: '#F38A2C' }
});
