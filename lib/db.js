import { createClient } from '@libsql/client';

let client = null;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    client = createClient({ url, authToken });
  }
  return client;
}

export async function initTables() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parentId TEXT,
      sort INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      desc TEXT,
      categoryId TEXT NOT NULL,
      sort INTEGER DEFAULT 0
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS temp_passwords (
      password TEXT PRIMARY KEY,
      createdAt INTEGER NOT NULL,
      expireAt INTEGER,
      durationSeconds INTEGER,
      revoked INTEGER DEFAULT 0
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS login_fails (
      ip TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      lockedUntil INTEGER
    )
  `);
}