import Database from '@tauri-apps/plugin-sql';
import { MIGRATIONS } from './migrations';

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const loaded = await Database.load('sqlite:offpage.db');
    await loaded.execute('PRAGMA foreign_keys = ON;');
    await runMigrations(loaded);
    db = loaded;
    return loaded;
  })();

  try {
    return await dbInitPromise;
  } catch (error) {
    db = null;
    dbInitPromise = null;
    throw error;
  }
}

async function runMigrations(database: Database): Promise<void> {
  for (const migration of MIGRATIONS) {
    await database.execute(migration);
  }
}
