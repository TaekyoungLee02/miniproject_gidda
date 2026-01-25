import {useRouter} from "expo-router";
import {useEffect, useState} from "react";
import {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from "react-native-reanimated";
import {ImageProcessorService} from "@/src/utils/image/ImageProcessor";
import * as FileSystem from 'expo-file-system'
import {ImageEncoder} from "@/src/model/Model";


// for test, add 'return <Redirect href="/clip" />' to main index.tsx


export default function TestScreen()
{
    const ipp = new ImageProcessorService();

    useEffect(() => {
        const fdc = async () =>
        {

            //const b = await new FileSystem.File.downloadFileAsync("https://picsum.photos/id/1011/400/500", new FileSystem.Directory(FileSystem.Paths.cache));
            let b = new FileSystem.File(new FileSystem.Directory(FileSystem.Paths.cache, "500.jpg"));

            if (!b.exists)
            {
                b = await new FileSystem.File.downloadFileAsync("https://picsum.photos/id/1011/400/500", new FileSystem.Directory(FileSystem.Paths.cache));
            }

            const preprocessed = await ipp.processForMobileClip(b.uri);

            const imageEncoder = new ImageEncoder();
            await imageEncoder.initialize();
            const result = await imageEncoder.run(Array.from(preprocessed))
            console.log(`result : ${result.length}`)
        }

        fdc();

    }, []);
}