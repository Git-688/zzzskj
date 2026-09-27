import { NextResponse } from 'next/server';
import { getDb } from './lib/db';

export async function middleware(request) {
  const authCookie = request.cookies.get('auth')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const { pathname } = request.nextUrl;

  // 白名单路径直接放行
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 管理员密码直接放行
  if (authCookie && authCookie === adminPassword) {
    return NextResponse.next();
  }

  // 检查临时密码是否有效
  if (authCookie) {
    try {
      const db = getDb();
      const now = Date.now();
      const result = await db.execute({
        sql: `SELECT password FROM temp_passwords 
              WHERE password = ? AND revoked = 0 AND (expireAt IS NULL OR expireAt > ?)`,
        args: [authCookie, now]
      });
      if (result.rows.length > 0) {
        return NextResponse.next();
      }
    } catch (e) {
      console.error('Middleware auth check failed:', e);
    }
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};