import * as MediaLibrary from 'expo-media-library'
import * as Database from "@/src/db/database"
import * as Sync from "@/src/db/syncService"
import { CLIPSQLiteVecStore } from "@/src/db/vector/vectorstore"
import { DATABASE_NAME, DISTANCE_THRESHOLD } from "@/src/lib/constants/constants"
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

                    console.log(`photo tag inserted`);
                    return photos;
                })
                // get address hints from azure
                .then(value => {
                    const addresslessItems = value.filter((value) =>
                    {
                        return !value.latitude;
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

        // 🛠️ [수정 후] 배열인지 확인하고 처리 (안전장치 추가)
        const queryText = Array.isArray(entities[context]) 
            ? entities[context].join(" ")       // 배열이면 공백으로 합침
            : String(entities[context] || "");  // 문자열이거나 없으면 문자열로 변환
        const selectedPhotos = await this.vectorStore.similaritySearch(queryText, DISTANCE_THRESHOLD);
        //const selectedPhotos = await this.vectorStore.similaritySearch(entities[context].join(" "), DISTANCE_THRESHOLD);

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