import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Share, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Check } from 'lucide-react-native';

// ✅ [연결] 명근님이 만든 DB 함수와 타입으로 교체
import { getFavoritePhotos } from '../src/db/database'; 
import { Photo } from '../src/lib/types/photo';

const { width } = Dimensions.get('window');

// ✅ 3열 규격 최종 보정 (ITEM_SIZE를 미세하게 더 차감하여 3줄 정렬 강제)
const COLUMN = 3;
const ITEM_SIZE = (width - 48) / COLUMN - 6;

export default function AddPhotoUIPage() {
    const router = useRouter();
    const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]); //bjy
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true); //bjy

    useEffect(() => { loadPhotos(); }, []);

    const loadPhotos = async () => {
        setIsLoading(true); //bjy
        try {
            // 🔴 [수정] database.ts의 getFavoritePhotos 함수 사용
            // 명근님이 만든 이 함수가 '즐겨찾기' 앨범에 담긴 사진만 쏙쏙 뽑아다 줄 거예요.
            const photosFromDB = await getFavoritePhotos(); 
            setSavedPhotos(photosFromDB);
        } catch (error) {
            console.error("보관함 로딩 에러:", error);
            Alert.alert("오류", "보관함 사진을 불러올 수 없습니다.");
        } finally {
            setIsLoading(false); //bjy
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const onShareSelected = async () => {
        if (selectedIds.length === 0) return Alert.alert("알림", "공유할 사진을 선택해주세요.");
        try {
            // 선택된 사진들의 URI만 추출 bjy
            const selectedUris = savedPhotos
                .filter(p => selectedIds.includes(p.id))
                .map(p => p.local_uri);

            await Share.share({
                message: `[GIDDA] 보관함에서 선택한 ${selectedIds.length}장의 사진입니다.`,
            });
        } catch (error) { Alert.alert("공유 실패", "기능을 실행할 수 없습니다."); }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- 1. 헤더 --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color="#F38A2C" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>저장된 사진</Text>
                <TouchableOpacity onPress={onShareSelected}>
                    <Share2 color="#F38A2C" size={24} />
                </TouchableOpacity>
            </View>

            {/* --- 2. 3열 사진 그리드 --- */}
            <ScrollView contentContainerStyle={styles.gridContainer}>
                <View style={styles.photoGrid}>
                    {savedPhotos.map((photo) => {
                        const isSelected = selectedIds.includes(photo.id);
                        // 🔴 ai_tags가 JSON 문자열로 저장되어 있으므로 파싱 처리 bjy
                        const tagList = photo.ai_tags ? JSON.parse(photo.ai_tags) : [];

                        return (
                            <TouchableOpacity
                                key={photo.id}
                                style={styles.photoItem}
                                onPress={() => toggleSelect(photo.id)}
                                activeOpacity={0.8}
                            >
                                <Image source={{ uri: photo.local_uri }} style={styles.image} contentFit="cover" />
                                
                                {/* 선택 시 오렌지 오버레이 */}
                                {isSelected && <View style={styles.selectedOverlay} />}
                                
                                {/* 체크 표시 동그라미 */}
                                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                                    {isSelected && <Check color="white" size={10} strokeWidth={4} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
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
        paddingVertical: 20
    },
    headerTitle: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 22,
        color: '#333'
    },
    gridContainer: {
        paddingBottom: 40
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15, // 좌우 여백
        justifyContent: 'flex-start'
    },
    photoItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        margin: 5, // 사진 간 간격
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
    }
});