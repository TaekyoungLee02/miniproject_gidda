import { ModelType } from '@/src/lib/enums/enums'
import { TextTokenizerSession } from '@/src/model/session/TextTokenizerSession'
import { ImageProcessorService } from "@/src/utils/image/ImageProcessor"
import * as Session from '@/src/model/session/ModelInferenceSession'

/**
 *  Encodes Images
 */
export class ImageEncoder extends Session.ModelInferenceSession
{
    // Singleton
    private static instance : ImageEncoder;

    imagePreprocessor : ImageProcessorService;

    private constructor() {
        super(ModelType.Image, [3, 256, 256], "float32");
        this.imagePreprocessor = new ImageProcessorService();
    }

    // get instance
    public static getInstance(): ImageEncoder
    {
        return this.instance || (this.instance = new this());
    }

    async run(uri : string)
    {
        let preprocessed = await this.imagePreprocessor.processForMobileClip(uri);
        console.log(`pps ${preprocessed.length}`)
        return await super.run(preprocessed);
    }

    async runAll(uris: string[], batchSize : number)
    {
        let inputs : Float32Array = new Float32Array(0);
        let preprocessed = await this.imagePreprocessor.processForMobileClipAll(uris);

        console.log(`image preprocessed. model run. batch size : `, preprocessed.length);

        for (const vector of preprocessed)
        {
            // concat Float32Array
            const out = new Float32Array(inputs.length + vector.length);

            out.set(inputs, 0);
            out.set(vector, inputs.length);

            inputs = out;
        }
        console.log(`image vector concat : `, inputs.length);
        return await super.runAll(inputs, batchSize);
    }

    async runEnumerate(uris : string[])
    {
        let preprocessed = [];
        for(let uri of uris)
        {
            preprocessed.push(await this.imagePreprocessor.processForMobileClip(uri));
        }
        return super.runEnumerate(preprocessed);
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
        super(ModelType.Text, [77], "int64");
        this.tokenizer = new TextTokenizerSession();
    }

    // get instance
    public static getInstance(): TextEncoder
    {
        return this.instance || (this.instance = new this());
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