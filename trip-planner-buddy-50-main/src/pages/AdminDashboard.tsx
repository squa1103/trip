import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Home, MapPinned, LogOut, ExternalLink } from 'lucide-react';
import AccountManagement from '@/components/admin/AccountManagement';
import HomepageManagement from '@/components/admin/HomepageManagement';
import TripManagement from '@/components/admin/TripManagement';

type AdminPage = 'accounts' | 'homepage' | 'trips';

const menuItems: { key: AdminPage; label: string; icon: React.ElementType }[] = [
  { key: 'accounts', label: '帳號管理', icon: Users },
  { key: 'homepage', label: '首頁管理', icon: Home },
  { key: 'trips', label: '行程管理', icon: MapPinned },
];

const AdminDashboard = () => {
  const [activePage, setActivePage] = useState<AdminPage>('accounts');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem('adminLoggedIn')) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-primary text-primary-foreground transition-all duration-300 flex flex-col shrink-0`}>
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
          {sidebarOpen && <span className="text-lg font-bold text-gold-gradient">後台管理</span>}
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activePage === item.key
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="px-2 pb-4 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <ExternalLink className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>前往前台</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>登出</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border flex items-center px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4 text-muted-foreground hover:text-foreground">
            ☰
          </button>
          <h1 className="text-lg font-semibold text-foreground">
            {menuItems.find((m) => m.key === activePage)?.label}
          </h1>
        </header>
        <div className="p-6">
          {activePage === 'accounts' && <AccountManagement />}
          {activePage === 'homepage' && <HomepageManagement />}
          {activePage === 'trips' && <TripManagement />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
