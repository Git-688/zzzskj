import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const authCookie = request.cookies.get('auth')?.value;
  return authCookie === process.env.ADMIN_PASSWORD;
}

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function cleanExpired(db) {
  const now = Date.now();
  await db.execute({
    sql: `DELETE FROM temp_passwords WHERE revoked = 1 OR (expireAt IS NOT NULL AND expireAt < ?)`,
    args: [now]
  });
}

export async function POST(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  
  const { durationSeconds } = await request.json();
  const password = generatePassword();
  const createdAt = Date.now();
  const expireAt = durationSeconds === -1 ? null : createdAt + durationSeconds * 1000;

  const db = getDb();
  await db.execute({
    sql: `INSERT INTO temp_passwords (password, createdAt, expireAt, durationSeconds, revoked) VALUES (?, ?, ?, ?, 0)`,
    args: [password, createdAt, expireAt, durationSeconds]
  });

  await cleanExpired(db);
  return NextResponse.json({ password, createdAt, expireAt });
}

export async function GET(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const db = getDb();
  const now = Date.now();

  const rows = await db.execute(
    `SELECT password, createdAt, expireAt, durationSeconds, revoked FROM temp_passwords ORDER BY createdAt DESC LIMIT 50`
  );

  const list = rows.rows.map(row => {
    let status;
    if (row.revoked) status = 'expired';
    else if (row.expireAt === null) status = 'forever';
    else if (now < row.expireAt) status = 'active';
    else status = 'expired';
    return {
      password: row.password,
      createdAt: row.createdAt,
      expireAt: row.expireAt,
      durationSeconds: row.durationSeconds,
      status
    };
  });

  return NextResponse.json(list);
}

export async function DELETE(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');
  if (!password) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  }

  const db = getDb();
  await db.execute({
    sql: `UPDATE temp_passwords SET revoked = 1 WHERE password = ?`,
    args: [password]
  });

  return NextResponse.json({ success: true });
}