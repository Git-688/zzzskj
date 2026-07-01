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
  const { name, parentId = null, sort } = await request.json();
  const db = getDb();

  let finalSort = sort;
  if (!finalSort) {
    const siblings = await db.execute({
      sql: `SELECT sort FROM categories WHERE parentId ${parentId === null ? 'IS NULL' : '= ?'} ORDER BY sort DESC LIMIT 1`,
      args: parentId === null ? [] : [parentId]
    });
    const maxSort = siblings.rows.length > 0 ? siblings.rows[0].sort : 0;
    finalSort = maxSort + 1;
  }

  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO categories (id, name, parentId, sort, visible) VALUES (?, ?, ?, ?, 1)`,
    args: [id, name, parentId, finalSort]
  });

  return NextResponse.json({ id, name, parentId, sort: finalSort, visible: true });
}

export async function PUT(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { id, name, sort, visible } = await request.json();
  const db = getDb();

  await db.execute({
    sql: `UPDATE categories SET name = ?, sort = ?, visible = ? WHERE id = ?`,
    args: [name, Number(sort), visible !== undefined ? (visible ? 1 : 0) : 1, id]
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const db = getDb();

  let idsToDelete = [id];
  const children = await db.execute({
    sql: `SELECT id FROM categories WHERE parentId = ?`,
    args: [id]
  });
  children.rows.forEach(row => idsToDelete.push(row.id));

  const placeholders = idsToDelete.map(() => '?').join(',');
  await db.execute({
    sql: `DELETE FROM categories WHERE id IN (${placeholders})`,
    args: idsToDelete
  });
  await db.execute({
    sql: `DELETE FROM links WHERE categoryId IN (${placeholders})`,
    args: idsToDelete
  });

  return NextResponse.json({ success: true });
}