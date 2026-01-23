import { ModelType } from '@/src/lib/enums/enums'
import { TextTokenizerSession } from '@/src/model/session/TextTokenizerSession'
import * as Session from '@/src/model/session/ModelInferenceSession'

export class ImageEncoder extends Session.ModelInferenceSession
{
    constructor() {
        super(ModelType.Image, [1, 3, 256, 256], "float32");
    }
}

export class TextEncoder extends Session.ModelInferenceSession
{
    tokenizer : TextTokenizerSession;

    constructor() {
        super(ModelType.Text, [1, 77], "int64");
        this.tokenizer = new TextTokenizerSession();
    }

    async run(input : string)
    {
        data = await this.tokenizer.run(input)
        return super.run(data);
    }

    async runEnumerate(input : string[][])
    {
        datas = await this.tokenizer.runEnumerate(input);
        return super.runEnumerate(datas);
    }
}