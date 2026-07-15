import { FolderOpen, Star, Heart, LayoutDashboard, HardDrive } from 'lucide-react';

export type SidebarTab = 'all' | 'my-uploads' | 'favorites';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  user: any;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user
}: SidebarProps) {

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 bg-white dark:bg-[#1E293B] border-r border-slate-100 dark:border-slate-800/80 p-4 flex-col gap-6 md:min-h-[calc(100vh-4rem)] transition-colors duration-300" id="app-sidebar">
      <div>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-3">
          Navegação
        </span>
        <nav className="mt-2.5 space-y-1">
          {/* All Files */}
          <button
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            id="tab-all-btn"
          >
            <FolderOpen size={18} />
            <span>Todos os Arquivos</span>
          </button>

          {/* My Uploads */}
          {user && (
            <button
              onClick={() => setActiveTab('my-uploads')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                activeTab === 'my-uploads'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              id="tab-my-uploads-btn"
            >
              <HardDrive size={18} />
              <span>Meus Envios</span>
            </button>
          )}

          {/* Favorites */}
          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            id="tab-favorites-btn"
          >
            <Star size={18} />
            <span>Meus Favoritos</span>
          </button>

        </nav>
      </div>
    </aside>
  );
}
