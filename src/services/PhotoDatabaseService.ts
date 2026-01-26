import * as MediaLibrary from 'expo-media-library'
import * as SQLite from 'expo-sqlite';
import * as Database from "@/src/db/database"
import * as Sync from "@/src/db/syncService"
import { CLIPSQLiteVecStore } from "@/src/db/vector/vectorstore"
import { DATABASE_NAME } from "@/src/lib/constants/constants"
import { Photo } from "@/src/lib/types/photo"
import { LabelTagger } from "@/src/db/labelTagger";
import { tagAddress } from "@/src/api/AzureSearchAddressFromTags";

class PhotoDatabaseService
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

    async initialize()
    {
    }

    /**
     * Save Photos to DB and Tag photos and Make Address hints
     */
    async savePhotosToDB()
    {
        for await (const assets of Sync.getGalleryPhotosSync())
        {
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
                    latitude : (item as any).location.latitude ?? null,
                    longitude : (item as any).location.longitude ?? null,
                    address : null,
                    ai_tags : null
                }
            })

            // save photos in vector store
            await this.vectorStore.addPhotos(photo_uris, photo_ids)
                // get Labels from labels.db
                .then((value) =>
                {
                    return LabelTagger.getTags(value);
                })
                // set ai_tags to photos
                .then(value =>
                {
                    const tag_joined = value.map((tags) => tags.join(','));

                    for (const i in photos)
                    {
                        photos[i].ai_tags = tag_joined[i];
                    }

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
        }
    }

    private async searchFirstFromDatabase()
    {

    }

    private async searchAnotherFromDatas()
    {

    }
}