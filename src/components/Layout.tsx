import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, UserPlus, LogOut, Shield } from 'lucide-react';

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('auth');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-orange-400" />
              <span className="font-bold text-xl tracking-tight">PJICO SMART CRM</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-blue-700 transition-colors"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-md mx-auto flex justify-around">
          <Link 
            to="/" 
            className={`flex flex-col items-center py-3 px-6 ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-500'}`}
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Tổng quan</span>
          </Link>
          <Link 
            to="/add" 
            className={`flex flex-col items-center py-3 px-6 ${location.pathname === '/add' ? 'text-blue-600' : 'text-slate-500'}`}
          >
            <UserPlus className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Thêm mới</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
