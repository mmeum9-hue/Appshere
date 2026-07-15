import { Search, Sun, Moon, LogOut, User, LogIn, UploadCloud, Menu } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  user: any;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLoginClick: () => void;
  onMenuToggle: () => void;
  onUploadClick: () => void;
}

export default function Navbar({
  user,
  theme,
  setTheme,
  searchQuery,
  setSearchQuery,
  onLoginClick,
  onMenuToggle,
  onUploadClick
}: NavbarProps) {

  const handleLogout = () => {
    signOut(auth).catch(err => console.error("Error signing out:", err));
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#1E293B]/90 dark:backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 transition-colors duration-300" id="app-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onMenuToggle}
            className="p-2 md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer mr-1"
            id="mobile-menu-btn"
            title="Menu de Navegação"
          >
            <Menu size={22} />
          </button>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <UploadCloud size={20} strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight hidden sm:block">
            AppShare
          </span>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md mx-auto relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar APKs e arquivos..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            id="search-input"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Upload Action */}
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
            title="Enviar Novo Arquivo"
            id="navbar-upload-btn"
          >
            <UploadCloud size={14} />
            <span className="hidden sm:inline">Enviar Arquivo</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50"
            title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            id="theme-toggle-btn"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* User info / Login buttons */}
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user.displayName || 'Usuário'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  Membro
                </span>
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-blue-500/10 select-none">
                {getInitials(user.displayName || user.email || '')}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-red-500/10"
                title="Sair da Conta"
                id="logout-btn"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="px-3.5 py-2 bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-slate-950/10"
              id="login-trigger-btn"
            >
              <LogIn size={15} />
              <span>Fazer Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
