import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, Platform, Pressable, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Asset } from 'expo-asset';
import * as MediaLibrary from 'expo-media-library';

// ✅ 삼각형처럼 사진들도 변수로 직접 선언 (이게 가장 확실한 방법입니다)
const LogoTriangleLeft = require('../assets/images/left-rectangle.png');
const LogoTriangleRight = require('../assets/images/right-rectangle.png');
const PicDog = require('../assets/images/pic-withdog.jpg');
const PicDoc = require('../assets/images/pic-doc.jpg');
const PicSwiss = require('../assets/images/pic-swiss-v2.jpg');
const PicInsta = require('../assets/images/pic-insta.jpg');

const DEMO_SCENARIOS = [
  { id: 1, text: '"강아지 안고있는 사진 찾아줘."', src: PicDog },
  { id: 2, text: '"청년 월세 지원 캡쳐본 플리즈."', src: PicDoc },
  { id: 3, text: '"스위스에서 찍은 사진 찾아줘~"', src: PicSwiss },
  { id: 4, text: '"인스타로 캡쳐한 맛집 정보 좀."', src: PicInsta },
];

export default function StartPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [initialReady, setInitialReady] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Record<number, boolean>>({});
  const loadedIdsRef = useRef<Record<number, boolean>>({});
  const loadingIdsRef = useRef<Set<number>>(new Set());
  const float = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;
    const markLoaded = (ids: number[]) => {
      setLoadedIds((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = true;
        });
        loadedIdsRef.current = next;
        return next;
      });
    };
    const preloadInitial = async () => {
      const first = DEMO_SCENARIOS[0];
      await Asset.loadAsync([LogoTriangleLeft, LogoTriangleRight, first.src]);
      if (!isMounted) return;
      markLoaded([first.id]);
      setInitialReady(true);

      const remaining = DEMO_SCENARIOS.slice(1);
      remaining.forEach((s) => loadingIdsRef.current.add(s.id));
      Asset.loadAsync(remaining.map((s) => s.src))
        .then(() => {
          if (isMounted) markLoaded(remaining.map((s) => s.id));
        })
        .finally(() => {
          remaining.forEach((s) => loadingIdsRef.current.delete(s.id));
        });
    };
    preloadInitial();

    float.value = withRepeat(withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      isMounted = false;
    };
  }, []);

  const loadScenarioById = async (id: number) => {
    if (loadedIdsRef.current[id] || loadingIdsRef.current.has(id)) return;
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    loadingIdsRef.current.add(id);
    try {
      await Asset.loadAsync([scenario.src]);
      setLoadedIds((prev) => {
        const next = { ...prev, [id]: true };
        loadedIdsRef.current = next;
        return next;
      });
    } finally {
      loadingIdsRef.current.delete(id);
    }
  };

  useEffect(() => {
    if (!initialReady) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % DEMO_SCENARIOS.length;
        const nextId = DEMO_SCENARIOS[next].id;
        if (loadedIdsRef.current[nextId]) return next;
        loadScenarioById(nextId);
        return prev;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [initialReady]);

  const animatedLogoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  const handleEnterPress = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      router.push('/indexing');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }} className="items-center px-6">
      <StatusBar style="dark" />

      {/* --- 1. 상단 로고 (mt-40으로 하향) --- */}
      <View className="items-center w-full mt-40">
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', position: 'relative' }, animatedLogoStyle]}>
          <Image source={LogoTriangleLeft} style={{ width: 40, height: 40, position: 'absolute', left: -50, top: -15 }} resizeMode="contain" />
          <Text style={{ fontFamily: 'Montserrat-Regular', fontSize: 56, color: '#F38A2C', letterSpacing: 2.8 }}>GIDDA</Text>
          <Image source={LogoTriangleRight} style={{ width: 40, height: 40, position: 'absolute', right: -50, bottom: -15 }} resizeMode="contain" />
        </Animated.View>
        <Text style={{ fontFamily: 'Pretendard-Bold', color: '#333' }} className="text-[13px] tracking-tight mt-11 opacity-70">
          수만 장의 사진 속에서, AI가 당신의 어제를 ‘긷다’.
        </Text>
      </View>

      {/* --- 2. 중앙 콘텐츠 (사진 크기 축소 및 간격 분리) --- */}
      <View className="items-center justify-center w-full mt-10">
        <Animated.View
          key={`scenario-${currentIndex}`}
          entering={FadeIn.duration(800)}
          exiting={FadeOut.duration(400)}
          className="items-center w-full"
        >
          <View style={{
            backgroundColor: 'white',
            padding: 10,
            paddingBottom: 35,
            borderRadius: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            transform: [{ rotate: '-2deg' }],
            borderWidth: 1,
            borderColor: '#f2f2f2'
          }}>
            {/* ✅ 배열 안의 변수를 직접 참조 */}
            {loadedIds[DEMO_SCENARIOS[currentIndex].id] ? (
              <Image
                source={DEMO_SCENARIOS[currentIndex].src}
                style={{ width: 170, height: 210, backgroundColor: '#eee' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: 170, height: 210, backgroundColor: '#eee' }} />
            )}
          </View>

          {/* 프롬프트 박스 (여백 넉넉히) */}
          <View style={{
            backgroundColor: 'white',
            borderColor: 'rgba(243, 138, 44, 0.25)',
            borderWidth: 1.5,
            borderRadius: 25,
            paddingVertical: 14,
            paddingHorizontal: 20,
            width: '75%',
            marginTop: 35, // 사진과 프롬프트 사이 간격
          }}>
            <Text style={{ fontFamily: 'Pretendard-Regular', color: '#555' }} className="text-center text-[17px]">
              {DEMO_SCENARIOS[currentIndex].text}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* --- 3. 하단 Enter 버튼 (너비 축소 및 위치 하단 고정) --- */}
      <View className="w-full items-center mt-auto mb-20">
        <Pressable
          onPress={handleEnterPress}
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? '#D6751F' : '#F38A2C',
              transform: [{ scale: pressed ? 0.96 : 1 }],
              borderRadius: 10,
              height: 56,
              width: 80,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: pressed ? 0 : 5,
              shadowColor: "#F38A2C",
              shadowOffset: { width: 0, height: pressed ? 0 : 5 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }
          ]}
        >
          <Text style={{ fontFamily: 'Pretendard-Bold', color: 'white', fontSize: 18 }}>Enter</Text>
        </Pressable>
      </View>
    </View>
  );
}
