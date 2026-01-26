import * as ort from 'onnxruntime-react-native'

export interface Model
{
    run(input : number[]) : Promise<ort.InferenceSession.OnnxValueMapType>;
    runEnumerate(input : number[][]) : AsyncGenerator<ort.InferenceSession.OnnxValueMapType, void, unknown>;
}