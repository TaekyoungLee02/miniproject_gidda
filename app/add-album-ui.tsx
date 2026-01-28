import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Folder, Play, Plus, Sparkles, X } from 'lucide-react-native';

// ✅ [연결] 백엔드 DB 함수 및 인터페이스 통합
import { getAlbums, createAlbum, AlbumSummary, getAllPhotos } from '../src/db/database';
// ✅ [연결] AI 제목 생성 서비스 통합
import { generateAlbumTitles } from '../src/api/AzureService';

const { width } = Dimensions.get('window');

export default function AddAlbumUIPage() {
    const router = useRouter();

    // 상태 관리 (Done 버전의 핵심 로직)
    const [albums, setAlbums] = useState<AlbumSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 새 앨범 생성 모달 관련 상태
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newAlbumTitle, setNewAlbumTitle] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadAlbumData();
    }, []);

    // 1. DB에서 실제 앨범 목록 로드
    const loadAlbumData = async () => {
        setIsLoading(true);
        try {
            const data = await getAlbums();
            setAlbums(data);
        } catch (error) {
            console.error("앨범 로딩 에러:", error);
            Alert.alert("오류", "앨범 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // ✨ 2. AI 제목 추천 로직 (Azure 연동)
    const handleAiRecommend = async () => {
        setIsGenerating(true);
        try {
            const allPhotos = await getAllPhotos();
            const hints = allPhotos.slice(0, 10).map(p => `[${p.address || ''}] ${p.ai_tags || ''}`).join(', ');

            if (!hints) {
                return Alert.alert("알림", "분석할 사진 데이터가 부족해요!");
            }

            const titles = await generateAlbumTitles(hints);

            Alert.alert(
                "✨ AI 감성 추천",
                "이런 제목들은 어떠세요?",
                titles.map(t => ({
                    text: t,
                    onPress: () => setNewAlbumTitle(t)
                })).concat([{ text: "취소", style: "cancel" }])
            );
        } catch (error) {
            Alert.alert("오류", "AI가 제목을 짓는 데 실패했어요.");
        } finally {
            setIsGenerating(false);
        }
    };

    // 💾 3. DB에 앨범 저장
    const handleSaveAlbum = async () => {
        if (!newAlbumTitle.trim()) return Alert.alert("알림", "제목을 입력해주세요.");

        try {
            const resultId = await createAlbum(newAlbumTitle);
            if (resultId) {
                setIsModalVisible(false);
                setNewAlbumTitle("");
                loadAlbumData(); // 목록 새로고침
                Alert.alert("완료", "새로운 추억 저장소가 생겼어요! 🎉");
            }
        } catch (error) {
            Alert.alert("오류", "앨범 생성에 실패했습니다.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- 헤더 (AddPhotoUI와 규격 통일) --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color="#F38A2C" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>내 앨범</Text>
                <View style={{ width: 28 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#F38A2C" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {albums.map((album) => (
                        <TouchableOpacity
                            key={album.id}
                            style={styles.albumCard}
                            activeOpacity={0.8}
                            onPress={() => router.push({
                                pathname: '/album-detail-ui',
                                params: { title: album.title, albumId: album.id.toString() }
                            })}
                        >
                            {/* ✅ 앨범 썸네일 (아이콘 대신 실제 사진 배치) */}
                            <View style={styles.albumThumbBox}>
                                {album.cover_uri ? (
                                    <Image source={{ uri: album.cover_uri }} style={styles.thumbImage} contentFit="cover" transition={200} />
                                ) : (
                                    <View style={styles.fallbackIcon}><Folder color="white" size={24} /></View>
                                )}
                                <View style={styles.overlayTag}>
                                    <Folder color="white" size={12} fill="white" />
                                </View>
                            </View>

                            <View style={styles.albumInfo}>
                                <View>
                                    <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                                    <Text style={styles.albumSub}>{album.date} • {album.count}장</Text>
                                </View>
                                {/* Home 사이드바와 유사한 인디케이터 추가 */}
                                <Play color="#F38A2C" size={14} fill="#F38A2C" style={{ opacity: 0.6 }} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFCF5' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 20
    },
    headerTitle: { fontFamily: 'Pretendard-Bold', fontSize: 22, color: '#333' },
    list: { paddingHorizontal: 20, paddingTop: 10 },
    albumCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 22,
        marginBottom: 16,
        alignItems: 'center',
        // Home 화면 입력창 스타일 계승
        shadowColor: "#F38A2C",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4
    },
    albumThumbBox: {
        width: 75,
        height: 75,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#F38A2C',
        position: 'relative'
    },
    thumbImage: { width: '100%', height: '100%' },
    fallbackIcon: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    overlayTag: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 4,
        borderRadius: 6
    },
    albumInfo: {
        flex: 1,
        marginLeft: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 10
    },
    albumTitle: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 18,
        color: '#333',
        marginBottom: 5
    },
    albumSub: {
        fontFamily: 'Pretendard-Regular',
        fontSize: 14,
        color: '#999'
    }
}); 
