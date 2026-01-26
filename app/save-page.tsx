import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, Animated, TextInput, KeyboardAvoidingView, Platform, Keyboard, Modal, TouchableWithoutFeedback, Easing, StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Menu, X, ArrowUp, Play, Sparkles, MessageCircle, Save, FolderPlus, Bot } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 48) / COLUMN_COUNT;

// ✅ 양동이 아이콘 (돋보기 대체)
const BucketIcon = require('../assets/images/favicon2.png');

export default function SavePage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const userPrompt = params.prompt as string || "";

    // --- 상태 관리 ---
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [currentFilterIndex, setCurrentFilterIndex] = useState<number | null>(null);
    const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);

    // 선택 및 보기 모드 상태
    const [selectedPhotos, setSelectedPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [viewingPhoto, setViewingPhoto] = useState<MediaLibrary.Asset | null>(null);

    const [inputText, setInputText] = useState("");
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);

    // UI 및 애니메이션 상태
    const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);
    const [isAlbumModalVisible, setIsAlbumModalVisible] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");
    const slideUpAnim = useRef(new Animated.Value(300)).current;
    const menuFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { loadPhotos(); }, []);

    const loadPhotos = async () => {
        const assets = await MediaLibrary.getAssetsAsync({ first: 50, sortBy: ['creationTime'] });
        setAllPhotos(assets.assets);
        let currentTags: string[] = [];
        if (params.tags) {
            try { currentTags = JSON.parse(params.tags as string); } catch (e) { currentTags = [userPrompt]; }
        } else if (userPrompt && userPrompt !== "검색 결과") {
            currentTags = [userPrompt];
        }
        setActiveTags(currentTags);
        if (currentTags.length > 0) {
            const lastIndex = currentTags.length - 1;
            const lastTag = currentTags[lastIndex];
            setCurrentFilterIndex(lastIndex);
            const seed = lastTag.length + lastIndex;
            const filtered = assets.assets.filter((_, i) => (i + seed) % 2 === 0 || (i + seed) % 3 === 0);
            setPhotos(filtered);
        } else { setPhotos(assets.assets); }
    };

    // 🛠️ 터치 로직: 짧게 터치(상세보기), 길게 터치(선택모드 진입/해제)
    const handlePhotoPress = (photo: MediaLibrary.Asset) => {
        if (selectedPhotos.length > 0) {
            toggleSelection(photo);
        } else {
            setViewingPhoto(photo);
        }
    };

    const handlePhotoLongPress = (photo: MediaLibrary.Asset) => {
        toggleSelection(photo);
    };

    const toggleSelection = (photo: MediaLibrary.Asset) => {
        const isSelected = selectedPhotos.find(p => p.id === photo.id);
        if (isSelected) {
            setSelectedPhotos(selectedPhotos.filter(p => p.id !== photo.id));
        } else {
            setSelectedPhotos([...selectedPhotos, photo]);
        }
    };

    const toggleFloatingMenu = () => {
        const toValue = isFloatingMenuOpen ? 0 : 1;
        Animated.timing(menuFadeAnim, { toValue, duration: 200, useNativeDriver: true }).start();
        setIsFloatingMenuOpen(!isFloatingMenuOpen);
    };

    const closeAiCard = () => {
        Animated.timing(slideUpAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => setAiAnswer(null));
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={{ flex: 1 }}>

                {/* --- 헤더 섹션 --- */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={toggleFloatingMenu}>
                            <Menu color="#F38A2C" size={32} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.logoText}>GIDDA</Text>
                        <TouchableOpacity onPress={() => router.push('/ask-photo')}>
                            <Bot color="#F38A2C" size={32} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                        {activeTags.map((tag, index) => (
                            <View key={index} style={[styles.tagItem, currentFilterIndex === index && styles.tagItemActive]}>
                                <TouchableOpacity onPress={() => { setCurrentFilterIndex(index); }} style={styles.tagContent}>
                                    <Text style={[styles.tagText, currentFilterIndex === index && styles.tagTextActive]}>#{tag}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setActiveTags(activeTags.filter((_, i) => i !== index))} style={styles.tagRemove}>
                                    <X size={14} color={currentFilterIndex === index ? "#F38A2C" : "#999"} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* --- 📸 사진 그리드 --- */}
                <ScrollView style={styles.gridScroll} contentContainerStyle={{ paddingBottom: 150 }}>
                    <View style={styles.photoGrid}>
                        {photos.map((photo) => {
                            const isSelected = selectedPhotos.find(p => p.id === photo.id);
                            return (
                                <TouchableOpacity
                                    key={photo.id}
                                    activeOpacity={0.8}
                                    style={styles.photoWrap}
                                    onPress={() => handlePhotoPress(photo)}
                                    onLongPress={() => handlePhotoLongPress(photo)}
                                >
                                    <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                                    {/* ✅ 선택 시 어두워지는 효과 (체크박스 대신) */}
                                    {isSelected && <View style={styles.selectedOverlay} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* --- 하단 컨트롤 바 --- */}
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.controlBar}>
                    <View style={styles.inputArea}>
                        {selectedPhotos.length > 0 && (
                            <View style={styles.selectionActions}>
                                <TouchableOpacity style={styles.actionBtn}><Save color="#F38A2C" size={24} /></TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => setIsAlbumModalVisible(true)}><FolderPlus color="#F38A2C" size={24} /></TouchableOpacity>
                            </View>
                        )}

                        <View style={[styles.searchBox, selectedPhotos.length > 0 && styles.searchBoxActive]}>
                            {/* ✅ 양동이 아이콘으로 돋보기 대체 */}
                            <Image source={BucketIcon} style={styles.customBucketIcon} contentFit="contain" />
                            <TextInput
                                style={styles.textInput}
                                placeholder={selectedPhotos.length > 0 ? `${selectedPhotos.length}장 선택됨...` : "검색어 입력"}
                                placeholderTextColor="#CCC"
                                value={inputText}
                                onChangeText={setInputText}
                            />
                        </View>

                        <TouchableOpacity style={[styles.sendBtn, inputText && styles.sendBtnActive]}>
                            <ArrowUp color="white" size={24} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.kakaoBtn} onPress={() => Alert.alert("공유", "카카오톡 전송")}>
                            <MessageCircle fill="black" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* ✅ 1. 사진 전체 보기 + 하단 정보 모달 */}
            <Modal visible={!!viewingPhoto} transparent={false} animationType="slide">
                <View style={styles.fullViewContainer}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <TouchableOpacity style={styles.closeFullView} onPress={() => setViewingPhoto(null)}>
                            <X color="white" size={30} />
                        </TouchableOpacity>

                        <View style={styles.fullImageWrap}>
                            {viewingPhoto && <Image source={{ uri: viewingPhoto.uri }} style={styles.fullImage} contentFit="contain" />}
                        </View>

                        {/* ✅ 사진 하단 정보 및 키워드 추출 영역 */}
                        <View style={styles.photoInfoSection}>
                            <View style={styles.infoHandle} />
                            <Text style={styles.infoDate}>2024년 1월 25일 오후 3:18</Text>
                            <View style={styles.keywordList}>
                                <Text style={styles.keywordTag}>[안녕]</Text>
                                <Text style={styles.keywordTag}>[추억]</Text>
                                <Text style={styles.keywordTag}>[강아지]</Text>
                            </View>
                            <Text style={styles.infoDesc}>당신의 소중한 기억을 긷어 올렸습니다.</Text>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFCF5' },
    header: { paddingHorizontal: 25, paddingVertical: 15, backgroundColor: 'white' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    logoText: { fontFamily: 'Montserrat-Regular', fontSize: 28, color: '#F38A2C' },
    tagScroll: { flexDirection: 'row' },
    tagItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
    tagItemActive: { backgroundColor: '#FFF5EB', borderColor: '#F38A2C' },
    tagContent: { paddingLeft: 12, paddingVertical: 6, paddingRight: 4 },
    tagText: { fontSize: 14, color: '#888' },
    tagTextActive: { color: '#F38A2C', fontWeight: 'bold' },
    tagRemove: { paddingRight: 8 },
    gridScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    photoWrap: { marginBottom: 10, borderRadius: 15, overflow: 'hidden', position: 'relative' },
    photo: { width: IMAGE_SIZE, height: IMAGE_SIZE },
    selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }, // ✅ 선택 시 어두워지는 효과
    controlBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white' },
    inputArea: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 40, flexDirection: 'row', alignItems: 'center' },
    selectionActions: { flexDirection: 'row', marginRight: 10 },
    actionBtn: { width: 48, height: 48, backgroundColor: '#F9F9F9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
    searchBox: { flex: 1, height: 48, backgroundColor: '#F9F9F9', borderRadius: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
    searchBoxActive: { borderColor: '#F38A2C', borderWidth: 1 },
    customBucketIcon: { width: 24, height: 24, marginRight: 8 }, // ✅ 양동이 아이콘
    textInput: { flex: 1, fontSize: 16 },
    sendBtn: { width: 48, height: 48, backgroundColor: '#DDD', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    sendBtnActive: { backgroundColor: '#F38A2C' },
    kakaoBtn: { width: 48, height: 48, backgroundColor: '#FEE500', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    fullViewContainer: { flex: 1, backgroundColor: 'black' },
    closeFullView: { position: 'absolute', top: 20, right: 25, zIndex: 10 },
    fullImageWrap: { flex: 1, justifyContent: 'center' },
    fullImage: { width: '100%', height: '70%' },
    photoInfoSection: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
    infoHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 5, alignSelf: 'center', marginBottom: 20 },
    infoDate: { fontFamily: 'Pretendard-Bold', fontSize: 18, color: '#333', marginBottom: 10 },
    keywordList: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    keywordTag: { fontFamily: 'Pretendard-Bold', fontSize: 16, color: '#F38A2C' },
    infoDesc: { fontFamily: 'Pretendard-Regular', fontSize: 15, color: '#666', lineHeight: 22 }
});