import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FolderPlus, ArrowLeft } from 'lucide-react-native';

export default function AddAlbumPage() {
    const router = useRouter();
    const [text, setText] = useState('');

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFCF5' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}><ArrowLeft color="#F38A2C" size={24} /></TouchableOpacity>
            <View style={{ padding: 30 }}>
                <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 20, marginBottom: 20 }}>
                    <Text style={{ fontSize: 20, fontFamily: 'Pretendard-Bold', color: '#333' }}>어떤 앨범으로 만들까요?</Text>
                </View>
                <FolderPlus color="#F38A2C" size={40} />
            </View>
            <View style={{ position: 'absolute', bottom: 50, width: '100%', padding: 25 }}>
                <View style={{ flexDirection: 'row', backgroundColor: 'white', borderRadius: 15, padding: 10, alignItems: 'center' }}>
                    <TextInput style={{ flex: 1, padding: 10, fontFamily: 'Pretendard-Regular' }} placeholder="예) 제주도 가족 여행" value={text} onChangeText={setText} />
                    <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#F38A2C', padding: 15, borderRadius: 10 }}><Text style={{ color: 'white', fontWeight: 'bold' }}>생성</Text></TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}