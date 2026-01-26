import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Stack } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // 1. Montserrat (Bold가 빠져있어서 추가했습니다)
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),

    // 2. Pretendard (이름을 StartPage의 코드와 일치시킵니다)
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'), // 👈 Medium 대신 Regular로 변경
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}