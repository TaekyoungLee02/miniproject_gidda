import * as ImageManipulator from 'expo-image-manipulator';
import * as Constants from '@/src/lib/constants/constants'
import jpeg from 'jpeg-js'



export class ImageProcessorService {
  
  /**
   * @param uri 원본 이미지 경로
   */
  async processForMobileClip(uri: string) {
    try {

      console.log(``, uri)
      // resize image with 256 * 256
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: Constants.IMG_HEIGHT_WIDTH, height: Constants.IMG_HEIGHT_WIDTH } }], // 1. 사이즈 조절 256x256
        { 
          compress: 1, 
          format: ImageManipulator.SaveFormat.JPEG // 2. RGB 형식을 위해 JPEG 선택 (RGBA 제거)
        }
      );

      // get image as buffer
      const res = await fetch(result.uri);
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // decode buffer
      const decoded = jpeg.decode(bytes, { useTArray: true });

      // get rgb vector
      const rgba = decoded.data as Uint8Array;
      const size = Constants.IMG_COLOR_SIZE;
      const out = new Float32Array(Constants.IMG_BUFFER_SIZE);

      for (let i = 0; i < size; i ++)
      {
        const r = rgba[i * 4 + 0] / 255;
        const g = rgba[i * 4 + 1] / 255;
        const b = rgba[i * 4 + 2] / 255;

        out[i] = r;
        out[i + size] = g;
        out[i + 2*size] = b;
      }

      // return image vector
      console.log(`out_image_vector : ${out.length}`)
      return out;

    } catch (error) {
      console.error("이미지 전처리 중 에러 발생:", error);
      throw error;
    }
  }
}