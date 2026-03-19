import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '@/lib/auth';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/admin');
    } catch {
      setError('帳號或密碼錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gold-gradient mb-8">後台管理</h1>
        <form onSubmit={handleLogin} className="bg-card rounded-xl p-8 shadow-2xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="請輸入 Email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="請輸入密碼"
              required
            />
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gold-gradient text-primary font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
