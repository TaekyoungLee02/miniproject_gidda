import {Model} from '@/src/lib/interfaces/model'
import {ModelType} from '@/src/lib/enums/enums'
import * as ort from 'onnxruntime-react-native'
import * as Loader from '@/src/model/loadModel'

/**
 *  Parent of our ModelInferenceSession Classes
 */
export abstract class ModelInferenceSession implements Model
{
    // type of model
    modelType : ModelType;

    // ort Session
    session : ort.InferenceSession;

    // model local path
    path : string;

    // model input size
    inputSize : number[];

    // model input type (ex. float32, int64)
    inputType : string;

    // current encoding input
    currentInput : ort.Tensor;

    // input name that model can read
    inputName : string;

    // output name that model gives
    outputName : string;

    // cpu
    outputLocationName : string;

    constructor(modelType : ModelType, inputSize : number[], inputType : string) {
        this.modelType = modelType;
        this.inputSize = inputSize;
        this.inputType = inputType;
        this.outputLocationName = 'cpuData';
    }

    // initialize ort.InferenceSession
    async initialize()
    {
        this.path = await Loader.prepareModel(this.modelType);
        console.log(`path : ${this.path}`)
        this.session = await ort.InferenceSession.create(this.path, { executionProviders: ["cpu"] });
        this.inputName = this.session.inputNames[0];
        this.outputName = this.session.outputNames[0];
    }

    // get encoded vector
    async run(data : number[])
    {
        console.log(`${data.length}`)
        this.currentInput = new ort.Tensor(this.inputType, data, this.inputSize);
        const output = await this.session.run({[this.inputName]: this.currentInput});
        return output[this.outputName][this.outputLocationName]
    }

    // get encoded vector Enumerate
    async *runEnumerate(datas : number[][])
    {
        for(data of datas)
        {
            this.currentInput = new ort.Tensor(this.inputType, data, this.inputSize);
            const output = await this.session.run({ [this.inputName] : this.currentInput });
            yield output[this.outputName][this.outputLocationName];
        }
    }
}