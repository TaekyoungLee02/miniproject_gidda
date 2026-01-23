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

    run(input : string)
    {
        data = this.tokenizer.run(input)
        return super.run(data);
    }

    runEnumerate(input : string[][])
    {
        datas = this.tokenizer.runEnumerate(input);
        return super.runEnumerate(datas);
    }
}