import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Send } from 'lucide-react-native';

export default function AskPhotoPage() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const photoUris = params.uris ? JSON.parse(params.uris as string) : [];

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([{ id: 1, text: "선택하신 사진들에 대해 무엇이든 물어보세요! 🧐", isAi: true }]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()}><ArrowLeft color="black" size={24} /></TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 15 }}>AI에게 질문하기</Text>
            </View>
            <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#F9F9F9' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {photoUris.map((uri: string, i: number) => (
                        <Image key={i} source={{ uri }} style={{ width: 150, height: 150, borderRadius: 10, marginRight: 10 }} />
                    ))}
                </ScrollView>
                {messages.map(msg => (
                    <View key={msg.id} style={{ alignSelf: msg.isAi ? 'flex-start' : 'flex-end', backgroundColor: msg.isAi ? 'white' : '#F38A2C', padding: 15, borderRadius: 15, marginBottom: 10 }}>
                        <Text style={{ color: msg.isAi ? 'black' : 'white' }}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>
            <View style={{ padding: 20, flexDirection: 'row' }}>
                <TextInput style={{ flex: 1, backgroundColor: '#EEE', borderRadius: 25, paddingHorizontal: 20 }} placeholder="질문을 입력하세요..." value={input} onChangeText={setInput} />
                <TouchableOpacity style={{ marginLeft: 10, backgroundColor: '#F38A2C', padding: 15, borderRadius: 25 }}><Send color="white" size={20} /></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}