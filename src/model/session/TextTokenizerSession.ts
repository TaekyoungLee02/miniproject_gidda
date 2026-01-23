import { Model } from '@/src/lib/interfaces/model'
import { ModelType } from '@/src/lib/enums/enums'
import * as ort from 'onnxruntime-react-native'
import * as Loader from '@/src/model/loadModel'

export class TextTokenizerSession
{
    session : ort.InferenceSession;
    path : string;
    currentInput : ort.Tensor;
    inputName : string;
    outputName : string;

    constructor() {
        this.path = Loader.prepareModel(ModelType.TextTokenizer);
        this.session = ort.InferenceSession.create(this.path, { executionProviders: ["cpu"] });
        this.inputName = this.session.inputNames[0];
        this.outputName = this.session.outputNames[0];
    }

    pad(token : number[])
    {


    }

    async run(data : string)
    {
        this.currentInput = new ort.Tensor('string', data);
        const outputs = await this.session.run({ [this.inputName] : this.currentInput });
        return outputs[0];
    }

    async run(datas : string[])
    {
        outputs = [];
        for(data of datas)
        {
            this.currentInput = new ort.Tensor('string', data);
            const output = await this.session.run({ [this.inputName] : this.currentInput });
            console.log(output);
            outputs.push(output[0]);
        }

        return outputs;
    }
}