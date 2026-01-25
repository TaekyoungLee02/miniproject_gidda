import { ModelType } from '@/src/lib/enums/enums'
import { TextTokenizerSession } from '@/src/model/session/TextTokenizerSession'
import * as Session from '@/src/model/session/ModelInferenceSession'

/**
 *  Encodes Images
 */
export class ImageEncoder extends Session.ModelInferenceSession
{
    constructor() {
        super(ModelType.Image, [1, 3, 256, 256], "float32");
    }
}


/**
 *  Encodes Texts
 */
export class TextEncoder extends Session.ModelInferenceSession
{
    // text tokenizer session
    tokenizer : TextTokenizerSession;

    constructor() {
        super(ModelType.Text, [1, 77], "int64");
        this.tokenizer = new TextTokenizerSession();
    }

    async initialize(): Promise<void> {
        await super.initialize();
        await this.tokenizer.initialize();
    }

    async run(input : string)
    {
        let data = await this.tokenizer.run(input)
        return await super.run(data);
    }

    async runEnumerate(input : string[])
    {
        let datas = await this.tokenizer.runEnumerate(input);
        return super.runEnumerate(datas);
    }
}