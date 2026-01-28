import { ImageManipulator, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Constants from '@/src/lib/constants/constants'
import { Skia } from "@shopify/react-native-skia"



export class ImageProcessorService {
  
  /**
   * Deprecated
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

  private getRGBVector(rgba: Uint8Array) {
        // get rgb vector
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
        return out;
  }


  /**
   * new Preprocessor with batch
   * @param uris image uris
   */
  async processForMobileClipAll(uris: string[]) {
    try
    {
      const imageVectors = await Promise.all(
        uris.map(async (uri) => {
          const imageURI = await ImageManipulator.manipulate(uri)
            .resize({
              height: Constants.IMG_HEIGHT_WIDTH,
              width: Constants.IMG_HEIGHT_WIDTH
            })
            .renderAsync()
            .then((value) => {
              return value.saveAsync({
                format: SaveFormat.PNG,
                compress: 1,
              })
            });

          const imageBuffer = new Uint8Array(
            await fetch(imageURI.uri).then(r =>
            {
                return r.arrayBuffer()
            })
          );

          const skiaData = Skia.Data.fromBytes(imageBuffer);
          const skiaImage = Skia.Image.MakeImageFromEncoded(skiaData);

          const pixels = skiaImage.readPixels(0, 0, {
              width: Constants.IMG_HEIGHT_WIDTH,
              height: Constants.IMG_HEIGHT_WIDTH,
              colorType: ColorType.RGBA_8888,
              alphaType: AlphaType.Premul
          });
          const rgbVector = this.getRGBVector(pixels);

          return rgbVector;
        })
      );

      return imageVectors;
    }
    catch(e)
    {
      console.error(`error while preprocessing : `, e)
    }
  }
}