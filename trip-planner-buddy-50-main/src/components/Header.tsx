import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchOverlay from './SearchOverlay';

const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('siteLogo');
    if (stored) setLogoUrl(stored);

    const handler = () => {
      setLogoUrl(localStorage.getItem('siteLogo'));
    };
    window.addEventListener('logoUpdated', handler);
    return () => window.removeEventListener('logoUpdated', handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-lg">
        <div className="w-full flex items-center justify-between h-16 px-4 md:px-8">
          <button onClick={() => navigate('/')} className="flex items-center mr-auto">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 sm:h-10 max-w-[120px] sm:max-w-[160px] object-contain" />
            ) : (
              <span className="text-lg sm:text-xl font-bold tracking-wider text-gold-gradient">LOGO</span>
            )}
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full hover:bg-sidebar-accent transition-colors"
              aria-label="搜尋"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 text-primary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              登入管理
            </button>
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
