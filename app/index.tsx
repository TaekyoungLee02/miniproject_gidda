///<reference types="nativewind/types" />
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, Platform, Pressable, Dimensions, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 📦 [추가] 상태 저장을 위해 설치 필요
// npm install @react-native-async-storage/async-storage 실행하시길
import { Asset } from 'expo-asset';
import * as MediaLibrary from 'expo-media-library';

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

export default function StartPage() {
 
  const router = useRouter();
  // --- 🛠️ [Integration] 상태 관리 로직 추가 ---
  const [isChecking, setIsChecking] = useState(true); // 초기 로딩 상태
  const [nextRoute, setNextRoute] = useState<'/welcome' | '/home'>('/welcome');
  // 애니메이션 hooks
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialReady, setInitialReady] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Record<number, boolean>>({});
  const loadedIdsRef = useRef<Record<number, boolean>>({});
  const loadingIdsRef = useRef<Set<number>>(new Set());
  const float = useSharedValue(0);

  // 1️⃣ [Logic] 앱 실행 시 사용자 상태 체크 (DB 연동 준비)
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // AsyncStorage는 앱을 껐다 켜도 데이터가 유지됨.
        // 'is_setup_complete' 키가 'true'면 이미 인덱싱을 마친 유저임.
        const isSetup = await AsyncStorage.getItem('is_setup_complete');
        
        if (isSetup === 'true') {
          setNextRoute('/home'); // 이미 완료된 유저 -> 홈으로
        } else {
          setNextRoute('/welcome'); // 신규 유저 -> 웰컴(인덱싱)으로
        }
      } catch (e) {
        console.error("Storage Error:", e);
        setNextRoute('/welcome'); // 에러 시 안전하게 웰컴으로
      } finally {
        setIsChecking(false);
      }
    };

    checkUserStatus();
  }, []);

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