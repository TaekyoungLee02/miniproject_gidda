// utils/modelService.js

import { Asset } from 'expo-asset';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
// 👇 너희 팀이 만든 전처리 클래스 가져오기
import { ImageProcessorService } from './image/ImageProcessor';
import * as FileSystem from 'expo-file-system/legacy';

// 🛠️ [수정] 모델이 2개이므로 세션 변수도 2개로 분리 (전역 변수처럼 사용)
let imgSession = null;
let txtSession = null;

const processor = new ImageProcessorService(); // 인스턴스 생성

export const initModel = async () => {
  // 두 세션이 모두 준비되었으면 바로 반환
  if (imgSession && txtSession) {
    return { imgSession, txtSession };
  }

  try {
    console.log("📥 AI 모델 파일 로딩 시작...");

    // ✅ 1. 이미지 인코더 로딩 (경로 수정됨)
    // 원래 코드: require('../../assets/model.onnx')
    const imgAsset = Asset.fromModule(require('../../assets/models/img_encoder/img_encoder.onnx'));
    await imgAsset.downloadAsync();

    // ==========================================================
    // 2️⃣ 텍스트 모델 로딩 (⭐ 여기가 핵심 수정 포인트!)
    // .onnx 파일과 .data 파일을 강제로 같은 폴더에 원래 이름으로 복사해야 함
    // ==========================================================
    
    // 2-1. 에셋 가져오기
    const txtModelAsset = Asset.fromModule(require('../../assets/models/txt_encoder/mobileclip_text_fixed.onnx'));
    const txtDataAsset = Asset.fromModule(require('../../assets/models/txt_encoder/mobileclip_text_fixed.onnx.data'));
    
    // 2-2. 다운로드 (Expo 캐시 폴더로 다운됨, 이름이 이상할 수 있음)
    await Promise.all([txtModelAsset.downloadAsync(), txtDataAsset.downloadAsync()]);

    // 2-3. 우리가 원하는 경로(Cache) 설정
    const cacheDir = FileSystem.cacheDirectory;
    const txtModelDest = cacheDir + 'mobileclip_text_fixed.onnx';
    const txtDataDest = cacheDir + 'mobileclip_text_fixed.onnx.data'; // 👈 모델이 찾는 그 이름!

    // 🛠️ [핵심 수정 2] 기존 파일이 있으면 삭제 (충돌 방지)
    // legacy 버전에서는 idempotent 옵션이 없을 수 있어 try-catch로 감쌉니다.
    try {
        await FileSystem.deleteAsync(txtModelDest, { idempotent: true });
        await FileSystem.deleteAsync(txtDataDest, { idempotent: true });
    } catch (e) {
        // 파일이 없어서 삭제 못하는 건 무시
    }
    
    // 2-4. 파일 복사 (이름을 맞춰주기 위해)
    await FileSystem.copyAsync({ from: txtModelAsset.localUri, to: txtModelDest });
    await FileSystem.copyAsync({ from: txtDataAsset.localUri, to: txtDataDest });

    console.log("🧩 파일 배치 완료. 세션 생성 시작...");

    // ==========================================================
    // 3️⃣ 세션 생성
    // ==========================================================
    imgSession = await InferenceSession.create(imgAsset.localUri);
    
    // ⭐ 중요: 복사한 경로(txtModelDest)로 세션을 만듭니다.
    // 그래야 바로 옆에 있는 .data 파일을 찾을 수 있습니다.
    txtSession = await InferenceSession.create(txtModelDest); 

    console.log("✅ 이미지 & 텍스트 모델 세션 로드 성공!");
    
    return { imgSession, txtSession };

  } catch (e) {
    console.error("initModel 에러 (경로/파일명을 확인하세요)::", e);
    throw e;
  }
};

export const runInference = async (imageUri) => {
  try {
    if (!imgSession) {
      await initModel();
    }
    // 1. 너희 팀 코드로 전처리 수행! (Float32Array 반환됨)
    const float32Data = await processor.processForMobileClip(imageUri);

    // 2. ONNX Tensor로 포장하기 (이건 무조건 해줘야 함)
    // [1, 3, 256, 256] 크기 명시
    const inputTensor = new Tensor('float32', float32Data, [1, 3, 256, 256]);

    // 3. 모델에 주입
    const feeds = {};
    const inputName = session.inputNames[0]; // 자동 감지
    feeds[inputName] = inputTensor;

    // 4. 실행
    const outputData = await imgSession.run(feeds);
    const outputName = session.outputNames[0];
    
    return outputData[outputName].data;

  } catch (e) {
    console.error("runInference 에러:", e);
    throw e;
  }
};

// // 🆕 [추가] 텍스트 추론용 함수도 필요할 것 같아 구조만 잡아드립니다.
// // (나중에 필요할 때 사용하세요)
// export const runTextInference = async (textTokens) => {
//     try {
//         if (!txtSession) await initModel();
        
//         // 텍스트는 보통 Int64나 Int32 텐서를 사용합니다. (토크나이저 구현에 따라 다름)
//         // const inputTensor = new Tensor('int32', textTokens, [1, 77]); 
        
//         // ... (나머지 로직은 이미지와 유사)
//     } catch (e) {
//         console.error("runTextInference 에러:", e);
//         throw e;
//     }
// }