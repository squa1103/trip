import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAdminUsers } from '@/data/mockData';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockAdminUsers.find((u) => u.username === username && u.password === password);
    if (user) {
      sessionStorage.setItem('adminLoggedIn', 'true');
      navigate('/admin');
    } else {
      setError('帳號密碼錯誤');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gold-gradient mb-8">後台管理</h1>
        <form onSubmit={handleLogin} className="bg-card rounded-xl p-8 shadow-2xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">帳號</label>
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="請輸入帳號"
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
            />
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-2.5 rounded-lg bg-gold-gradient text-primary font-medium hover:opacity-90 transition-opacity">
            登入
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
