// @ts-nocheck
// 👇 1. 여기에 'useEffect'를 추가했습니다!
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router'; 
import { useKeepAwake } from 'expo-keep-awake'; 
import { updatePhotoAddress } from '../src/services/database';
import { initDB, getAllPhotos } from '../src/services/database'; 
import { syncGalleryToDB } from '../src/services/syncService';
import { identifyLocationFromTags } from '../src/services/azure'; 

export default function Index() {
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('대기 중...');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false); 

  useKeepAwake();

  // 👇 2. 앱이 처음 켜질 때(Mount) '한 번만' 자동으로 동기화 실행
  useEffect(() => {
    runSync(); 
  }, []);

  // 화면이 다시 보일 때마다 리스트만 살짝 갱신 (동기화는 안 함)
  useFocusEffect(
    useCallback(() => {
      refreshList();
    }, [])
  );

  const runSync = async () => {
    if (loading) return;
    setLoading(true);
    setStatus('🚀 자동 실행 중... DB 초기화 및 스캔'); // 문구 살짝 변경

    try {
      await initDB();

      setStatus('📸 갤러리 스캔 중... (잠시만요)');
      const count = await syncGalleryToDB(); 
      
      setStatus(count > 0 ? `✅ 신규 ${count}장 저장 완료!` : '✨ 최신 상태입니다.');

      await refreshList();
      
    } catch (e) {
      console.error(e);
      setStatus('❌ 오류 발생: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshList = async () => {
    try {
      const data = await getAllPhotos();
      setPhotos(data);
    } catch (e) {
      console.error('리스트 갱신 실패:', e);
    }
  };

  const handleAiTest = async () => {
    if (photos.length === 0) {
      Alert.alert('알림', '분석할 사진이 없습니다. 먼저 동기화를 해주세요.');
      return;
    }
    
    const targetPhoto = photos[0];

    try {
      setAnalyzing(true);
      
      Alert.alert('🕵️‍♂️ 진행 중', '가짜 태그(화산, 돌담...)를 붙여서 Azure에 위치를 물어보는 중입니다...');
      const resultAddress = await identifyLocationFromTags(targetPhoto);
      
      await updatePhotoAddress(targetPhoto.id, resultAddress);

      await refreshList();
      
      Alert.alert('✅ 성공!', `DB 업데이트 완료!\n\n"${resultAddress}"`);
      
    } catch (e: any) {
      console.error(e);
      Alert.alert('오류', '실패: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Gid-da Gallery</Text>
        <Text style={styles.status}>{status}</Text>
        {loading && <ActivityIndicator size="small" color="#0000ff" />}
      </View>

      <View style={styles.btnContainer}>
        <View style={styles.btnRow}>
          {/* 자동 실행되지만, 수동으로 또 누르고 싶을 때를 위해 남겨둠 */}
          <Button title="🔄 갤러리 동기화" onPress={runSync} disabled={loading} />
          <Button title="📊 새로고침" color="purple" onPress={refreshList} />
        </View>
        <View style={{ marginTop: 10 }}>
          <Button 
            title={analyzing ? "추리 중..." : "🔍 (AI) 이 사진 어디게?"} 
            color="#E91E63" 
            onPress={handleAiTest} 
            disabled={analyzing || photos.length === 0}
          />
        </View>
      </View>

      <ScrollView style={styles.listArea}>
        {photos.length === 0 && !loading && (
            <Text style={styles.emptyText}>
                저장된 사진이 없습니다.{'\n'}
                잠시 후 자동으로 불러옵니다...
            </Text>
        )}
        
        {photos.map((p, i) => (
          <View key={i} style={styles.item}>
            <Image source={{uri: p.local_uri}} style={styles.img} />
            <View style={styles.info}>
                <Text style={styles.date}>📅 {new Date(p.captured_at).toLocaleDateString()}</Text>
                {/* 주소(Address)가 있으면 주소를 보여주고, 없으면 위도경도, 둘 다 없으면 에러 표시 */}
                {p.address ? (
                    <Text style={styles.addr}>📍 {p.address}</Text>
                ) : p.latitude ? (
                    <Text style={styles.noAddr}>🌐 {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}</Text>
                ) : (
                    <Text style={styles.noAddr}>⚠️ 위치정보 없음</Text>
                )}
                <Text style={styles.id} numberOfLines={1}>ID: {p.id}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5' },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  status: { fontSize: 14, color: '#666', marginBottom: 5 },
  btnContainer: { marginBottom: 20 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  listArea: { flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'gray', lineHeight: 24 },
  item: { flexDirection: 'row', marginBottom: 10, backgroundColor: 'white', padding: 10, borderRadius: 10, elevation: 2 },
  img: { width: 70, height: 70, borderRadius: 8, marginRight: 15, backgroundColor: '#eee' },
  info: { justifyContent: 'center', flex: 1 },
  date: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  addr: { fontSize: 14, color: '#E91E63', fontWeight: 'bold', marginTop: 3 }, // 주소는 눈에 띄게 핑크색
  noAddr: { fontSize: 12, color: '#aaa', marginTop: 3 },
  id: { fontSize: 10, color: '#ccc', marginTop: 3 }
});