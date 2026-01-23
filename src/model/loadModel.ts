import { File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { ModelType } from '@/src/lib/enums/enums'
import * as Constants from '@/src/lib/constatnts/constants'

const imgModel : string = 'img_encoder.onnx';
const txtModel : string = 'txt_encoder.onnx';
const imgModelData : string = 'img_encoder.onnx.data';
const txtModelData : string = 'txt_encoder.onnx.data';
const imgModelPath : string = `./asset/models/img_encoder/img_encoder.onnx`;
const imgModelDataPath : string = `./asset/models/img_encoder/img_encoder.onnx.data`;
const txtModelPath : string = `./asset/models/txt_encoder/txt_encoder.onnx`;
const txtModelDataPath : string = `./asset/models/txt_encoder/txt_encoder.onnx.data`;

// Change asset to local directory since onnxruntime-react-native requires local directory to run
async function copyModelToLocalDirectory(loadingModel : string, modelPath : string)
{
    // Load asset from loadingModel
    const asset = Asset.fromModule(require(loadingModel));
    await asset.downloadAsync();

    // Check if loadingModel exists
    if (!asset.localUri) throw new ReferenceError(`${loadingModel} does not exists.`);

    // Set copy destination
    const src = new File(asset.localUri);
    const dst = new File(Paths.document, `models/${loadingModel}`);

    // Do not copy if file already exists
    const info = await dst.info();
    if (!info.exists) {
        await src.copy(dst);
    }

    // return file uri due to use in onnxruntime-react-native
    return dst.uri;
}

async function prepareModel(modelType : ModelType)
{
    let modelName : string;
    let modelPath : string;
    let modelDataName : string;
    let modelDataPath : string;
    let requiresData : boolean = false;

    switch (modelType)
    {
        case ModelType.Image:
            modelName = imgModel;
            modelPath = imgModelPath;
            modelDataName = imgModelData;
            modelDataPath = imgModelDataPath;
            requiresData = true;
            break;

        case ModelType.Text:
            modelName = txtModel;
            modelPath = txtModelPath;
            modelDataName = txtModelData;
            modelDataPath = txtModelDataPath;
            requiresData = true;
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