// utils/modelService.js

import { Asset } from 'expo-asset';
import { InferenceSession } from 'onnxruntime-react-native';
// 👇 너희 팀이 만든 전처리 클래스 가져오기
import { ImageProcessorService } from './image/ImageProcessor';

// 모델 세션을 저장할 변수 (전역 변수처럼 사용)
let session = null;
const processor = new ImageProcessorService(); // 인스턴스 생성

export const initModel = async () => {
  if (session) return session;
  try {
    const modelAsset = Asset.fromModule(require('../../assets/model.onnx'));
    await modelAsset.downloadAsync();
    session = await InferenceSession.create(modelAsset.localUri);
    console.log("✅ 모델 세션 로드 완료!");
    return session;
  } catch (e) {
    console.error("initModel 에러:", e);
    throw e;
  }
};

export const runInference = async (imageUri) => {
  try {
    if (!session) await initModel();

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
    const outputData = await session.run(feeds);
    const outputName = session.outputNames[0];
    
    return outputData[outputName].data;

  } catch (e) {
    console.error("runInference 에러:", e);
    throw e;
  }
};