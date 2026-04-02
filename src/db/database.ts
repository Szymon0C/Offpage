import Database from '@tauri-apps/plugin-sql';
import { MIGRATIONS } from './migrations';
import { BUNDLED_TEMPLATES } from '../lib/bundledTemplates';

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const loaded = await Database.load('sqlite:offpage.db');
    await loaded.execute('PRAGMA foreign_keys = ON;');
    await runMigrations(loaded);
    await seedTemplates(loaded);
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

async function seedTemplates(db: Database): Promise<void> {
  const rows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) as count FROM templates');
  if (rows[0]?.count > 0) return;

  for (const tpl of BUNDLED_TEMPLATES) {
    await db.execute(
      'INSERT INTO templates (id, name, category, html, thumbnail, version) VALUES (?, ?, ?, ?, NULL, ?)',
      [tpl.id, tpl.name, tpl.category, tpl.html, tpl.version]
    );
  }
}
