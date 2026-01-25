import {useRouter} from "expo-router";
import {useEffect, useState} from "react";
import {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from "react-native-reanimated";
import {ImageProcessorService} from "@/src/utils/image/ImageProcessor";
import * as FileSystem from 'expo-file-system'
import {ImageEncoder, TextEncoder} from "@/src/model/Model";


// for test, add 'return <Redirect href="/clip" />' to main index.tsx


export default function TestScreen()
{
    const ipp = new ImageProcessorService();
    const imageEncoder = new ImageEncoder();
    const textEncoder = new TextEncoder();

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

            await imageEncoder.initialize();
            const result = await imageEncoder.run(Array.from(preprocessed))
            console.log(`result : ${result.length}`)
        }

        imageTest();

    }, []);

    useEffect(() => {

        const textTest = async () =>
        {
            await textEncoder.initialize();
            const result = await textEncoder.run('hello');
            console.log(`result : ${result.length}`)
        }

        textTest();
    }, []);
}