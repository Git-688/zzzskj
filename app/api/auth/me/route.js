import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authCookie = request.cookies.get('auth')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const isAdmin = authCookie === adminPassword;

  if (isAdmin) {
    return NextResponse.json({ isAdmin: true });
  }

  if (authCookie) {
    try {
      const db = getDb();
      const row = await db.execute({
        sql: `SELECT expireAt FROM temp_passwords WHERE password = ? AND revoked = 0`,
        args: [authCookie]
      });
      if (row.rows.length > 0) {
        const expireAt = row.rows[0].expireAt;
        return NextResponse.json({
          isAdmin: false,
          expireAt: expireAt || null,
          isForever: expireAt === null
        });
      }
    } catch (e) {}
  }

  return NextResponse.json({ isAdmin: false });
}