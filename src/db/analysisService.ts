// src/services/analysisService.ts
import { getNoGpsPhotos, updatePhotoAddress, insertPhoto } from './database';

/**
 * [테스트용] 가짜 사진 데이터 주입 함수
 * 에뮬레이터 갤러리가 고장 났을 때, 강제로 DB에 사진을 넣어서 테스트하기 위함
 */
export const injectFakeData = async () => {
  const fakePhoto = {
    id: `fake_${Date.now()}`,
    local_uri: 'https://via.placeholder.com/150/0000FF/808080?Text=JejuSample', // 인터넷 가짜 이미지
    captured_at: Date.now(),
    width: 1000,
    height: 1000,
    latitude: null, // GPS 없음 (핵심)
    longitude: null, // GPS 없음
    address: null,
    ai_tags: 'sea, rock, blue', // MobileNet이 찾았다고 가정
  };

  await insertPhoto(fakePhoto);
  console.log('✅ 가짜 데이터 주입 완료:', fakePhoto.id);
  return fakePhoto;
};

/**
 * 🚀 [핵심 파이프라인] 위치 추론 실행
 * 1. GPS 없는 사진 조회
 * 2. (가짜) 백엔드 API 전송
 * 3. 결과 받아서 DB 업데이트
 */
export const runAnalysisPipeline = async () => {
  console.log('🚀 AI 위치 분석 파이프라인 가동...');

  // 1. 분석 대상 조회 (Latitude가 NULL인 사진들)
  const targetPhotos = await getNoGpsPhotos(10); // 10장만 가져오기
  
  if (targetPhotos.length === 0) {
    console.log('🤷‍♂️ 분석할 사진이 없습니다. (모두 GPS가 있거나 데이터가 없음)');
    return 0;
  }

  console.log(`📦 분석 대상: ${targetPhotos.length}장 발견. 백엔드로 전송 중...`);

  // 2. (Simulated) 백엔드 API 호출 - 2초 걸린다고 가정
  // 실제로는 여기서 fetch('https://api.gidda.com/analyze', ...)를 씀
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. 백엔드가 결과를 줬다고 가정 (Mock Response)
  // "야, 이거 태그 보니까 제주도 서귀포시네!" 라고 응답이 옴
  const mockResponse = targetPhotos.map(photo => ({
    id: photo.id,
    inferred_address: '제주도 서귀포시 (AI 추론됨)' 
  }));

  // 4. DB 업데이트 (Loop)
  let updatedCount = 0;
  for (const item of mockResponse) {
    await updatePhotoAddress(item.id, item.inferred_address);
    updatedCount++;
  }

  console.log(`✨ 분석 완료! ${updatedCount}장의 주소를 '제주도'로 업데이트함.`);
  return updatedCount;
};