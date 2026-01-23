import { Photo } from '@/src/lib/types/photo'
import { Model } from '@/src/lib/interfaces/model'
import { ModelType } from '@/src/lib/enums/enums'
import * as ort from 'onnxruntime-react-native'
import * as Loader from '@/src/model/loadModel'

export class ModelInferenceSession implements Model
{
    modelType : ModelType;
    session : ort.InferenceSession;
    path : string;
    inputSize : number[];
    inputType : string;
    currentInput : ort.Tensor;
    inputName : string;
    outputName : string;

    constructor(modelType : ModelType, inputSize : number[], inputType : string) {
        this.modelType = modelType;
        this.inputSize = inputSize;
        this.inputType = inputType;
    }

    async initialize()
    {
        this.path = await Loader.prepareModel(this.modelType);
        console.log(`path : ${this.path}`)
        this.session = ort.InferenceSession.create(this.path, { executionProviders: ["cpu"] });
        this.inputName = this.session.inputNames[0];
        this.outputName = this.session.outputNames[0];
    }

    async run(data : number[])
    {
        this.currentInput = new ort.Tensor(this.inputType, data, this.inputSize);
        const outputs = await this.session.run({ [this.inputName] : this.currentInput });
        return outputs;
    }
    async *runEnumerate(datas : number[][])
    {
        for(data of datas)
        {
            this.currentInput = new ort.Tensor(this.inputType, data, this.inputSize);
            const outputs = await this.session.run({ [this.inputName] : this.currentInput });
            yield outputs;
        }
    }
}