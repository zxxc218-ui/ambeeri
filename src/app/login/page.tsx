"use client";
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Zap } from 'lucide-react';
 
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
 
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
 
    setLoading(true);
 
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
 
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        setLoading(false);
      } else {
        // Fallback client-side cookie injection to bypass mobile HTTP/IP cookie restrictions
        document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ في الاتصال بالسيرفر');
      setLoading(false);
    }
  };
 
  return (
    <div className="login-screen">
      <div className="login-logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
        <img 
          src="/ambeeri-logo.png" 
          alt="Ambeeri Logo" 
          style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'contain', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} 
        />
        <div className="login-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap style={{ color: 'var(--primary)', width: '24px', height: '24px' }} />
          <span className="brand-name-ar">أمبيري</span>
        </div>
      </div>
      <div className="login-tagline">النظام الذكي لإدارة اشتراكات المولدات الأهلية</div>
 
      <div className="login-card">
        <h2>تسجيل الدخول للنظام</h2>
 
        <form onSubmit={handleLogin}>
          <div className="login-group">
            <label htmlFor="username">اسم المستخدم</label>
            <div className="input-icon-wrap" style={{ position: 'relative' }}>
              <User style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
                width: '18px',
                height: '18px'
              }} />
              <input
                id="username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoCapitalize="none"
                autoCorrect="off"
                style={{ paddingRight: '38px' }}
              />
            </div>
          </div>
 
          <div className="login-group">
            <label htmlFor="password">كلمة المرور</label>
            <div className="input-icon-wrap" style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
                width: '18px',
                height: '18px'
              }} />
              <input
                id="password"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: '38px' }}
              />
            </div>
          </div>
 
          {error && <div className="login-error show">{error}</div>}
 
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
 
      <div className="login-demo-hint">
        نظام الإنتاج الموثق. يرجى استخدام بيانات الدخول المخصصة لك.
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '16px' }}>VERSION TEST 2026-06-18</div>
    </div>
  );
}
