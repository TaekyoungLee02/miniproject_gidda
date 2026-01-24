import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, Animated, TextInput, KeyboardAvoidingView, Platform, Keyboard, Modal, TouchableWithoutFeedback, Easing
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Menu, Search, X, Check, ArrowUp, Play, Sparkles, MessageCircle, Save, FolderPlus, Bot } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 48) / COLUMN_COUNT;

export default function SavePage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialPrompt = params.prompt as string || "";

    // --- 상태 관리 ---
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [currentFilterIndex, setCurrentFilterIndex] = useState<number | null>(null);

    const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [allPhotos, setAllPhotos] = useState<MediaLibrary.Asset[]>([]);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<MediaLibrary.Asset[]>([]);

    const [inputText, setInputText] = useState("");
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);

    // UI 상태
    const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);
    const [isAlbumModalVisible, setIsAlbumModalVisible] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");

    // 애니메이션 값
    const slideUpAnim = useRef(new Animated.Value(300)).current;
    const menuFadeAnim = useRef(new Animated.Value(0)).current;
    const flyAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const flyOpacity = useRef(new Animated.Value(0)).current;
    const saveIconScaleAnim = useRef(new Animated.Value(1)).current;
    const albumIconScaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadPhotos();
    }, []);

    // 🛠️ [수정됨] 초기 로딩 및 필터링 로직 개선
    const loadPhotos = async () => {
        // 1. 사진 가져오기
        const assets = await MediaLibrary.getAssetsAsync({ first: 50, sortBy: ['creationTime'] });
        setAllPhotos(assets.assets); // 전체 데이터 저장 (비동기라 즉시 반영 안됨)

        // 2. 태그 복원
        let currentTags: string[] = [];
        if (params.tags) {
            try {
                currentTags = JSON.parse(params.tags as string);
            } catch (e) {
                currentTags = [initialPrompt];
            }
        } else if (initialPrompt && initialPrompt !== "검색 결과") {
            currentTags = [initialPrompt];
        }

        setActiveTags(currentTags);

        // 3. 필터링 적용 (allPhotos가 아니라 방금 가져온 assets.assets를 직접 사용)
        if (currentTags.length > 0) {
            // 가장 최신(마지막) 태그를 선택한 상태로 만듦
            const lastIndex = currentTags.length - 1;
            const lastTag = currentTags[lastIndex];

            setCurrentFilterIndex(lastIndex); // UI 하이라이트

            // 시뮬레이션 필터링 로직 (handleTagPress와 동일한 로직 적용)
            const seed = lastTag.length + lastIndex;
            const filtered = assets.assets.filter((_, i) => (i + seed) % 2 === 0 || (i + seed) % 3 === 0);

            setPhotos(filtered); // 결과 표시
        } else {
            setPhotos(assets.assets); // 태그 없으면 전체 표시
        }
    };

    const handleNewSearch = (text: string) => {
        if (!text.trim()) return;
        const nextTags = [...activeTags, text];

        router.push({
            pathname: '/searching',
            params: {
                prompt: text,
                tags: JSON.stringify(nextTags)
            }
        });

        setInputText("");
        Keyboard.dismiss();
    };

    const handleTagPress = (tag: string, index: number) => {
        setCurrentFilterIndex(index);
        setInputText("");

        // 여기서는 이미 allPhotos가 로딩되어 있으므로 allPhotos를 써도 안전함
        const seed = tag.length + index;
        const filtered = allPhotos.filter((_, i) => (i + seed) % 2 === 0 || (i + seed) % 3 === 0);

        setPhotos(filtered);
    };

    const removeTag = (index: number) => {
        const newTags = activeTags.filter((_, i) => i !== index);
        setActiveTags(newTags);

        if (index === currentFilterIndex) {
            setCurrentFilterIndex(null);
            setPhotos(allPhotos);
        } else if (currentFilterIndex !== null && index < currentFilterIndex) {
            setCurrentFilterIndex(currentFilterIndex - 1);
        }
    };

    const toggleSelection = (photo: MediaLibrary.Asset) => {
        const isSelected = selectedPhotos.find(p => p.id === photo.id);
        let newSelection = [];
        if (isSelected) newSelection = selectedPhotos.filter(p => p.id !== photo.id);
        else newSelection = [...selectedPhotos, photo];

        setSelectedPhotos(newSelection);
        setIsSelectionMode(newSelection.length > 0);
    };

    const toggleFloatingMenu = () => {
        const toValue = isFloatingMenuOpen ? 0 : 1;
        Animated.timing(menuFadeAnim, { toValue, duration: 200, useNativeDriver: true }).start();
        setIsFloatingMenuOpen(!isFloatingMenuOpen);
    };

    const runFlyAnimation = (target: 'save' | 'album') => {
        if (!isFloatingMenuOpen) toggleFloatingMenu();
        flyAnim.setValue({ x: width / 2 - 40, y: height - 150 });
        flyOpacity.setValue(1);
        const targetY = target === 'save' ? 80 : 160;
        const targetIconAnim = target === 'save' ? saveIconScaleAnim : albumIconScaleAnim;

        Animated.parallel([
            Animated.timing(flyAnim, { toValue: { x: 30, y: targetY }, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(flyOpacity, { toValue: 0, duration: 800, useNativeDriver: true })
        ]).start(() => {
            Animated.sequence([
                Animated.timing(targetIconAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
                Animated.timing(targetIconAnim, { toValue: 1.0, duration: 150, useNativeDriver: true })
            ]).start(() => {
                const msg = target === 'save' ? "저장 내역에 보관되었습니다." : `'${newAlbumName}' 앨범이 생성되었습니다.`;
                Alert.alert("완료", msg);
                setIsSelectionMode(false); setSelectedPhotos([]); if (target === 'album') setIsAlbumModalVisible(false); setNewAlbumName(""); setTimeout(() => toggleFloatingMenu(), 500);
            });
        });
    };

    const handleSavePhotos = () => { if (selectedPhotos.length === 0) return; runFlyAnimation('save'); };
    const handleCreateAlbum = () => { if (!newAlbumName.trim()) { Alert.alert("알림", "앨범 이름을 입력해주세요."); return; } setIsAlbumModalVisible(false); setTimeout(() => runFlyAnimation('album'), 200); };

    const handleGoToChatbot = () => {
        const targetUris = selectedPhotos.length > 0 ? selectedPhotos.map(p => p.uri) : [photos[0]?.uri];
        router.push({ pathname: '/ask-photo', params: { uris: JSON.stringify(targetUris) } });
    };

    const handleQuickAsk = () => {
        if (!inputText.trim()) return;
        Keyboard.dismiss();
        setAiAnswer("분석 중...");
        Animated.timing(slideUpAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        setTimeout(() => {
            const answer = selectedPhotos.length > 0 ? `선택하신 ${selectedPhotos.length}장의 사진은 표정이 아주 밝네요! 😊` : `"${inputText}"에 대해 찾아보니, 이건 말티즈 강아지네요!`;
            setAiAnswer(answer);
        }, 1000);
        setInputText("");
    };
    const closeAiCard = () => { Animated.timing(slideUpAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => { setAiAnswer(null); }); };

    return (
        <SafeAreaView className="flex-1 bg-white relative">
            <StatusBar style="dark" />

            {/* --- 상단 헤더 --- */}
            <View className="px-6 pt-2 pb-4 bg-white border-b border-gray-100 z-20 relative">
                <View className="flex-row justify-between items-center mb-4">
                    <TouchableOpacity onPress={toggleFloatingMenu} className="p-1 -ml-1">
                        <Menu color="black" size={28} />
                    </TouchableOpacity>

                    <Text className="text-orange-500 text-2xl font-bold tracking-tighter">GIDDA</Text>

                    <TouchableOpacity onPress={handleGoToChatbot} className="p-1 -mr-1">
                        <Bot color="black" size={28} />
                    </TouchableOpacity>
                </View>

                {/* 🏷️ 태그 리스트 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {activeTags.length === 0 ? (
                        <Text className="text-gray-400 py-1">검색어를 입력하여 사진을 찾아보세요</Text>
                    ) : (
                        activeTags.map((tag, index) => {
                            const isActive = currentFilterIndex === index;
                            return (
                                <View
                                    key={index}
                                    className={`rounded-full flex-row items-center border mr-2 overflow-hidden ${isActive ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}
                                >
                                    <TouchableOpacity onPress={() => handleTagPress(tag, index)} className="pl-3 py-1 pr-1 max-w-[120px]">
                                        <Text className={`font-medium ${isActive ? 'text-orange-600' : 'text-gray-600'}`} numberOfLines={1} ellipsizeMode="tail">#{tag}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeTag(index)} className="pr-2 py-1 pl-1">
                                        <X size={14} color={isActive ? "#EA580C" : "#999"} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* 사이드바 메뉴 */}
                <Animated.View style={{ position: 'absolute', top: 60, left: 20, opacity: menuFadeAnim, zIndex: 50, display: isFloatingMenuOpen ? 'flex' : 'none' }} className="space-y-6">
                    <Animated.View style={{ transform: [{ scale: saveIconScaleAnim }] }}>
                        <TouchableOpacity className="items-center justify-center shadow-xl active:scale-95">
                            <View className="bg-orange-500 w-14 h-14 rounded-full items-center justify-center border-2 border-white"><Play fill="white" color="white" size={24} style={{ transform: [{ rotate: '-90deg' }], marginLeft: -2 }} /></View>
                            <Text className="text-orange-500 text-xs font-bold mt-1 shadow-sm bg-white/80 px-1 rounded">저장 내역</Text>
                        </TouchableOpacity>
                    </Animated.View>
                    <Animated.View style={{ transform: [{ scale: albumIconScaleAnim }] }}>
                        <TouchableOpacity className="items-center justify-center shadow-xl active:scale-95">
                            <View className="bg-white w-14 h-14 rounded-full items-center justify-center border-2 border-orange-200"><Play fill="#FB923C" color="#FB923C" size={24} style={{ transform: [{ rotate: '90deg' }], marginLeft: 4 }} /></View>
                            <Text className="text-gray-500 text-xs font-bold mt-1 shadow-sm bg-white/80 px-1 rounded">앨범 목록</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </View>

            {/* 배경 오버레이 */}
            {isFloatingMenuOpen && <TouchableWithoutFeedback onPress={toggleFloatingMenu}><View className="absolute inset-0 z-10 bg-black/5" /></TouchableWithoutFeedback>}

            {/* --- 사진 그리드 --- */}
            <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="flex-row flex-wrap justify-between">
                    {photos.map((photo) => {
                        const isSelected = selectedPhotos.find(p => p.id === photo.id);
                        return (
                            <TouchableOpacity key={photo.id} activeOpacity={0.7} className="mb-2 rounded-xl overflow-hidden relative" onPress={() => toggleSelection(photo)}>
                                <Image source={{ uri: photo.uri }} style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }} contentFit="cover" />
                                {isSelectionMode && (
                                    <View className={`absolute inset-0 items-center justify-center ${isSelected ? 'bg-black/40 border-4 border-orange-500' : 'bg-white/20'}`}>{isSelected && <Check color="white" size={32} strokeWidth={4} />}</View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    {photos.length === 0 && (
                        <View className="w-full items-center mt-10">
                            <Text className="text-gray-400">검색 결과가 없습니다.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* --- 하단 컨트롤 바 --- */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} className="absolute bottom-0 w-full bg-white border-t border-gray-200 shadow-2xl z-40">
                <View className="px-4 pt-4 pb-10 flex-row items-center gap-2">
                    {isSelectionMode ? (
                        <View className="flex-row gap-2">
                            <TouchableOpacity onPress={handleSavePhotos} className="bg-gray-100 w-12 h-12 rounded-xl items-center justify-center border border-gray-300"><Save color="#555" size={24} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsAlbumModalVisible(true)} className="bg-gray-100 w-12 h-12 rounded-xl items-center justify-center border border-gray-300"><FolderPlus color="#555" size={24} /></TouchableOpacity>
                        </View>
                    ) : null}

                    <View className={`flex-1 bg-gray-100 h-12 rounded-full flex-row items-center px-4 border ${isSelectionMode ? 'border-orange-200' : 'border-gray-200'}`}>
                        {isSelectionMode ? null : <Search color="#999" size={20} />}
                        <TextInput
                            className="flex-1 ml-2 text-base text-gray-800"
                            placeholder={isSelectionMode ? "선택한 사진 질문..." : "검색어 입력"}
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={isSelectionMode ? handleQuickAsk : () => handleNewSearch(inputText)}
                            returnKeyType={isSelectionMode ? "done" : "search"}
                        />
                    </View>

                    <TouchableOpacity onPress={isSelectionMode ? handleQuickAsk : () => handleNewSearch(inputText)} disabled={!inputText} className={`w-12 h-12 rounded-full items-center justify-center ${inputText ? 'bg-orange-500' : 'bg-gray-300'}`}>
                        {isSelectionMode ? <ArrowUp color="white" size={24} /> : <Search color="white" size={24} />}
                    </TouchableOpacity>

                    <TouchableOpacity className="bg-[#FEE500] w-12 h-12 rounded-full items-center justify-center" onPress={() => Alert.alert("공유", "카카오톡 전송")}><MessageCircle fill="black" size={24} color="black" /></TouchableOpacity>
                </View>

                {/* AI 답변 카드 */}
                {aiAnswer && (
                    <Animated.View style={{ transform: [{ translateY: slideUpAnim }] }} className="absolute bottom-full mb-4 left-4 right-4 bg-gray-900 p-5 rounded-2xl shadow-xl z-50">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-row items-center mb-2"><Sparkles color="#FEE500" size={16} style={{ marginRight: 6 }} /><Text className="text-white font-bold text-lg">AI 분석</Text></View>
                            <TouchableOpacity onPress={closeAiCard}><X color="white" size={20} /></TouchableOpacity>
                        </View>
                        <Text className="text-gray-200 leading-6">{aiAnswer}</Text>
                    </Animated.View>
                )}
            </KeyboardAvoidingView>

            {/* --- 앨범 생성 모달 --- */}
            <Modal visible={isAlbumModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsAlbumModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center bg-black/50 px-6">
                    <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
                        <Text className="text-xl font-bold mb-2">새 앨범 만들기</Text>
                        <Text className="text-gray-500 mb-6 text-center">선택한 {selectedPhotos.length}장의 사진을 담을{'\n'}앨범 이름을 입력해주세요.</Text>
                        <View className="w-full bg-gray-100 rounded-xl px-4 py-3 mb-6 border border-gray-200"><TextInput className="text-lg text-center" placeholder="예) 우리집 댕댕이" value={newAlbumName} onChangeText={setNewAlbumName} autoFocus={true} /></View>
                        <View className="flex-row gap-3 w-full">
                            <TouchableOpacity onPress={() => setIsAlbumModalVisible(false)} className="flex-1 py-4 bg-gray-200 rounded-xl items-center"><Text className="font-bold text-gray-600">취소</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateAlbum} className="flex-1 py-4 bg-orange-500 rounded-xl items-center"><Text className="font-bold text-white">생성</Text></TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- 애니메이션 요소 --- */}
            <Animated.View style={{ position: 'absolute', zIndex: 100, pointerEvents: 'none', transform: [{ translateX: flyAnim.x }, { translateY: flyAnim.y }, { scale: flyOpacity }], opacity: flyOpacity }}>
                <View className="items-center justify-center rotate-12 shadow-2xl"><Image source={{ uri: selectedPhotos[0]?.uri }} style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 4, borderColor: 'white' }} contentFit="cover" /></View>
            </Animated.View>

        </SafeAreaView>
    );
}