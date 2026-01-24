import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function IndexingPage() {
    const router = useRouter();

    useEffect(() => {
        // 3초 뒤에 완료 페이지로 넘어가는 척만 함
        setTimeout(() => {
            router.replace('/analysis-complete');
        }, 3000);
    }, []);

    return (
        <View className="flex-1 items-center justify-center bg-white">
            <Text className="text-2xl">사진 스캔 중... (Indexing)</Text>
        </View>
    );
}