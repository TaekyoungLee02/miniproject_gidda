import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Share2, Check } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');

// ✅ 3열 규격 최종 보정 (ITEM_SIZE를 미세하게 더 차감하여 3줄 정렬 강제)
const COLUMN = 3;
const ITEM_SIZE = (width - 48) / COLUMN - 6;

export default function AddPhotoUIPage() {
    const router = useRouter();
    const [savedPhotos, setSavedPhotos] = useState<MediaLibrary.Asset[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => { loadPhotos(); }, []);

    const loadPhotos = async () => {
        try {
            const { assets } = await MediaLibrary.getAssetsAsync({ first: 18, sortBy: ['creationTime'] });
            setSavedPhotos(assets);
        } catch (error) {
            console.error("사진 로딩 에러:", error);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const onShareSelected = async () => {
        if (selectedIds.length === 0) return Alert.alert("알림", "공유할 사진을 선택해주세요.");
        try {
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
                        return (
                            <TouchableOpacity
                                key={photo.id}
                                style={styles.photoItem}
                                onPress={() => toggleSelect(photo.id)}
                                activeOpacity={0.8}
                            >
                                <Image source={{ uri: photo.uri }} style={styles.image} contentFit="cover" />

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