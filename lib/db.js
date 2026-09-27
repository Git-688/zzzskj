import { createClient } from '@libsql/client/web';

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

// 使用 Promise 缓存，避免每次请求都重复建表
// 注意：在 Cloudflare Edge 上，每个 isolate 生命周期内只会真正执行一次
let initPromise = null;

export function initTables() {
  if (!initPromise) {
    initPromise = performInit().catch(err => {
      // 失败时重置，允许下次重试
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function performInit() {
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