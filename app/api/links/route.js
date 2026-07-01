import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const authCookie = request.cookies.get('auth')?.value;
  return authCookie === process.env.ADMIN_PASSWORD;
}

export async function POST(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const linkData = await request.json();
  const db = getDb();

  const existing = await db.execute({
    sql: `SELECT id FROM links WHERE url = ?`,
    args: [linkData.url.trim()]
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: '该链接已存在，请勿重复添加' }, { status: 400 });
  }

  let finalSort = linkData.sort;
  if (!finalSort) {
    const siblings = await db.execute({
      sql: `SELECT sort FROM links WHERE categoryId = ? ORDER BY sort DESC LIMIT 1`,
      args: [linkData.categoryId]
    });
    const maxSort = siblings.rows.length > 0 ? siblings.rows[0].sort : 0;
    finalSort = maxSort + 1;
  }

  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO links (id, title, url, desc, categoryId, sort) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, linkData.title, linkData.url.trim(), linkData.desc || '', linkData.categoryId, finalSort]
  });

  return NextResponse.json({ id, ...linkData, sort: finalSort });
}

export async function PUT(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { id, title, url, desc, sort } = await request.json();
  const db = getDb();

  const existing = await db.execute({
    sql: `SELECT id FROM links WHERE url = ? AND id != ?`,
    args: [url.trim(), id]
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: '该链接已存在' }, { status: 400 });
  }

  await db.execute({
    sql: `UPDATE links SET title = ?, url = ?, desc = ?, sort = ? WHERE id = ?`,
    args: [title, url.trim(), desc || '', Number(sort), id]
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const db = getDb();

  await db.execute({
    sql: `DELETE FROM links WHERE id = ?`,
    args: [id]
  });

  return NextResponse.json({ success: true });
}