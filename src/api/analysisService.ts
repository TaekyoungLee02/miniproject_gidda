// src/services/analysisService.ts
// import {
//   updatePhotoLocation,
//   updatePhotoTags,
// } from '../db/database';

/**
 * 🤖 [MobileCLIP] 실제 온디바이스 추론 실행 함수
 * (태경: 실제 라이브러리 연동 시 이 부분을 해당 라이브러리 호출로 교체할 것)
 */
// const getMobileCLIPResult = async (photoUri: string): Promise<{
//   embedding: Float32Array,
//   tags: string
// }> => {
//   console.log(`📡 [MobileCLIP] 추론 엔진 가동: ${photoUri}`);
//
//   // TODO: 실제 On-Device MobileCLIP 모델 호출 (예: NativeModule 혹은 TensorFlow Lite)
//   // return await MobileCLIPModule.analyzeImage(photoUri);
//
//   // 구조 확인을 위한 임시 반환값 (실제 연동 전까지 유지)
//   return {
//     embedding: new Float32Array(512).fill(Math.random()), // 실제 512차원 벡터가 올 자리
//     tags: "beach, ocean, jeju island"             // 실제 태그가 올 자리
//   };
// };

/**
 * 🚀 통합 분석 파이프라인
 * 배치(Batch) 처리를 통해 과부하를 방지함
 */
// export const runAnalysisPipeline = async (batchSize: number = 5) => {
//   console.log(`🔄 [Pipeline] 새 사진 ${batchSize}장 분석 시작...`);
//
//   const targetPhotos = await getPhotosMissingVector(batchSize);
//
//   if (targetPhotos.length === 0) {
//     console.log('🤷‍♂️ [Pipeline] 새로 분석할 사진이 없습니다.');
//     return 0;
//   }
//
//   let successCount = 0;
//
//   // 2. 순차 처리 시작
//   for (const photo of targetPhotos) {
//     try {
//       // 🆕 [변경점] CLIP으로 바로 보내지 않고 전처리를 먼저 거침
//       const processedImage = await preprocessImage(photo.local_uri);
//
//       // ---------------------------------------------------------
//       // 🆕 [STEP 1] MobileCLIP 1회 실행으로 벡터와 태그 동시에 획득
//       // ---------------------------------------------------------
//       // 전처리된 데이터를 모델 파트(태경)의 함수로 전달
//       const { embedding, tags } = await getMobileCLIPResult(processedImage);
//
//       // ---------------------------------------------------------
//       // 🆕 [STEP 2] 벡터는 '무조건' 저장 (모든 사진 공통)
//       // ---------------------------------------------------------
//       await insertPhotoEmbedding(photo.id, embedding);
//       console.log(`🔢 [Vector] ID(${photo.id}) 벡터 저장 완료.`);
//
//       // ---------------------------------------------------------
//       // 🆕 [STEP 3] GPS 유무에 따른 조건부 위치 추론 (Azure GPT)
//       // ---------------------------------------------------------
//       const needsGpsInference = !photo.latitude || !photo.longitude;
//
//
//       if (needsGpsInference) {
//         const currentTags = tags.trim() !== "" ? tags : "nomatch";
//         await updatePhotoTags(photo.id, currentTags);
//
//         if (currentTags !== "nomatch") {
//           // Azure GPT를 통한 위치 특정
//           const locationData = await identifyLocationFromTags({ ...photo, ai_tags: currentTags });
//
//           if (locationData) {
//             await updatePhotoLocation(
//               photo.id,
//               locationData.name,
//               locationData.latitude,
//               locationData.longitude
//             );
//             successCount++;
//           }
//         }
//       } else {
//         console.log(`✅ [GPS 있음] ID(${photo.id}) 추가 분석 불필요. 스킵.`);
//       }
//
//     } catch (err) {
//       console.error(`❌ [Pipeline] ID ${photo.id} 처리 중 장애 발생:`, err);
//     }
//   }
//
//   console.log(`✅ [Pipeline] 파이프라인 종료. 이번 회차 처리 완료.`);
//   return successCount;
// };