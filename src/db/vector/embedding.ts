import { EmbeddingsInterface } from "@langchain/core/embeddings"
import { ImageEncoder, TextEncoder } from "@/src/model/Model"

export class ImageEmbeddings implements EmbeddingsInterface
{
    imageEncoder : ImageEncoder;

    constructor() {
        this.imageEncoder = ImageEncoder.getInstance();
    }

    async embedDocuments(imageURIs : string[])
    {
        let outputs : Float32Array[] = [];
        for await(let embeddings of this.imageEncoder.runEnumerate(images))
        {
            outputs.push(embeddings as Float32Array);
        }
        return outputs;
    }

    async embedQuery(imageURI : string)
    {
        return this.imageEncoder.run(image) as Float32Array;
    }
}

export class TextEmbeddings implements EmbeddingsInterface
{
    textEncoder : TextEncoder;

    constructor() {
        this.textEncoder = TextEncoder.getInstance();
    }

    async embedDocuments(texts : string[])
    {
        let outputs : Float32Array[] = [];
        for await(let embeddings of this.textEncoder.runEnumerate(texts))
        {
            outputs.push(embeddings as Float32Array);
        }
        return outputs;
    }

    async embedQuery(text : string)
    {
        return this.textEncoder.run(text) as Float32Array;
    }
}