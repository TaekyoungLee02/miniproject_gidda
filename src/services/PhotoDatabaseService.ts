import * as MediaLibrary from 'expo-media-library'
import * as Database from "@/src/db/database"
import * as Sync from "@/src/db/syncService"
import { CLIPSQLiteVecStore } from "@/src/db/vector/vectorstore"
import { DATABASE_NAME, DISTANCE_THRESHOLD, DISTANCE_THRESHOLD_SPACE } from "@/src/lib/constants/constants"
import { Photo } from "@/src/lib/types/photo"
import { LabelTagger } from "@/src/model/LabelTagger";
import { tagAddress } from "@/src/api/azure";
import { SearchType } from "@/src/lib/enums/enums";

export class PhotoDatabaseService
{
    private static instance : PhotoDatabaseService;
    vectorStore : CLIPSQLiteVecStore;

    constructor() {
        this.vectorStore = new CLIPSQLiteVecStore(DATABASE_NAME);
        Sync.registerPhotoLibraryListener(() => this.savePhotosToDB());
    }

    static getInstance()
    {
        return this.instance || (this.instance = new this());
    }

    /**
     * Save Photos to DB and Tag photos and Make Address hints
     */
    async *savePhotosToDB()
    {
        await Database.initDB();
        let cnt : number = 0;

        for await (const assets of Sync.getGalleryPhotosSync())
        {
            cnt += assets.length;
            const photoAssets = assets as MediaLibrary.Asset[];
            const photo_uris = photoAssets.map((item) => item.uri);
            const photo_ids = photoAssets.map((item) => Number(item.id));

            // convert asset to photo
            const photos = photoAssets.map((item) : Photo =>
            {
                return {
                    id : item.id,
                    local_uri : item.uri,
                    captured_at : item.creationTime || Date.now(),
                    width : item.width,
                    height : item.height,
                    latitude : (item as any).location ? (item as any).location.latitude : null,
                    longitude : (item as any).location ? (item as any).location.longitude : null,
                    address : null,
                    ai_tags : null
                }
            })

            // save photos in vector store
            await this.vectorStore.addPhotos(photo_uris, photo_ids)
                // get Labels from labels.db
                .then((value) =>
                {
                    console.log(`store successed`, value.length)
                    return LabelTagger.getTags(value);
                })
                // set ai_tags to photos
                .then(value =>
                {
                    const tag_joined = value.map((tags) => tags.join(', '));

                    for (const i in photos)
                    {
                        photos[i].ai_tags = tag_joined[i];
                    }

                    const tagged_photos = photos.filter((p, i, a) => p.ai_tags != "");

                    const tags = tagged_photos.map((v) => v.ai_tags);
                    const ids = tagged_photos.map((v) => Number(v.id));
                    console.log(`photo tag inserted`);

                    return this.vectorStore.addTags(tags, ids);
                })
                // get address hints from azure
                .then(value =>
                {
                    const addresslessItems = photos.filter((photo) =>
                    {
                        return !photo.latitude;
                    });

                    return tagAddress(addresslessItems);
                })
                // input to database
                .then(value =>
                {
                    Database.insertPhotoAll(photos);
                });

            yield { progress:cnt / Sync.gallery_photos_amount, assets: assets };
        }
    }

    async searchPhoto(entities : string[], weights : string[])
    {
        const context = SearchType.Context;

        // const weight_numbers : number[] = [];
        // weight_numbers.push(weights["0"]);
        // weight_numbers.push(weights["1"]);
        // weight_numbers.push(weights["2"]);
        //
        // const max = Math.max(...weight_numbers);
        // const maxIndex = weight_numbers.indexOf(max);
        //
        // let selectedPhotos;
        //
        // switch (maxIndex)
        // {
        //     case SearchType.Context:
        //         selectedPhotos = await this.vectorStore.similaritySearch(entities[maxIndex], DISTANCE_THRESHOLD);
        //         break;
        //
        //     case SearchType.Time:
        //         selectedPhotos = await Database.searchPhotoByTime(entities[maxIndex])
        //         break;
        //
        //     case SearchType.Space:
        //         selectedPhotos = await this.vectorStore.similaritySearchByTags(entities[maxIndex], DISTANCE_THRESHOLD_SPACE);
        //         break;
        // }

        const selectedPhotos = await this.vectorStore.similaritySearch(entities[context].join(" "), DISTANCE_THRESHOLD);

        // const pt = selectedPhotos.map((item) => item.photo);
        //
        // console.log(``, selectedPhotos)
        // console.log(``, pt)
        return selectedPhotos;
    }

    private async searchFirstFromDatabase()
    {

    }

    private async searchAnotherFromDatas()
    {

    }
}