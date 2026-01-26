import { ModelType } from '@/src/lib/enums/enums'
import { TextTokenizerSession } from '@/src/model/session/TextTokenizerSession'
import * as Session from '@/src/model/session/ModelInferenceSession'

/**
 *  Encodes Images
 */
export class ImageEncoder extends Session.ModelInferenceSession
{
    // Singleton
    private static instance : ImageEncoder;

    private constructor() {
        super(ModelType.Image, [1, 3, 256, 256], "float32");
    }

    // get instance
    public static getInstance(): ImageEncoder
    {
        return this.instance || (this.instance = new this())
    }
}


/**
 *  Encodes Texts
 */
export class TextEncoder extends Session.ModelInferenceSession
{
    // Singleton
    private static instance : TextEncoder;

    // text tokenizer session
    tokenizer : TextTokenizerSession;

    constructor() {
        super(ModelType.Text, [1, 77], "int64");
        this.tokenizer = new TextTokenizerSession();
    }

    // get instance
    public static getInstance(): TextEncoder
    {
        return this.instance || (this.instance = new this())
    }

    async initialize(): Promise<void> {
        await super.initialize();
    }

    async run(input : string)
    {
        if (!this.tokenizer.session) await this.tokenizer.initialize();

        let data = await this.tokenizer.run(input)
        return await super.run(data);
    }

    async runEnumerate(input : string[])
    {
        if (!this.tokenizer.session) await this.tokenizer.initialize();

        let datas = await this.tokenizer.runEnumerate(input);
        return super.runEnumerate(datas);
    }
}