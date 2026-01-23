import * as ImageManipulator from 'expo-image-manipulator';

export class ImageProcessorService {
  
  /**
   * @param uri 원본 이미지 경로
   */
  async processForMobileClip(uri: string) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 256, height: 256 } }], // 1. 사이즈 조절 256x256
        { 
          compress: 1, 
          format: ImageManipulator.SaveFormat.JPEG // 2. RGB 형식을 위해 JPEG 선택 (RGBA 제거)
        }
      );
      
      return result.uri; // 전처리된 이미지의 새로운 경로 반환
    } catch (error) {
      console.error("이미지 전처리 중 에러 발생:", error);
      throw error;
    }
  }
}