import {useEffect} from "react";
import {ImageProcessorService} from "@/src/utils/image/ImageProcessor";
import * as FileSystem from 'expo-file-system'
import {ImageEncoder, TextEncoder} from "@/src/model/Model";


// for test, add 'return <Redirect href="/clip" />' to main index.tsx


export default function TestScreen()
{
    const ipp = new ImageProcessorService();
    const imageEncoder = ImageEncoder.getInstance();
    const textEncoder = TextEncoder.getInstance();

    useEffect(() => {

        const imageTest = async () =>
        {
            //const image = await new FileSystem.File.downloadFileAsync("https://picsum.photos/id/1011/400/500", new FileSystem.Directory(FileSystem.Paths.cache));
            let image = new FileSystem.File(new FileSystem.Directory(FileSystem.Paths.cache, "500.jpg"));

            if (!image.exists)
            {
                image = await new FileSystem.File.downloadFileAsync("https://picsum.photos/id/1011/400/500", new FileSystem.Directory(FileSystem.Paths.cache));
            }

            const preprocessed = await ipp.processForMobileClip(image.uri);

            const result = await imageEncoder.run(preprocessed)
            console.log(`result_image : ${result.length}`);
        }

        const textTest = async () =>
        {
            const result = await textEncoder.run('hello');
            console.log(`result_text : ${result.length}`);
        }

        const test = async () =>
        {
            await imageTest();
            await textTest();
        }

        test();
    }, []);
}