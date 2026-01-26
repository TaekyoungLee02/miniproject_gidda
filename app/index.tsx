import React, { useState, useEffect } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, Redirect } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { PrimaryButton } from '../src/components/common/PrimaryButton';
import * as MediaLibrary from 'expo-media-library';

// 데모 시나리오 데이터
const DEMO_SCENARIOS = [
  { id: 1, text: '"반고흐 미술관에서 찍은 사진 찾아줘"', src: 'https://picsum.photos/id/1011/400/500' },
  { id: 2, text: '"작년 겨울 맛있는 방어회 사진"', src: 'https://picsum.photos/id/429/400/500' },
  { id: 3, text: '"우리집 강아지 뽀삐 웃는 거 보여줘"', src: 'https://picsum.photos/id/1025/400/500' },
];

// 🔺 세모 조각 컴포넌트
const Triangle = ({ color, rotate }: { color: string, rotate: string }) => (
  <View
    style={{
      width: 0, height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 15, borderRightWidth: 15, borderBottomWidth: 30,
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
      transform: [{ rotate: rotate }],
    }}
  />
);

export default function StartPage() {
  return <Redirect href="/clip" />
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(false); // 팝업 상태 관리

  // 로고 애니메이션
  const float = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DEMO_SCENARIOS.length);
    }, 3500);

    float.value = withRepeat(withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.quad) }), -1, true);

    return () => clearInterval(timer);
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const currentScenario = DEMO_SCENARIOS[currentIndex];

  // 1. Enter 버튼 클릭 시 -> 팝업 띄우기 (바로 이동 X)
  const handleEnterPress = () => {
    setShowPermissionModal(true);
  };

  // 2. 팝업에서 '허용' 클릭 시 -> 권한 받고 이동
  const handleAllow = async () => {
    // 웹이 아닐 때만 실제 권한 요청 (웹은 그냥 통과) - Quick player로 테스트중
    if (Platform.OS !== 'web') {
      await MediaLibrary.requestPermissionsAsync();
    }
    setShowPermissionModal(false);
    router.replace('/indexing');
  };

  return (
    <View className="flex-1 bg-brand-cream justify-between items-center py-20 px-6 relative">
      <StatusBar style="dark" />

      {/* --- 메인 화면 내용 --- */}
      <View className="items-center mt-10 w-full">
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }, animatedLogoStyle]}>
          <Triangle color="#FF8C42" rotate="-90deg" />
          <Text className="text-brand-orange font-bold text-6xl tracking-tighter">GIDDA</Text>
          <Triangle color="#FF8C42" rotate="180deg" />
        </Animated.View>
        <View className="flex-row items-center justify-center w-full px-4">
          <View className="h-8 w-[1px] bg-gray-300 mr-4" />
          <Text className="text-brand-dark text-sm font-medium text-center opacity-80">
            AI가 찾아주는 당신의 잊고 있던 기억
          </Text>
          <View className="h-8 w-[1px] bg-gray-300 ml-4" />
        </View>
      </View>

      <View className="items-center justify-center w-full h-96">
        <Animated.View
          key={currentScenario.id}
          entering={FadeIn.duration(600)}
          exiting={FadeOut.duration(600)}
          className="items-center w-full"
        >
          <View className="bg-white p-2 rounded-lg shadow-lg border border-gray-100 mb-6 rotate-1">
            <Image
              source={{ uri: currentScenario.src }}
              className="w-56 h-72 rounded bg-gray-200"
              resizeMode="cover"
            />
          </View>
          <View className="bg-white border border-brand-orange/30 rounded-full px-6 py-3 w-full shadow-sm">
            <Text className="text-brand-dark text-base font-medium text-center">
              {currentScenario.text}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View className="mb-4 w-full px-10">
        <PrimaryButton title="Enter" onPress={handleEnterPress} />
      </View>


      {/* --- 3. 커스텀 권한 팝업 (Modal) --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPermissionModal}
        onRequestClose={() => setShowPermissionModal(false)}
      >
        {/* 배경 흐림 효과 (반투명 검정) */}
        <View className="flex-1 bg-black/50 justify-center items-center px-10">

          {/* 알림창 본문 (iOS 스타일) */}
          <View className="bg-white/95 w-full rounded-2xl overflow-hidden shadow-2xl">

            {/* 텍스트 영역 */}
            <View className="items-center pt-8 pb-6 px-4">
              <Text className="text-lg font-bold text-black mb-2 text-center">
                'GIDDA'이(가) 사용자의 사진에{"\n"}접근하려고 합니다.
              </Text>
              <Text className="text-sm text-gray-500 text-center leading-5">
                AI가 앨범을 분석하여{"\n"}추억을 찾아드리기 위해 권한이 필요합니다.
              </Text>
            </View>

            {/* 버튼 영역 (가로줄, 세로줄 포함) */}
            <View className="border-t border-gray-300 flex-row h-12">
              {/* 거절 버튼 */}
              <TouchableOpacity
                onPress={() => setShowPermissionModal(false)}
                className="flex-1 items-center justify-center border-r border-gray-300 active:bg-gray-100"
              >
                <Text className="text-blue-500 text-lg">허용 안 함</Text>
              </TouchableOpacity>

              {/* 허용 버튼 */}
              <TouchableOpacity
                onPress={handleAllow}
                className="flex-1 items-center justify-center active:bg-gray-100"
              >
                <Text className="text-blue-600 font-bold text-lg">허용</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}