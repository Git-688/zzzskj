'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password, remember }),
    });
    if (res.ok) {
      router.push('/');
    } else {
      const data = await res.json();
      setError(data.error || '密码错误');
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>站长专属空间</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-item">
            <label>访问密码</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              autoFocus
            />
          </div>
          <div className="remember-row">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember">记住密码（1天免登录）</label>
          </div>
          {error && <p style={{color:'#ef4444', fontSize:'12px', marginBottom:'16px', textAlign:'center'}}>{error}</p>}
          <button type="submit" className="login-btn">进入空间</button>
        </form>
      </div>
    </div>
  );
}