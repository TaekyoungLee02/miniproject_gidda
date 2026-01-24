// app/_layout.tsx
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router'; // 또는 Slot
import { syncGalleryToDB, registerPhotoLibraryListener } from '../src/services/syncService'; // 경로 주의 (../src)
import { initDB } from '../src/services/database'; // 경로 주의 (../src)

export default function RootLayout() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. 초기화 및 앱 실행 시 동기화
    const initialize = async () => {
      await initDB();
      await syncGalleryToDB();
    };
    initialize();

    // 2. 갤러리 변경 감지 리스너 (앱 사용 중)
    const librarySubscription = registerPhotoLibraryListener();

    // 3. AppState 감지 (백그라운드 갔다가 돌아올 때)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('⚡ [AppState] 앱 활성화! 동기화 체크');
        syncGalleryToDB();
      }
      appState.current = nextAppState;
    });

    // Clean-up (앱 종료 시 해제)
    return () => {
      librarySubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  // 화면 네비게이션 설정 (기존 코드 유지)
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '홈' }} />
      {/* 다른 화면 설정이 있다면 여기에 */}
    </Stack>
  );
}