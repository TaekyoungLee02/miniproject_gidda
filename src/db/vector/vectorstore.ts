import * as SQLite from 'expo-sqlite';
import { VectorStore } from "@langchain/core/vectorstores"
import { ImageEncoder, TextEncoder } from "@/src/model/Model"
import { Photo } from "@/src/lib/types/photo"
import * as Database from "@/src/db/database"

export class CLIPSQLiteVecStore extends VectorStore
{
    db : SQLite.SQLiteDatabase;
    tableName : string;

    imageEncoder : ImageEncoder;
    textEncoder : TextEncoder;

    /**
     * constructor. add vector store to db
     *
     * @param embeddings embeddings encoder
     * @param database db file
     * @param tableName default : photo_vec
     */
    constructor(database : string, tableName : string = "photo_vec") {
        super();
        this.imageEncoder = new ImageEncoder.getInstance();
        this.textEncoder = new TextEncoder.getInstance();
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
        const vectors = await this.imageEncoder.runAll(imageURIs, imageURIs.length) as Float32Array[];
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
        const statement = await this.db.prepareSync(`
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
            const rows = await statement
                .executeSync([queryVector, k, threshold])
                .getAllSync();

            const placeholders = rowIds.map(() => "?").join(",");
            const photos = await this.db
                .getAllSync<Photo>(`
                SELECT * 
                FROM photos
                WHERE id IN (${placeholders})
            `, rowIds);
            const photoMap = new Map(photos.map(p => [p.id, p]));

            Database.saveSearchHistory(query);

            const photoWithScores : [Photo, number][] = rows.map((row) => [
                photoMap.get(row.rowid),
                1 - row.distance
            ]);
            return photoWithScores;
        }
        finally
        {
            statement.finalizeSync();
        }
    }

    async similaritySearch(query: string, threshold : number, k?: number): Promise<[Photo, number][]>
    {
        const queryVec = await this.textEncoder.run(query) as Float32Array;
        return await this.similaritySearchVectorWithScore(queryVec, threshold, k);
    }
}