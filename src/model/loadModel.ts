import { File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { ModelType } from '@/src/lib/enums/enums'
import * as Constants from '@/src/lib/constatnts/constants'

import imgEncoderPath from '@/assets/models/img_encoder/img_encoder.onnx'
import imgEncoderDataPath from '@/assets/models/img_encoder/img_encoder.onnx.data'
import txtEncoderPath from '@/assets/models/txt_encoder/txt_encoder.onnx'
import txtEncoderDataPath from '@/assets/models/txt_encoder/txt_encoder.onnx.data'
import txtTokenizerPath from '@/assets/models/txt_encoder/txt_tokenizer/txt_tokenizer.onnx'

const imgEncoder : string = 'img_encoder.onnx';
const txtEncoder : string = 'txt_encoder.onnx';
const imgEncoderData : string = 'img_encoder.onnx.data';
const txtEncoderData : string = 'txt_encoder.onnx.data';
const txtTokenizer : string = 'txt_encoder.onnx.data';

const MODEL_MODULES = {
    "img_encoder.onnx": imgEncoder,
    "img_encoder.onnx.data": imgEncoderData,
    "txt_encoder.onnx": txtEncoder,
    "txt_encoder.onnx.data": txtEncoderData,
    "txt_tokenizer.onnx": txtTokenizer,
} as const;

// Change asset to local directory since onnxruntime-react-native requires local directory to run
async function copyModelToLocalDirectory(modelName : string)
{
    // Load asset from loadingModel
    const asset = Asset.fromModule(MODEL_MODULES[modelName]);
    await asset.downloadAsync();

    // Check if loadingModel exists
    if (!asset.localUri) throw new ReferenceError(`${modelName} does not exists.`);

    // Set copy destination
    const src = new File(asset.localUri);
    const dst = new File(Paths.document, `models/${modelName}`);

    // Do not copy if file already exists
    const info = await dst.info();
    if (!info.exists) {
        await src.copy(dst);
    }

    // return file uri due to use in onnxruntime-react-native
    return dst.uri;
}

/**
 * prepares model and returns model path
 *
 * @param modelType type of loading model
 */
export async function prepareModel(modelType : ModelType)
{
    let modelName : string;
    let modelDataName : string;
    let requiresData : boolean = false;

    switch (modelType)
    {
        case ModelType.Image:
            modelName = imgEncoder;
            modelDataName = imgEncoderData;
            requiresData = true;
            break;

        case ModelType.Text:
            modelName = txtEncoder;
            modelDataName = txtEncoderData;
            requiresData = true;
            break;

        case ModelType.TextTokenizer:
            modelName = txtTokenizer;
            requiresData = false;
            break;
    }

    // make models directory if not exists
    const modelsDir = new Directory(Paths.document, "models");
    const dirInfo = await modelsDir.info();
    if (!dirInfo.exists)
    {
        await modelsDir.create({ intermediates: true });
    }

    // load Model
    const model = new File(modelsDir, `models/${modelName}`);
    const info = await model.info();

    // return uri if model exists
    if (info.exists)
    {
        return model.uri;
    }

    // copy model if not exists
    try
    {
        const loadedUri = await copyModelToLocalDirectory(modelName, modelPath);

        if (requiresData)
        {
            await copyModelToLocalDirectory(modelDataName, modelDataPath);
        }

        return loadedUri;
    }
    catch (e)
    {
        console.log(e.message);
    }
}