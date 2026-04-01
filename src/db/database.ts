import Database from '@tauri-apps/plugin-sql';
import { MIGRATIONS } from './migrations';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  db = await Database.load('sqlite:offpage.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  for (const migration of MIGRATIONS) {
    await database.execute(migration);
  }
}
