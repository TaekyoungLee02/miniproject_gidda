// src/services/analysisService.ts
import { getNoGpsPhotos, updatePhotoLocation, insertPhoto } from './database';
import { identifyLocationFromTags } from './azure';

// /**
//  * [테스트용] 가짜 사진 데이터 주입 함수
//  * 에뮬레이터 갤러리가 고장 났을 때, 강제로 DB에 사진을 넣어서 테스트하기 위함
//  */
// export const injectFakeData = async () => {
//   const fakePhoto = {
//     id: `fake_${Date.now()}`,
//     local_uri: 'https://via.placeholder.com/150/0000FF/808080?Text=JejuSample', // 인터넷 가짜 이미지
//     captured_at: Date.now(),
//     width: 1000,
//     height: 1000,
//     latitude: null, // GPS 없음 (핵심)
//     longitude: null, // GPS 없음
//     address: null,
//     ai_tags: 'sea, rock, blue', // MobileNet이 찾았다고 가정
//   };

//   await insertPhoto(fakePhoto);
//   console.log('✅ 가짜 데이터 주입 완료:', fakePhoto.id);
//   return fakePhoto;
// };

// /**
//  * 🚀 [핵심 파이프라인] 위치 추론 실행
//  * 1. GPS 없는 사진 조회
//  * 2. (가짜) 백엔드 API 전송
//  * 3. 결과 받아서 DB 업데이트
//  */
// export const runAnalysisPipeline = async () => {
//   console.log('🚀 AI 위치 분석 파이프라인 가동...');

//   // 1. 분석 대상 조회 (Latitude가 NULL인 사진들)
//   const targetPhotos = await getNoGpsPhotos(10); // 10장만 가져오기
  
//   if (targetPhotos.length === 0) {
//     console.log('🤷‍♂️ 분석할 사진이 없습니다. (모두 GPS가 있거나 데이터가 없음)');
//     return 0;
//   }

//   console.log(`📦 분석 대상: ${targetPhotos.length}장 발견. 백엔드로 전송 중...`);

//   // 2. (Simulated) 백엔드 API 호출 - 2초 걸린다고 가정
//   // 실제로는 여기서 fetch('https://api.gidda.com/analyze', ...)를 씀
//   await new Promise(resolve => setTimeout(resolve, 2000));

//   // 3. 백엔드가 결과를 줬다고 가정 (Mock Response)
//   // "야, 이거 태그 보니까 제주도 서귀포시네!" 라고 응답이 옴
//   const mockResponse = targetPhotos.map(photo => ({
//     id: photo.id,
//     inferred_address: '제주도 서귀포시 (AI 추론됨)' 
//   }));

//   // 4. DB 업데이트 (Loop)
//   let updatedCount = 0;
//   for (const item of mockResponse) {
//     await updatePhotoAddress(item.id, item.inferred_address);
//     updatedCount++;
//   }

//   console.log(`✨ 분석 완료! ${updatedCount}장의 주소를 '제주도'로 업데이트함.`);
//   return updatedCount;
// };

/**
 * 🚀 [핵심 파이프라인] 위치 추론 실행 로직
 * * [동작 순서]
 * 1. DB에서 GPS(위도/경도)가 없는 사진을 최대 5장 가져온다. (Batch Processing)
 * 2. 각 사진에 대해 반복문(Loop)을 돌린다.
 * 3. 사진에 'ai_tags'가 있는지 확인한다.
 * 4. 있다면 Azure GPT에게 위치를 물어본다.
 * 5. 답이 오면 DB의 'address' 컬럼을 업데이트한다.
 */
export const runAnalysisPipeline = async () => {
  console.log('🚀 [Pipeline] 위치 분석 파이프라인 가동 시작...');

  // 1. 분석 대상 조회 (한 번에 너무 많이 하면 앱 느려지므로 5개씩 끊어서 처리)
  // getNoGpsPhotos는 latitude IS NULL 인 항목을 가져옴
  const targetPhotos = await getNoGpsPhotos(5); 
  
  if (targetPhotos.length === 0) {
    console.log('🤷‍♂️ [Pipeline] 분석할 사진이 없습니다. (모두 GPS가 있거나 데이터 없음)');
    return 0;
  }

  console.log(`📦 [Pipeline] 분석 대상 ${targetPhotos.length}장 발견. 순차 처리 시작.`);

  let successCount = 0;

  // 2. 순차 처리 (Promise.all보다 for...of가 디버깅과 속도 제어에 유리함)
  for (const photo of targetPhotos) {
    
    // (중요) 태그가 비어있으면 Azure에 보낼 필요가 없음
    if (!photo.ai_tags) {
      console.log(`⚠️ [Pipeline] ID(${photo.id})는 태그 정보가 없어 건너뜁니다.`);
      continue;
    }

    // 3. Azure AI 호출
    console.log(`🔍 [Pipeline] ID(${photo.id}) 분석 중... (Tags: ${photo.ai_tags})`);
    const locationName = await identifyLocationFromTags(photo);

    // 4. 결과 저장
    if (locationName && locationName !== '알 수 없는 장소') {
      await updatePhotoLocation(photo.id, locationName);
      successCount++;
    } else {
      console.log(`💨 [Pipeline] 장소 추론 실패 또는 불명확 (ID: ${photo.id})`);
    }
  }

  console.log(`✅ [Pipeline] 파이프라인 종료. 총 ${successCount}장의 위치 정보 업데이트 완료.`);
  return successCount;
};