import { File, Paths, Directory } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { ModelType } from '@/src/lib/enums/enums'
import * as Constants from '@/src/lib/constants/constants'

/** Change asset to local directory since onnxruntime-react-native requires local directory to run
 *
 * @param modelName Filename of the Model which wants to load
 */
async function copyModelToLocalDirectory(modelName : string)
{
    // Load asset from modelName
    const asset = Asset.fromModule(Constants.MODEL_MODULES[modelName]);

    // downloadAsync() copies model from assets to local directory
    await asset.downloadAsync();

    // Check if model copy successes
    if (!asset.localUri) throw new ReferenceError(`${modelName} does not exists.`);

    // Set move destination
    const src = new File(asset.localUri);
    const dst = new File(Paths.document, `models/${modelName}`);

    // Do not move if file already exists
    const info = dst.info();
    if (!info.exists) {
        src.move(dst);
    }

    // return file uri due to use in onnxruntime-react-native
    return dst.uri;
}

/**
 * Prepares Model and returns Model path
 *
 * @param modelType type of loading Model
 */
export async function prepareModel(modelType : ModelType)
{
    let modelName : string;
    let modelDataName : string | undefined;

    // Set Model path from Constants
    switch (modelType)
    {
        case ModelType.Image:
            modelName = Constants.imgEncoder;
            break;

        case ModelType.Text:
            modelName = Constants.txtEncoder;
            modelDataName = Constants.txtEncoderData;
            break;

        case ModelType.TextTokenizer:
            modelName = Constants.txtTokenizer;
            break;
    }

    // Make /models directory if not exists
    const modelsDir = new Directory(Paths.document, "models");
    const dirInfo = modelsDir.info();
    if (!dirInfo.exists)
    {
        modelsDir.create({ intermediates: true });
    }

    // Check if model already exists
    const model = new File(modelsDir, `${modelName}`);
    const info = model.info();

    const modelData = new File(modelsDir, `${modelDataName}`);
    const dataInfo = modelData.info();

    // return uri if model exists
    const ready = modelDataName
        ? info.exists && dataInfo.exists
        : info.exists;

    if (ready)
    {
        console.log(`model uri : ${model.uri}`)
        return model.uri;
    }


    // copy model if not exists
    try
    {
        // Model file
        const loadedUri = await copyModelToLocalDirectory(modelName);
        console.log(`loadedUri : ${loadedUri}`)

        // Data file (if needed)
        if (modelDataName)
        {
            const loadedData = await copyModelToLocalDirectory(modelDataName);
            console.log(`loadedData : ${loadedData}`)
        }

        return loadedUri;
    }
    catch (e)
    {
        console.log(e.message);
    }
}