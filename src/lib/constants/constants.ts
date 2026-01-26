import imgEncoderPath from '@/assets/models/img_encoder/img_encoder.onnx'
import txtEncoderPath from '@/assets/models/txt_encoder/txt_encoder.onnx'
import txtEncoderDataPath from '@/assets/models/txt_encoder/txt_encoder.onnx.data'
import txtTokenizerPath from '@/assets/models/txt_encoder/txt_tokenizer/txt_tokenizer.onnx'

export const PAD_SIZE : number = 77;

export const imgEncoder : string = 'img_encoder.onnx';
export const txtEncoder : string = 'txt_encoder.onnx';
export const txtEncoderData : string = 'txt_encoder.onnx.data';
export const txtTokenizer : string = 'txt_tokenizer.onnx';

export const MODEL_MODULES = {
    "img_encoder.onnx": imgEncoderPath,
    "txt_encoder.onnx": txtEncoderPath,
    "txt_encoder.onnx.data": txtEncoderDataPath,
    "txt_tokenizer.onnx": txtTokenizerPath,
} as const;

export const IMG_HEIGHT_WIDTH : number = 256;
export const IMG_COLOR_SIZE : number = 65536;
export const IMG_BUFFER_SIZE : number = 196608;

export const DATABASE_NAME : string = 'photos.db';
