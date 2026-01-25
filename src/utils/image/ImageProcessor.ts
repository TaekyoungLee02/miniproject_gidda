import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js'



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

      const res = await fetch(result.uri);
      const buffer = await res.arrayBuffer();

      const bytes = new Uint8Array(buffer);

      const decoded = jpeg.decode(bytes, { useTArray: true });

      const rgba = decoded.data as Uint8Array;
      const size = 256 * 256;
      const out = new Float32Array(3 * 256 * 256);

      for (let i = 0; i < size; i ++)
      {
        const r = rgba[i * 4 + 0] / 255;
        const g = rgba[i * 4 + 1] / 255;
        const b = rgba[i * 4 + 2] / 255;

        out[i] = r;
        out[i + size] = g;
        out[i + 2*size] = b;
      }


      console.log(out)
      return out; // 전처리된 이미지의 새로운 경로 반환
    } catch (error) {
      console.error("이미지 전처리 중 에러 발생:", error);
      throw error;
    }
  }
}