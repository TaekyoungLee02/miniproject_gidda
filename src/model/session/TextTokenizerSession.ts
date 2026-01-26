import {PAD_SIZE} from '@/src/lib/constants/constants'
import {ModelType} from '@/src/lib/enums/enums'
import * as ort from 'onnxruntime-react-native'
import * as Loader from '@/src/model/loadModel'


/**
 *  Tokenizes Text
 */
export class TextTokenizerSession
{
    // ort Session
    session : ort.InferenceSession;

    // model local path
    path : string;

    // current encoding input
    currentInput : ort.Tensor;

    // input name that model can read
    inputName : string;

    // output name that model gives
    outputName : string;

    // cpu
    outputLocationName : string;

    // initialize ort.InferenceSession
    async initialize()
    {
        this.path = await Loader.prepareModel(ModelType.TextTokenizer);
        this.session = await ort.InferenceSession.create(this.path, { executionProviders: ["cpu"] });
        this.inputName = this.session.inputNames[0];
        this.outputName = this.session.outputNames[0];
        this.outputLocationName = 'cpuData';
    }

    // pad rest space when return tokenized data
    pad(token : number[])
    {
        return [
            ...token,
            ...Array(Math.max(0, PAD_SIZE - token.length)).fill(0)
        ];
    }

    // tokenizes data
    async run(data : string)
    {
        // Debugged with Object.keys() and Object.entries()
        this.currentInput = new ort.Tensor('string', Array<string>(data));
        const outputs = await this.session.run({ [this.inputName] : this.currentInput });
        return this.pad(outputs[this.outputName][this.outputLocationName]);
    }

    // tokenizes data Array
    async runEnumerate(datas : string[])
    {
        let outputs = []

        for (data of datas)
        {
            this.currentInput = new ort.Tensor('string', Array<string>(data));
            const output = await this.session.run({ [this.inputName] : this.currentInput });
            outputs.push(this.pad(output[this.outputName][this.outputDeviceName]))
        }

        return outputs;
    }
}