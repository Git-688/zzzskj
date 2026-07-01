import { NextResponse } from 'next/server';
import { getDb, initTables } from '@/lib/db';

let tablesInitialized = false;

export async function middleware(request) {
  // 首次运行初始化表结构
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

  // 登录页、静态资源、公开API直接放行
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 1. 校验管理员密码
  if (authCookie === adminPassword) {
    return NextResponse.next();
  }

  // 2. 校验临时密码（查询数据库）
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
    } catch (e) {
      // 数据库异常走登录逻辑
    }
  }

  // 未通过鉴权，重定向到登录页
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};