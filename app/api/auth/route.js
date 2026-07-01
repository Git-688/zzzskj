import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request) {
  const { password, remember } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const ip = getClientIp(request);
  const db = getDb();
  const now = Date.now();
  const maxFailTimes = 5;
  const lockSeconds = 600; // 10分钟

  // 检查是否被锁定
  const failRow = await db.execute({
    sql: `SELECT count, lockedUntil FROM login_fails WHERE ip = ?`,
    args: [ip]
  });
  let failData = failRow.rows[0];
  if (failData && failData.lockedUntil && failData.lockedUntil > now) {
    return NextResponse.json(
      { error: '密码错误次数过多，请10分钟后再试' },
      { status: 429 }
    );
  }

  // 1. 校验管理员密码
  if (password === adminPassword) {
    // 登录成功，清除失败记录
    await db.execute({
      sql: `DELETE FROM login_fails WHERE ip = ?`,
      args: [ip]
    });
    const response = NextResponse.json({ success: true, type: 'admin' });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
    if (remember) cookieOptions.maxAge = 60 * 60 * 24;
    response.cookies.set('auth', password, cookieOptions);
    return response;
  }

  // 2. 校验临时密码
  const tempRow = await db.execute({
    sql: `SELECT password, expireAt, durationSeconds FROM temp_passwords 
          WHERE password = ? AND revoked = 0 AND (expireAt IS NULL OR expireAt > ?)`,
    args: [password, now]
  });
  if (tempRow.rows.length > 0) {
    const temp = tempRow.rows[0];
    // 登录成功，清除失败记录
    await db.execute({
      sql: `DELETE FROM login_fails WHERE ip = ?`,
      args: [ip]
    });
    const response = NextResponse.json({ success: true, type: 'temp' });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
    const maxAge = temp.durationSeconds > 0
      ? Math.min(temp.durationSeconds, 86400)
      : 86400;
    cookieOptions.maxAge = maxAge;
    response.cookies.set('auth', password, cookieOptions);
    return response;
  }

  // 密码错误，累加错误次数
  const currentCount = failData ? failData.count : 0;
  const newCount = currentCount + 1;
  const lockedUntil = newCount >= maxFailTimes ? now + lockSeconds * 1000 : null;
  await db.execute({
    sql: `INSERT INTO login_fails (ip, count, lockedUntil) 
          VALUES (?, ?, ?) 
          ON CONFLICT(ip) DO UPDATE SET count = excluded.count, lockedUntil = excluded.lockedUntil`,
    args: [ip, newCount, lockedUntil]
  });

  const remainTimes = maxFailTimes - newCount;
  const errorMsg = remainTimes > 0
    ? `密码错误，还可尝试${remainTimes}次`
    : '密码错误次数过多，请10分钟后再试';

  return NextResponse.json({ error: errorMsg }, { status: 401 });
}