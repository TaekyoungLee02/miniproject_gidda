import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Folder, Play } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');

export default function AddAlbumUIPage() {
    const router = useRouter();
    const [albums, setAlbums] = useState<any[]>([]);

    useEffect(() => {
        loadAlbumData();
    }, []);

    const loadAlbumData = async () => {
        // 실제 운영 시 DB의 생성된 앨범 목록을 가져와야 함
        // 현재는 UI 확인을 위해 기기 내 앨범 썸네일을 매칭한 더미 데이터를 사용합니다.
        const { assets } = await MediaLibrary.getAssetsAsync({ first: 3 });

        const dummyData = [
            { id: '1', title: '강아지랑 산책', count: 12, date: '2026.01.24', thumb: assets[0]?.uri },
            { id: '2', title: '제주도 푸른 밤', count: 45, date: '2026.01.20', thumb: assets[1]?.uri },
            { id: '3', title: '맛있는 디저트', count: 8, date: '2026.01.15', thumb: assets[2]?.uri },
        ];
        setAlbums(dummyData);
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

            <ScrollView contentContainerStyle={styles.list}>
                {albums.map((album) => (
                    <TouchableOpacity
                        key={album.id}
                        style={styles.albumCard}
                        activeOpacity={0.8}
                        onPress={() => router.push({
                            pathname: '/album-detail-ui', // 👈 여기를 새로 만든 파일명으로!
                            params: { title: album.title, albumId: album.id }
                        })}
                    >
                        {/* ✅ 앨범 썸네일 (아이콘 대신 실제 사진 배치) */}
                        <View style={styles.albumThumbBox}>
                            {album.thumb ? (
                                <Image source={{ uri: album.thumb }} style={styles.thumbImage} contentFit="cover" />
                            ) : (
                                <View style={styles.fallbackIcon}><Folder color="white" size={24} /></View>
                            )}
                            <View style={styles.overlayTag}>
                                <Folder color="white" size={12} fill="white" />
                            </View>
                        </View>

                        <View style={styles.albumInfo}>
                            <View>
                                <Text style={styles.albumTitle}>{album.title}</Text>
                                <Text style={styles.albumSub}>{album.date} • {album.count}장</Text>
                            </View>
                            {/* Home 사이드바와 유사한 인디케이터 추가 */}
                            <Play color="#F38A2C" size={14} fill="#F38A2C" style={{ opacity: 0.6 }} />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
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