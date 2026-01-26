// src/services/analysisService.ts
import { getNoGpsPhotos, updatePhotoLocation, updatePhotoTags,insertPhoto } from './database';
import { identifyLocationFromTags } from './azure';


/**
 * 🤖 [Mock] MobileCLIP 역할을 하는 가짜 함수
 * 실제로는 백엔드 API에 이미지를 보내고 결과를 받아와야 함.
 * 지금은 테스트를 위해 랜덤한 여행지 태그를 반환함.
 */
const getMobileCLIPTags = async (photoUri: string): Promise<string> => {
  // TODO: 나중에 실제 axios.post(...) 코드로 변경해야 함
  console.log(`📡 [MobileCLIP] 이미지 분석 중... ${photoUri}`);
  
  // 0.5초 딜레이 (네트워크 통신 흉내)
  await new Promise(resolve => setTimeout(resolve, 500));

  // 상황별 랜덤 태그 시나리오
  const scenarios = [
    'ocean, beach, rocks, waves, sunrise, jeju island', // 제주 바다
    'mountain, trees, hiking, peak, autumn leaves',      // 설악산/지리산
    'traditional house, hanok, wood, roof, palace',      // 경복궁/전주
    'cafe, coffee, interior, window, cake, dessert',     // 카페
    'cat, street, animal, cute, fur',                    // 길고양이 (위치 불명)
  ];

  // 랜덤 선택
  const randomTag = scenarios[Math.floor(Math.random() * scenarios.length)];
  return randomTag;
};

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
    let currentTags = photo.ai_tags;
    // ---------------------------------------------------------
    // 🆕 [STEP 1] 태그가 없으면 MobileCLIP(가짜)에게 물어봐서 채워넣기
    // ---------------------------------------------------------
    if (!currentTags) {
      console.log(`🤖 [MobileCLIP] ID(${photo.id}) 태그 생성 시도...`);
      try {
        const generatedTags = await getMobileCLIPTags(photo.local_uri);
        
        // 빈 문자열이 오거나 null이면 에러로 간주하고 catch로 보냄
        if (!generatedTags || generatedTags.trim() === '') {
          throw new Error('Low similarity (No tags returned)');
        }
        
        currentTags = generatedTags; // 성공 시 태그 할당

      } catch (err) {
        // 🚨 [수정됨] 실패해도 멈추지 않고 'nomatch' 태그 부여
        console.warn(`⚠️ [MobileCLIP] 태그 생성 실패/미달 -> 'nomatch' 처리.`);
        currentTags = 'nomatch';
      }

      // 결과가 뭐든(진짜 태그든, nomatch든) DB에 저장
      // (그래야 다음에 이 사진을 또 MobileCLIP에 넣지 않음)
      await updatePhotoTags(photo.id, currentTags);
    }

    // ---------------------------------------------------------
    // [STEP 1.5] 'nomatch' 체크 (비용 절약)
    // ---------------------------------------------------------
    // 태그가 'nomatch'면 GPT에게 물어봐도 위치를 모를 테니 여기서 끝냄.
    if (currentTags === 'nomatch') {
      console.log(`💨 [Pipeline] 태그가 'nomatch'이므로 GPT 추론 건너뜀.`);
      continue; 
    }
    
    // // (중요) 태그가 비어있으면 Azure에 보낼 필요가 없음
    // if (!photo.ai_tags) {
    //   console.log(`⚠️ [Pipeline] ID(${photo.id})는 태그 정보가 없어 건너뜁니다.`);
    //   continue;
    // }

    // ---------------------------------------------------------
    // 🔁 [STEP 2] 확보된 태그로 GPT에게 위치 물어보기
    // ---------------------------------------------------------
    // 3. Azure AI 호출
    console.log(`🔍 [Pipeline] ID(${photo.id}) 분석 중... `);

    // photo 객체에 ai_tags를 강제로 넣어서 전달
    const tempPhoto = { ...photo, ai_tags: currentTags };
    // 1. Azure에게 물어봐서 객체(이름, 위도, 경도)를 받아옴
    // 나중에 MobileCLIP작업이 끝나면 tempPhoto를 photo로 바꾸어야함.
    const locationData = await identifyLocationFromTags(tempPhoto);


    // ---------------------------------------------------------
    // [STEP 3] 최종 위치 저장
    // ---------------------------------------------------------
    // 2. 데이터가 잘 왔으면 DB에 저장
    if (locationData ) {
      await updatePhotoLocation(
        photo.id, 
        locationData.name, 
        locationData.latitude, 
        locationData.longitude
      );
      successCount++;
    } else {
        console.log(`💨 [GPT] 위치를 특정하지 못했습니다.`);
    }
  }

  console.log(`✅ [Pipeline] 파이프라인 종료. 총 ${successCount}장의 위치 정보 업데이트 완료.`);
  return successCount;
};