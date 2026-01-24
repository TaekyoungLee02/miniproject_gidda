import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function WelcomePage() {
    const router = useRouter();

    const handleStart = () => {
        // 여기서 프롬프트(메인) 페이지로 이동
        router.replace('/home');
    };

    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
            <StatusBar style="dark" />

            <View className="items-center mb-12">
                <Text className="text-6xl mb-4">🎉</Text>
                <Text className="text-3xl font-extrabold text-gray-900 text-center mb-2">
                    준비 완료!
                </Text>
                <Text className="text-gray-500 text-center text-lg leading-7">
                    성공적으로 사진을 분석했습니다.{'\n'}
                    이제 GIDDA에게 추억을 물어보세요.
                </Text>
            </View>

            <TouchableOpacity
                onPress={handleStart}
                className="w-full bg-brand-orange py-4 rounded-2xl items-center shadow-md active:opacity-90"
            >
                <Text className="text-white text-lg font-bold">
                    대화 시작하기
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}