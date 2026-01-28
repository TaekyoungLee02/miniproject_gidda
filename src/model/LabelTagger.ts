import { File, Directory, Paths } from 'expo-file-system'
import { Asset } from 'expo-asset'
import * as SQLite from 'expo-sqlite';
import {Photo} from "@/src/lib/types/photo";

const THRESHOLD_LABEL : number = 1.25;

export class LabelTagger
{
    private static db : SQLite.SQLiteDatabase;

    static async getDB()
    {
        const dbFile = new File(new Directory(Paths.document, "SQLite/labels.db"));
        if (!dbFile.exists)
        {
            const dbAsset = Asset.fromModule(require('../../assets/db/labels.db'))
            await dbAsset.downloadAsync();

            // Check if model copy successes
            if (!dbAsset.localUri) throw new ReferenceError(`db does not exists.`);
            const src = new File(dbAsset.localUri);
            const dst = new File(Paths.document, "SQLite/labels.db");
            src.move(dst);
        }

        if (!this.db)
        {
            this.db = await SQLite.openDatabaseAsync('labels.db');
            const extension = SQLite.bundledExtensions['sqlite-vec'];
            await this.db.loadExtensionAsync(extension.libPath, extension.entryPoint);
        }
        return this.db;
    }

    static async getTags(imageVectors : number[][])
    {
        const tags : string[][] = [];
        await this.getDB();

        this.db.withTransactionSync(() =>
        {
            const statement = this.db.prepareSync(`
                SELECT 
                    rowid
                FROM vec_labels
                WHERE embedding MATCH ? 
                    AND distance < ?
                    AND k = 10
            `);

            try
            {
                for (const vector of imageVectors)
                {
                    const rows = statement
                        .executeSync([JSON.stringify(Array.from(vector)), THRESHOLD_LABEL])
                        .getAllSync();

                    const placeholders = rows.map(() => "?").join(",");
                    const ids = rows.map((row) => row.rowid);

                    const results = this.db
                        .getAllSync<string>(`
                        SELECT label 
                        FROM labels
                        WHERE id IN (${placeholders})
                    `, ids);

                    const labels = results.map((result) => result.label)

                    // console.log(``, labels)

                    tags.push(labels)
                }
            }
            catch (e)
            {
                console.error(`${e}`)
                throw e;
            }
        });

        console.log(`label tag finished.`)

        return tags;
    }
}