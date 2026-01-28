import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Share, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Sparkles, Check } from 'lucide-react-native';

// ✅ [연결] 명근님 DB 함수 및 타입 복구 bjy
import { getPhotosByAlbum } from '../src/db/database';
import { Photo } from '../src/lib/types/photo';

const { width } = Dimensions.get('window');
// ✅ 가로 3열 규격을 위한 보수적 계산 (패딩 48 제외 후 미세 여백 추가 차감)
const COLUMN = 3;
const ITEM_SIZE = (width - 48) / COLUMN - 5;

export default function AlbumDetailUIPage() {
    const router = useRouter();
    // ✅ 이전 화면에서 넘겨준 파라미터 받기 (albumId, title)
    const { title, albumId } = useLocalSearchParams();

    const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (albumId) {
            loadAlbumPhotos();
        }
    }, [albumId]);

    // 📥 1. DB에서 해당 앨범에 속한 사진 가져오기 (Done 버전 로직) bjy
    const loadAlbumPhotos = async () => {
        setIsLoading(true);
        try {
            // albumId 타입 체크 및 변환
            const id = Array.isArray(albumId) ? parseInt(albumId[0]) : parseInt(albumId as string);
            const photos = await getPhotosByAlbum(id);
            setAlbumPhotos(photos);
        } catch (error) {
            console.error("앨범 사진 로드 에러:", error);
            Alert.alert("오류", "사진을 불러오는 중 문제가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 🔄 2. 사진 선택 토글
    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // 📤 3. 선택된 사진 공유 (시스템 공유창 활용)
    const onShareSelected = async () => {
        if (selectedIds.length === 0) {
            return Alert.alert("알림", "공유할 사진을 먼저 선택해주세요.");
        }
        try {
            await Share.share({
                message: `[GIDDA] '${title || "AI 앨범"}'에서 선택한 ${selectedIds.length}장의 추억입니다.`,
            });
        } catch (error) {
            Alert.alert("공유 실패", "기능을 실행할 수 없습니다.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- 1. 헤더 영역 --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color="#F38A2C" size={28} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Sparkles size={18} color="#F38A2C" fill="#F38A2C" />
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {title || "앨범 상세"}
                    </Text>
                </View>
                <TouchableOpacity onPress={onShareSelected}>
                    <Share2 color="#F38A2C" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.gridContainer}>
                {/* --- 2. 상단 인포 박스 (AI 분석 강조) --- */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>AI가 분석한 이 앨범의 테마는</Text>
                    <Text style={styles.themeText}>"{title}" 입니다.</Text>
                </View>

                {/* --- 3. 3열 사진 그리드 --- */}
                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#F38A2C" />
                        <Text style={styles.loadingText}>사진을 불러오고 있어요...</Text>
                    </View>
                ) : (
                    <View style={styles.photoGrid}>
                        {albumPhotos.length > 0 ? (
                            albumPhotos.map((photo) => {
                                const isSelected = selectedIds.includes(photo.id);
                                return (
                                    <TouchableOpacity
                                        key={photo.id}
                                        style={styles.photoItem}
                                        activeOpacity={0.8}
                                        onPress={() => toggleSelect(photo.id)}
                                    >
                                        <Image
                                            source={{ uri: photo.uri }}
                                            style={styles.image}
                                            contentFit="cover"
                                        />
                                        {/* 선택 시 오렌지 오버레이 및 체크 표시 */}
                                        {isSelected && <View style={styles.selectedOverlay} />}
                                        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                                            {isSelected && <Check color="white" size={10} strokeWidth={4} />}
                                        </View>
                                    </TouchableOpacity>
                                )
                            })
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>분석된 사진을 가져오는 중입니다...</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFCF5'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingVertical: 15
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: width * 0.6
    },
    headerTitle: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 22,
        color: '#333'
    },
    gridContainer: {
        paddingBottom: 40
    },
    infoBox: {
        paddingVertical: 30,
        alignItems: 'center'
    },
    infoText: {
        fontFamily: 'Pretendard-Regular',
        fontSize: 14,
        color: '#999'
    },
    themeText: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 20,
        color: '#F38A2C',
        marginTop: 6
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        justifyContent: 'flex-start'
    },
    photoItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        margin: 5,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#EEE'
    },
    image: {
        width: '100%',
        height: '100%'
    },
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(243, 138, 44, 0.3)'
    },
    checkCircle: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: 'white',
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    checkCircleSelected: {
        backgroundColor: '#F38A2C',
        borderColor: '#F38A2C'
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50,
        width: width - 30
    },
    emptyText: {
        color: '#BBB',
        fontFamily: 'Pretendard-Regular'
    }
});