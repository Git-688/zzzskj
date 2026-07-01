import { NextResponse } from 'next/server';
import { getDb, initTables } from './lib/db'; // 相对路径

let tablesInitialized = false;

export async function middleware(request) {
  if (!tablesInitialized) {
    try {
      await initTables();
      tablesInitialized = true;
    } catch (e) {
      console.error('Database initialization failed:', e);
    }
  }

  const authCookie = request.cookies.get('auth')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  if (authCookie === adminPassword) {
    return NextResponse.next();
  }

  if (authCookie) {
    try {
      const db = getDb();
      const now = Date.now();
      const result = await db.execute({
        sql: `SELECT password, expireAt FROM temp_passwords 
              WHERE password = ? AND revoked = 0 AND (expireAt IS NULL OR expireAt > ?)`,
        args: [authCookie, now]
      });
      if (result.rows.length > 0) {
        return NextResponse.next();
      }
    } catch (e) {}
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};