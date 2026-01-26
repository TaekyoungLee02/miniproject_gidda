import { File, Directory, Paths } from 'expo-file-system'
import { Asset } from 'expo-asset'
import * as SQLite from 'expo-sqlite';
import {Photo} from "@/src/lib/types/photo";

const THRESHOLD_LABEL : number = 0.3;

export class LabelTagger
{
    private static db : SQLite.SQLiteDatabase;

    static async getDB()
    {
        const dbFile = new File(new Directory(Paths.document, "SQLite/labels.db"));
        if (!dbFile.exists)
        {
            const dbAsset = Asset.fromModule(require('./assets/db/labels.db'))
            await dbAsset.downloadAsync();

            // Check if model copy successes
            if (!dbAsset.localUri) throw new ReferenceError(`${modelName} does not exists.`);
            const src = new File(dbAsset.localUri);
            const dst = new File(Paths.document, "SQLite/labels.db");
            src.move(dst);
        }

        if (!this.db)
        {
            this.db = await SQLite.openDatabaseAsync('labels.db');
        }
        return this.db;
    }

    static async getTags(imageVectors : Float32Array[])
    {
        const tags : string[][] = [];

        this.db.withTransactionSync(() =>
        {
            const statement = this.db.prepareSync(`
                SELECT 
                    rowid
                FROM vec_labels
                WHERE embedding MATCH ? 
                    AND distance < ?
            `);

            try
            {
                for (const vector of imageVectors)
                {
                    const rows = statement
                        .executeSync([vector, THRESHOLD_LABEL])
                        .getAllSync();

                    const placeholders = rows.map(() => "?").join(",");
                    const labels = this.db
                        .getAllSync<string>(`
                        SELECT label 
                        FROM labels
                        WHERE id IN (${placeholders})
                    `, [rows]);

                    tags.push(labels)
                }
            }
            catch (e)
            {
                console.error(`${e}`)
                throw e;
            }
            finally
            {
                statement.finalizeSync();
            }
        });

        return tags;
    }
}