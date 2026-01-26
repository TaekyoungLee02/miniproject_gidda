import * as MediaLibrary from 'expo-media-library'
import * as SQLite from 'expo-sqlite';
import * as Database from "@/src/db/database"
import * as Sync from "@/src/db/syncService"
import { CLIPSQLiteVecStore } from "@/src/db/vector/vectorstore"
import { DATABASE_NAME } from "@/src/lib/constants"
import { Photo } from "@/src/lib/types/photo"
import {insertPhotoAllFromAsset} from "../db/database";
import { LabelLoader } from "@/src/db/labelLoader";
import {getGalleryPhotosSync} from "@/src/db/syncService";

class PhotoDatabaseService
{
    private static instance : PhotoDatabaseService;
    vectorStore : CLIPSQLiteVecStore;
    label : SQLite.SQLiteDatabase;


    constructor() {
        this.vectorStore = new CLIPSQLiteVecStore('photo.db');
        Sync.registerPhotoLibraryListener(() => this.savePhotosToDB());
    }

    static getInstance()
    {
        return this.instance || (this.instance = new this());
    }

    async initialize()
    {
        this.label = await LabelLoader.getDB();
    }

    async savePhotosToDB()
    {
        if (!this.label) await this.initialize();

        for await (const assets of Sync.getGalleryPhotosSync())
        {
            const photos = assets as MediaLibrary.Asset[];
            const photo_uris = photos.map((item) => item.uri);
            const photo_ids = photos.map((item) => Number(item.id));


            const vectorTask = this.vectorStore.addPhotos(photo_uris, photo_ids)

            const insertTask = Database.insertPhotoAllFromAsset(photos)

            try
            {
                const finished = await Promise.all([vectorTask, insertTask])
            }

        }
    }

    private async searchFirstFromDatabase()
    {

    }

    private async searchAnotherFromDatas()
    {

    }
}