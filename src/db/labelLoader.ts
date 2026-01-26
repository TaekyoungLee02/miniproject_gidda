import { File, Directory, Paths } from 'expo-file-system'
import { Asset } from 'expo-asset'
import * as SQLite from 'expo-sqlite';

class LabelLoader
{
    private static dbFile : File;
    private static dbAsset : Asset;

    constructor() {
        this.dbAsset = Asset.fromModule(require('./assets/db/labels.db'))
        this.dbFile = new File(new Directory(Paths.document, "SQLite/labels.db"));
    }

    static async getDB()
    {
        if (!this.dbFile.exists) await this.dbAsset.downloadAsync();
        return await SQLite.openDatabaseAsync('labels.db');
    }
}