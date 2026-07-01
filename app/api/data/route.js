import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();

  const categoriesResult = await db.execute(
    `SELECT id, name, parentId, sort, visible FROM categories ORDER BY sort ASC`
  );
  const linksResult = await db.execute(
    `SELECT id, title, url, desc, categoryId, sort FROM links ORDER BY sort ASC`
  );

  const categories = categoriesResult.rows.map(row => ({
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    sort: row.sort,
    visible: Boolean(row.visible)
  }));

  const links = linksResult.rows.map(row => ({
    id: row.id,
    title: row.title,
    url: row.url,
    desc: row.desc,
    categoryId: row.categoryId,
    sort: row.sort
  }));

  return NextResponse.json({ categories, links });
}