// src/services/syncService.ts
// DB에 실시간으로 사진을 업데이트 하는 기능을 하는 스크립트

import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 키 값 변경 (ID -> Time)
const LAST_SYNC_TIME_KEY = 'last_synced_timestamp';
let isSyncing = false;
export let gallery_photos_amount : number = 1;

export const getGalleryPhotosSync = async function* () {
  if (isSyncing) {
    console.log('🚫 [Sync] 중복 실행 방지됨.');
    return null;
  }

  try {
    isSyncing = true;
    console.log('🔄 [Sync] 시간 기반 동기화 시작...');

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return 0;

    // 1. 마지막으로 저장한 시간 가져오기
    const lastTimeStr = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
    // 저장된 시간이 없으면 0 (1970년 1월 1일)부터 시작
    const lastTime = lastTimeStr ? parseFloat(lastTimeStr) : 0; 

    // 2. 옵션 설정 (핵심 변경 ⭐)
    const assetsOptions: MediaLibrary.AssetsOptions = {
      mediaType: 'photo',
      // 최신순으로 정렬하지 말고, "오래된 순(CreationTime)"으로 정렬해야
      // 과거 -> 현재 순서대로 차곡차곡 쌓임
      sortBy: [MediaLibrary.SortBy.creationTime], 
      
      // ⭐ 핵심: 이 시간 이후에 찍은 사진만 다 가져와!
      createdAfter: lastTime, 
      
      first: 50, 
      include: ['location'],
    } as any;

    if (lastTime > 0) {
      console.log(`📡 [Sync] ${new Date(lastTime).toLocaleString()} 이후의 사진을 찾습니다.`);
    } else {
      console.log(`📡 [Sync] 전체 스캔을 시작합니다.`);
    }

    let hasNextPage = true;
    let totalSaved = 0;
    // 이번 동기화에서 가장 최신 사진의 시간을 기록할 변수
    let maxTimestamp = lastTime; 

    // 🛠️ [수정 1] for문(1회 실행) -> while문(계속 실행)으로 변경
    // hasNextPage가 true인 동안 계속 반복합니다.
    while (hasNextPage) {
      const assets = await MediaLibrary.getAssetsAsync(assetsOptions);
      gallery_photos_amount = assets.totalCount;
      
      if (assets.totalCount === 0 || assets.assets.length === 0) {
        break;
      }

      console.log(`📸 [Sync] ${assets.assets.length}장 발견! (${totalSaved + assets.assets.length} / ${assets.totalCount})`);

      // 🛠️ [수정 2] 현재 배치의 가장 마지막(최신) 사진 시간을 기록
      // (과거->현재 정렬이므로 배열의 마지막이 가장 최신입니다)
      const lastPhotoInBatch = assets.assets[assets.assets.length - 1];
      if (lastPhotoInBatch.creationTime) {
          // 혹시 순서가 섞일 수 있으니 max값 비교
          maxTimestamp = Math.max(maxTimestamp, lastPhotoInBatch.creationTime);
      }

      totalSaved += assets.assets.length;
      yield assets.assets as MediaLibrary.Asset[];
      
      hasNextPage = assets.hasNextPage;
      if (hasNextPage) {
        // 페이징 커서 업데이트 (다음 50장을 가져오기 위함)
        assetsOptions.after = assets.endCursor;
      }
    }
    
    // for(let i = 0; i < 1; i ++) {
    //   const assets = await MediaLibrary.getAssetsAsync(assetsOptions);
    //   gallery_photos_amount = assets.totalCount;
      
    //   if (assets.totalCount === 0 || assets.assets.length === 0) {
    //     break;
    //   }

    //   console.log(`📸 [Sync] ${assets.assets.length}장 발견! DB 저장 중...`);

    //   totalSaved += 50;
    //   yield assets.assets as MediaLibrary.Asset[];
      
    //   hasNextPage = assets.hasNextPage;
    //   if (hasNextPage) {
    //     // 페이징은 여전히 cursor를 사용 (createdAfter가 필터링해준 목록 내에서의 페이징)
    //     assetsOptions.after = assets.endCursor;
    //   }
    // }

    // 3.  가장 최신 사진의 시간을 저장 (다음엔 이 시간이후부터 검색)
    // 단, 사진을 한 장이라도 저장했을 때만 갱신
    if (totalSaved > 0) {
        // 중복 방지를 위해 1ms 더함
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, (maxTimestamp + 1).toString());
      console.log(`✅ [Sync] 기준 시간 업데이트 완료: ${new Date(maxTimestamp).toLocaleString()}`);
    }

    console.log(`✅ [Sync] 총 ${totalSaved}장 저장 완료.`);
    return totalSaved;

  } catch (error) {
    console.error('❌ [Sync] 에러:', error);
    return 0;
  } finally {
    isSyncing = false;
  }
};

export const registerPhotoLibraryListener = (callback: () => void) => {
  return MediaLibrary.addListener(() => {
    console.log('🔔 [Listener] 새 사진 감지!');
    callback();
  });
};