import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, Modal, TouchableOpacity, Platform, Pressable, Dimensions, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Asset } from 'expo-asset';
import * as MediaLibrary from 'expo-media-library';
// apk용 import
import { initModel } from '../src/utils/modelService'; // 위에서 만든 파일 import

const { width, height } = Dimensions.get('window');

// ✅ 새 로고와 사진들 변수 선언
const GiddaLogoBucket = require('../assets/images/favicon2.png'); // 👈 새 양동이 로고
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

// apk 용 코드를 함수에 추가했음
export default function StartPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialReady, setInitialReady] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Record<number, boolean>>({});
  const loadedIdsRef = useRef<Record<number, boolean>>({});
  const loadingIdsRef = useRef<Set<number>>(new Set());
  const float = useSharedValue(0);

  //apk 용 코드(AI 로딩 로직)
  const [isModelReady, setIsModelReady] = useState(false); // 1. AI 로딩 상태 변수

  useEffect(() => {
    const loadAI = async () => {
      try {
        console.log("🚀 StartPage: AI 모델 로딩 시작");
        await initModel(); // 모델 로딩 함수 호출
        setIsModelReady(true); // 로딩 완료 체크
        console.log("✅ StartPage: AI 모델 준비 완료");
      } catch (e) {
        console.error("❌ AI 모델 로딩 실패:", e);
        // 에러 나도 앱이 죽지 않게 일단 true로 넘겨줄 수도 있음 (선택 사항)
        setIsModelReady(true); 
      }
    };
    
    loadAI();
  }, []); // 빈 배열 [] : 앱 켜질 때 딱 한 번 실행
  // ----------------------------------------

  useEffect(() => {
    let isMounted = true;
    const markLoaded = (ids: number[]) => {
      setLoadedIds((prev) => {
        const next = { ...prev };
        ids.forEach((id) => { next[id] = true; });
        loadedIdsRef.current = next;
        return next;
      });
    };
    const preloadInitial = async () => {
      const first = DEMO_SCENARIOS[0];
      // ✅ 세모 이미지 로드 삭제, 새 로고 로드 추가
      await Asset.loadAsync([GiddaLogoBucket, first.src]);
      if (!isMounted) return;
      markLoaded([first.id]);
      setInitialReady(true);

      const remaining = DEMO_SCENARIOS.slice(1);
      remaining.forEach((s) => loadingIdsRef.current.add(s.id));
      Asset.loadAsync(remaining.map((s) => s.src))
        .then(() => { if (isMounted) markLoaded(remaining.map((s) => s.id)); })
        .finally(() => { remaining.forEach((s) => loadingIdsRef.current.delete(s.id)); });
    };
    preloadInitial();

    float.value = withRepeat(withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { isMounted = false; };
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
    } finally { loadingIdsRef.current.delete(id); }
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

  // apk 용 코드 추가
  if (!isModelReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFCF5' }} className="items-center px-6">
        {/* 상태바 색상 맞춤 */}
        <StatusBar style="dark" />

        {/* 1. 상단 로고 (메인 화면과 위치 동일하게 유지하여 위화감 제거) */}
        <View className="items-center w-full mt-40"> 
          <Image
            source={GiddaLogoBucket}
            style={styles.logoBucket}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>GIDDA</Text>
          <Text style={styles.tagline}>
            AI 모델을 초기화하고 있습니다.
          </Text>
        </View>

        {/* 2. 중앙 로딩 인디케이터 */}
        <View className="items-center justify-center w-full mt-16">
          {/* 브랜드 컬러인 오렌지색(#F38A2C) 사용 */}
          <ActivityIndicator size="large" color="#F38A2C" /> 
          
          <Text style={[styles.promptText, { marginTop: 24, fontSize: 16, color: '#888' }]}>
            당신의 기억을 긷기 위해{"\n"}
            AI가 뇌를 깨우는 중이에요... 🧠
          </Text>
        </View>
      </View>
    );
  }
  // ----------------------------------------

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFCF5' }} className="items-center px-6">
      <StatusBar style="dark" />

      {/* --- 1. 상단 로고 (새 양동이 로고 상단 중앙 배치) --- */}
      <View className="items-center w-full mt-24">
        <Animated.View style={[styles.logoHeader, animatedLogoStyle]}>
          <Image
            source={GiddaLogoBucket}
            style={styles.logoBucket}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>GIDDA</Text>
        </Animated.View>
        <Text style={styles.tagline}>
          수만 장의 사진 속에서, AI가 당신의 어제를 ‘긷다’.
        </Text>
      </View>

      {/* --- 2. 중앙 콘텐츠 (폴라로이드 감성 유지) --- */}
      <View className="items-center justify-center w-full mt-10">
        <Animated.View
          key={`scenario-${currentIndex}`}
          entering={FadeIn.duration(800)}
          exiting={FadeOut.duration(400)}
          className="items-center w-full"
        >
          <View style={styles.polaroidCard}>
            {loadedIds[DEMO_SCENARIOS[currentIndex].id] ? (
              <Image
                source={DEMO_SCENARIOS[currentIndex].src}
                style={styles.mainImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mainImage, { backgroundColor: '#eee' }]} />
            )}
          </View>

          {/* 프롬프트 박스 (시인성 강화) */}
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>
              {DEMO_SCENARIOS[currentIndex].text}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* --- 3. 하단 Enter 버튼 (위치 고정) --- */}
      <View className="w-full items-center mt-auto mb-20">
        <Pressable
          onPress={handleEnterPress}
          style={({ pressed }) => [
            styles.enterBtn,
            { backgroundColor: pressed ? '#D6751F' : '#F38A2C', transform: [{ scale: pressed ? 0.96 : 1 }] }
          ]}
        >
          <Text style={styles.enterBtnText}>Enter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoHeader: { alignItems: 'center', justifyContent: 'center' },
  logoBucket: { width: 200, height: 70, marginBottom: 5 }, // 양동이 크기 조정
  brandName: { fontFamily: 'Montserrat-Regular', fontSize: 52, color: '#F38A2C', letterSpacing: 2.6 },
  tagline: { fontFamily: 'Pretendard-Bold', color: '#333', fontSize: 13, letterSpacing: -0.5, marginTop: 15, opacity: 0.7 },

  polaroidCard: {
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
  },
  mainImage: { width: 180, height: 220 },

  promptBox: {
    backgroundColor: 'white',
    borderColor: 'rgba(243, 138, 44, 0.25)',
    borderWidth: 1.5,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '80%',
    marginTop: 35,
    shadowColor: "#F38A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  promptText: { fontFamily: 'Pretendard-Regular', color: '#555', textAlign: 'center', fontSize: 17 },

  enterBtn: {
    height: 56,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: "#F38A2C",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  enterBtnText: { fontFamily: 'Pretendard-Bold', color: 'white', fontSize: 18 }
});