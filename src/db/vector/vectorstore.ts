import * as SQLite from 'expo-sqlite';
<<<<<<< HEAD
import { VectorStore } from "@langchain/core/vectorstores"
import { ImageEmbeddings, TextEmbeddings } from "@/src/db/langchain/embedding"
import { Photo } from "@/src/lib/types/photo"
=======
import {VectorStore} from "@langchain/core/vectorstores"
import {ImageEncoder, TextEncoder} from "@/src/model/Model"
import {Photo} from "@/src/lib/types/photo"
>>>>>>> 7341a23 ([FIX] Bug Fixes)
import * as Database from "@/src/db/database"

export class CLIPSQLiteVecStore extends VectorStore
{
    db : SQLite.SQLiteDatabase;
    tableName : string;

    imageEmbeddings : ImageEmbeddings;
    textEmbeddings : TextEmbeddings;

    /**
     * constructor. add vector store to db
     *
     * @param database db file
     * @param tableName default : photo_vec
     */
    constructor(database : string, tableName : string = "photo_vec") {
        super();
<<<<<<< HEAD
        this.imageEmbeddings = new ImageEmbeddings();
        this.textEmbeddings = new TextEmbeddings();
=======
        this.imageEncoder = ImageEncoder.getInstance();
        this.textEncoder = TextEncoder.getInstance();
>>>>>>> 7341a23 ([FIX] Bug Fixes)
        this.db = SQLite.openDatabaseSync(database);
        this.tableName = tableName;

        this.db.execSync(`
            CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(
                embedding float[512]
            );
        `);
    }

    _vectorstoreType(): string
    {
        return "sqlite-vec";
    }

    async addVectors(vectors: Float32Array[], rowIds : number[], options?: AddDocumentOptions)
    {
        this.db.withTransactionSync(() =>
        {
            const statement = this.db.prepareSync(`
                    INSERT OR REPLACE INTO ${this.tableName}(rowid, embedding) VALUES (?, ?)
                `);

            try
            {
                for (let i = 0; i < vectors.length; i ++)
                {
                    const vector = vectors[i];
                    const rowId = rowIds[i];

                    statement.executeSync([rowId, vector]);
                }
            }
            catch (e)
            {
                console.error(`vector store addVectors error occurred : ${e.message}`);

                throw e;
            }
            finally
            {
                statement.finalizeSync();
            }
        });
    }

    async addPhotos(imageURIs: string[], rowIds : number[], options?: AddDocumentOptions)
    {
        const vectors = await this.imageEmbeddings.embedDocuments(imageURIs);
        await this.addVectors(vectors, rowIds);
    }

    async delete(rowIDs: number[])
    {
        for (let rowID of rowIDs)
        {
            this.db.runSync(`
                DELETE FROM ${this.tableName} WHERE rowid = ?`,
                [rowID]
            );
        }
    }

    async similaritySearchVectorWithScore(query: number[], threshold : number, k?: number): Promise<[Photo, number][]>
    {
        const statement = this.db.prepareSync(`
                SELECT 
                    rowid, 
                    distance 
                FROM ${this.tableName}
                WHERE embedding MATCH ? 
                    AND k = ?
                    AND distance < ?
            `);

        try
        {
            const queryVector = new Float32Array(query);
            if (!k) k = 100;
            const rows = statement
                .executeSync([queryVector, k, threshold])
                .getAllSync();

            const placeholders = rowIds.map(() => "?").join(",");
            const photos = this.db
                .getAllSync<Photo>(`
                SELECT * 
                FROM photos
                WHERE id IN (${placeholders})
            `, rowIds);
            const photoMap = new Map(photos.map(p => [p.id, p]));

            return rows.map((row: any) => [
                photoMap.get(row.rowid),
                1 - row.distance
            ]);
        }
        finally
        {
            statement.finalizeSync();
        }
    }

    async similaritySearch(query: string, threshold : number, k?: number): Promise<[Photo, number][]>
    {
<<<<<<< HEAD
        const queryVec = await this.textEmbeddings.embedQuery(query);
=======
        const queryVec = await this.textEncoder.run(query) as Float32Array;
        Database.saveSearchHistory(query);
>>>>>>> 7341a23 ([FIX] Bug Fixes)
        return await this.similaritySearchVectorWithScore(queryVec, threshold, k);
    }
}