import { ImageManipulator, ImageRef, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Constants from '@/src/lib/constants/constants'
import * as jpeg from 'jpeg-js'

// apk 용 추가 코드
const CLIP_MEAN = [0.48145466, 0.4578275, 0.40821073];
const CLIP_STD = [0.26862954, 0.26130258, 0.27577711];
const INPUT_SIZE = 256; // 아까 Netron에서 확인한 크기


export class ImageProcessorService {

    /**
     * Deprecated
     * @param uri 원본 이미지 경로
     */
    // 중복되는 코드는 apk 용으로 수정한 것
    //async processForMobileClip(uri: string) {    
    async processForMobileClip(uri: string): Promise<Float32Array> {
        try {

            console.log(`전처리 시작`, uri)
            // resize image with 256 * 256
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
                { compress: 1, format: SaveFormat.JPEG }
                //[{resize: {width: Constants.IMG_HEIGHT_WIDTH, height: Constants.IMG_HEIGHT_WIDTH}}], // 1. 사이즈 조절 256x256
                // {
                //     compress: 1,
                //     format: ImageManipulator.SaveFormat.JPEG // 2. RGB 형식을 위해 JPEG 선택 (RGBA 제거)
                // }
            );

            // get image as buffer
            const res = await fetch(result.uri);
            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            // decode buffer
            const decoded = jpeg.decode(bytes, { useTArray: true }); // { width, height, data }
            //const decoded = jpeg.decode(bytes, {useTArray: true});

            // get rgb vector
            const rgba = decoded.data;
            const size = INPUT_SIZE * INPUT_SIZE;
            const out = new Float32Array(3 * size); // [3, 256, 256]
            //const rgba = decoded.data as Uint8Array;
            //const size = Constants.IMG_COLOR_SIZE;
            //const out = new Float32Array(Constants.IMG_BUFFER_SIZE);

            for (let i = 0; i < size; i++) {
                const r = rgba[i * 4 + 0] / 255;
                const g = rgba[i * 4 + 1] / 255;
                const b = rgba[i * 4 + 2] / 255;

                out[i] = (r - CLIP_MEAN[0]) / CLIP_STD[0];          // R
                out[i + size] = (g - CLIP_MEAN[1]) / CLIP_STD[1];      // G
                out[i + size * 2] = (b - CLIP_MEAN[2]) / CLIP_STD[2];  // B
                // out[i] = r;
                // out[i + size] = g;
                // out[i + 2 * size] = b;
            }

            // return image vector
            console.log(`전처리 완료. 데이터 크기: ${out.length}`)
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

        for (let i = 0; i < size; i++) {
            const r = rgba[i * 4 + 0] / 255;
            const g = rgba[i * 4 + 1] / 255;
            const b = rgba[i * 4 + 2] / 255;

            out[i] = r;
            out[i + size] = g;
            out[i + 2 * size] = b;
        }
        return out;
    }


    /**
     * new Preprocessor with batch
     * @param uris image uris
     */
    async processForMobileClipAll(uris: string[]) {

        const outputs : Float32Array[] = [];

        for (const uri of uris)
        {
            try {
                const image = ImageManipulator.manipulate(uri);
                const ref = await image.renderAsync();

                if (ref.height > ref.width)
                {
                    image.resize({
                        width: Constants.IMG_HEIGHT_WIDTH
                    });

                    const resizedRef = await image.renderAsync()
                    image.crop({
                        height: Constants.IMG_HEIGHT_WIDTH,
                        originX: 0,
                        originY: resizedRef.height/2 - Constants.IMG_SIZE_HALF,
                        width: Constants.IMG_HEIGHT_WIDTH
                    });
                }
                else
                {
                    image.resize({
                        height: Constants.IMG_HEIGHT_WIDTH
                    });

                    const resizedRef = await image.renderAsync()
                    image.crop({
                        height: Constants.IMG_HEIGHT_WIDTH,
                        originX: resizedRef.width/2 - Constants.IMG_SIZE_HALF,
                        originY: 0,
                        width: Constants.IMG_HEIGHT_WIDTH
                    });
                }

                const imageURI = await image.renderAsync()
                    .then((value) => {
                        return value.saveAsync({
                            format: SaveFormat.JPEG,
                            compress: 1,
                        });
                    });


                // apk 용 오류 수정 코드
                const res = await fetch(imageURI.uri);
                const buffer = await res.arrayBuffer();
                const imageBuffer = new Uint8Array(buffer);
                // const imageBuffer = new Uint8Array(
                //     await fetch(imageURI.uri).then(r => {
                //         return r.arrayBuffer()
                //     })
                // );


                const decoded = jpeg.decode(imageBuffer, {useTArray: true});
                const rgbVector = this.getRGBVector(decoded.data as Uint8Array);

                // if (uri.includes("Screenshot_20260124_193732_Discord.jpg")) console.log(`image uri : ${uri}\nvector : ${rgbVector}`)
                // console.log(`image uri : ${uri}\nmanipulated uri : ${imageURI.uri}\nout vector size : ${rgbVector.length}`)
                outputs.push(rgbVector);
            } catch (e) {
                console.error(`error while preprocessing : `, e)
            }
        }

        return outputs;
    }
}