import * as SQLite from 'expo-sqlite';
import {VectorStore} from "@langchain/core/vectorstores"
import {ImageEncoder, TextEncoder} from "@/src/model/Model"
import {Photo} from "@/src/lib/types/photo"
import * as Database from "@/src/db/database"

export class CLIPSQLiteVecStore extends VectorStore
{
    db : SQLite.SQLiteDatabase;
    tableName : string;
    dbName : string;

    imageEncoder : ImageEncoder;
    textEncoder : TextEncoder;

    /**
     * constructor. add vector store to db
     *
     * @param database db file
     * @param tableName default : photo_vec
     */
    constructor(database : string, tableName : string = "photo_vec") {
        super();
        this.dbName = database;
        this.imageEncoder = ImageEncoder.getInstance();
        this.textEncoder = TextEncoder.getInstance();
        this.tableName = tableName;
    }

    async initialize()
    {
        this.db = SQLite.openDatabaseSync(this.dbName);

        //console.log(``, SQLite.bundledExtensions)

        const extension = SQLite.bundledExtensions['sqlite-vec'];

        // console.log("db:", this.db);
        // console.log("extension:", extension);


        await this.db.loadExtensionAsync(extension.libPath, extension.entryPoint);

        // this.db.execSync(`
        //     DROP TABLE IF EXISTS photo_vec;
        // `);
        this.db.execSync(`
            CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName} USING vec0(
                embedding float[512] distance=cosine
            );
        `);
    }

    _vectorstoreType(): string
    {
        return "sqlite-vec";
    }

    async addVectors(vectors: number[], rowIds : number[], options?: AddDocumentOptions)
    {
        if (!this.db) await this.initialize();

        const chunked: any[] = [];
        let index = 0;
        let size = 512;

        while (index < vectors.length) {
            chunked.push(vectors.slice(index, index + size));
            index += size;
        }

        this.db.withTransactionSync(() =>
        {
            const deleteStatement = this.db.prepareSync(`
                DELETE FROM ${this.tableName} WHERE rowid = ?;
            `);
            const statement = this.db.prepareSync(`
                INSERT INTO ${this.tableName}(rowid, embedding)
                VALUES (?, ?);
            `);

            for (let i = 0; i < chunked.length; i ++)
            {
                try
                {
                    const rowId = rowIds[i];
                    const vector = JSON.stringify(Array.from(chunked[i]));

                    deleteStatement.executeSync([rowId]);
                    statement.executeSync([rowId, vector]);
                }
                catch (e) {}
            }
            statement.finalizeSync();
        });

        return chunked;
    }

    async addPhotos(imageURIs: string[], rowIds : number[], options?: AddDocumentOptions)
    {
        const vectors = await this.imageEncoder.runAll(imageURIs, imageURIs.length) as Float32Array[];
        const chunked = await this.addVectors(vectors, rowIds);
        console.log(`photo vector stored. vector size : `, chunked.length)
        return chunked;
    }

    async delete(rowIDs: number[])
    {
        if (!this.db) await this.initialize();

        for (let rowID of rowIDs)
        {
            this.db.runSync(`
                DELETE FROM ${this.tableName} WHERE rowid = ?`,
                [rowID]
            );
        }
    }

    async similaritySearchVectorWithScore(query: number[], threshold : number, k?: number)
    {
        if (!this.db) await this.initialize();

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
            const queryVector = JSON.stringify(Array.from(query));
            if (!k) k = 100;
            const rows = statement
                .executeSync([queryVector, k, threshold])
                .getAllSync();


            const placeholders = rows.map(() => "?").join(",");
            const photos = this.db
                .getAllSync<Photo>(`
                SELECT * 
                FROM photos
                WHERE id IN (${placeholders})
            `, rows.map((row : any) => row.rowid));

            const photoMap = new Map();

            photos.map(p => {
                photoMap[p.id] = p;
            });

            const result = rows.map((row) => {
                return {
                    photo: photoMap[row.rowid],
                    similarity: 1 - row.distance
                }
            })

            console.log(``, result)
            return result;

            //
            // console.log(`rows`, photoMap)
            //
            // return rows.map((row: any) => {
            //     return {
            //         photo: photoMap.get(row.rowid),
            //         similarity: 1 - row.distance
            //     }
            // });
        }
        finally
        {
            statement.finalizeSync();
        }
    }

    async similaritySearch(query: string, threshold : number, k?: number)
    {
        const queryVec = await this.textEncoder.run(query) as Float32Array;
        Database.saveSearchHistory(query);
        return await this.similaritySearchVectorWithScore(queryVec, threshold, k);
    }
}