import { useState } from 'react';
import { SharedFile } from '../types';
import { formatBytes, formatDate, getFileTypeColor, getPublicDownloadUrl, getAppAestheticTheme } from '../utils';
import { 
  FileCode, Image, Video, FileText, FolderArchive, File, Star, 
  Trash2, Copy, Download, Share2, ClipboardCheck, ArrowUpRight,
  Filter, Grid, List, SearchX, CheckCircle, ExternalLink, ShieldAlert, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileListProps {
  files: SharedFile[];
  user: any;
  favorites: string[];
  onToggleFavorite: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: SharedFile) => void;
  onDownloadIncrement: (fileId: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
}

export default function FileList({
  files,
  user,
  favorites,
  onToggleFavorite,
  onDeleteFile,
  onEditFile,
  onDownloadIncrement,
  selectedCategory,
  setSelectedCategory,
  searchQuery
}: FileListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'apk', label: 'APKs' },
    { id: 'image', label: 'Imagens' },
    { id: 'video', label: 'Vídeos' },
    { id: 'zip', label: 'ZIPs' },
    { id: 'pdf', label: 'PDFs' },
    { id: 'other', label: 'Outros' }
  ];

  // Filtra arquivos por categoria e termo de pesquisa
  const filteredFiles = files.filter(f => {
    // Filtro por categoria
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'zip' && f.type !== 'zip') return false;
      if (selectedCategory === 'apk' && f.type !== 'apk') return false;
      if (selectedCategory === 'image' && f.type !== 'image') return false;
      if (selectedCategory === 'video' && f.type !== 'video') return false;
      if (selectedCategory === 'pdf' && f.type !== 'pdf') return false;
      if (selectedCategory === 'other' && f.type !== 'other') return false;
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = f.name ? f.name.toLowerCase().includes(query) : false;
      const descMatch = f.description ? f.description.toLowerCase().includes(query) : false;
      const emailMatch = f.uploaderEmail ? f.uploaderEmail.toLowerCase().includes(query) : false;
      return nameMatch || descMatch || emailMatch;
    }

    return true;
  });

  const getFileIcon = (type: string, url?: string, appIcon?: string, name?: string, id?: string) => {
    switch (type) {
      case 'apk':
        if (appIcon) {
          return (
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center shadow-sm">
              <img src={appIcon} alt="App Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          );
        }
        const initials = name ? name.substring(0, 2).toUpperCase() : 'AP';
        const theme = getAppAestheticTheme(id || 'default');
        return (
          <div className={`w-11 h-11 bg-gradient-to-tr ${theme.gradient} text-white font-display font-black text-[11px] rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/10 uppercase tracking-tight`}>
            {initials}
          </div>
        );
      case 'image':
        if (url) {
          return (
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
              <img src={url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          );
        }
        return (
          <div className="w-11 h-11 bg-blue-500/10 text-blue-500 border border-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
            <Image size={20} strokeWidth={2} />
          </div>
        );
      case 'video':
        return (
          <div className="w-11 h-11 bg-purple-500/10 text-purple-500 border border-purple-500/15 rounded-xl flex items-center justify-center shrink-0">
            <Video size={20} strokeWidth={2} />
          </div>
        );
      case 'pdf':
        return (
          <div className="w-11 h-11 bg-red-500/10 text-red-500 border border-red-500/15 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={20} strokeWidth={2} />
          </div>
        );
      case 'zip':
        return (
          <div className="w-11 h-11 bg-amber-500/10 text-amber-500 border border-amber-500/15 rounded-xl flex items-center justify-center shrink-0">
            <FolderArchive size={20} strokeWidth={2} />
          </div>
        );
      default:
        return (
          <div className="w-11 h-11 bg-slate-500/10 text-slate-500 border border-slate-500/15 rounded-xl flex items-center justify-center shrink-0">
            <File size={20} strokeWidth={2} />
          </div>
        );
    }
  };

  const copyDownloadLink = (fileId: string) => {
    const link = getPublicDownloadUrl(fileId);
    navigator.clipboard.writeText(link);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenDownloadPage = (fileId: string) => {
    // Muda a URL da página mantendo SPA (recarrega para capturar mudança ou muda o hash)
    window.location.href = `?d=${fileId}`;
  };

  return (
    <div className="space-y-5" id="file-list-container">
      {/* Category Tabs & Grid/List Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0" id="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              id={`cat-${cat.id}-btn`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
            title="Visualização em Grade"
            id="grid-mode-btn"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
            title="Visualização em Lista"
            id="list-mode-btn"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Grid or List list of files */}
      <AnimatePresence mode="popLayout">
        {filteredFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl"
            id="empty-files-container"
          >
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 rounded-full mb-3.5">
              <SearchX size={32} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhum arquivo encontrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-normal">
              {searchQuery.trim() 
                ? `Não encontramos resultados correspondentes a "${searchQuery}". Tente outros termos.` 
                : 'Esta lista está vazia. Comece enviando um aplicativo APK ou arquivo acima!'}
            </p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            id="files-grid"
          >
            {filteredFiles.map((f) => {
              const isOwner = user && f.uploadedBy === user.uid;
              const isFav = favorites.includes(f.id);
              const fileColor = getFileTypeColor(f.type);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={f.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4.5 hover:shadow-md hover:border-slate-200/80 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between gap-4 group"
                  id={`file-card-${f.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon and Category Label */}
                    <div className="flex items-center gap-3">
                      {getFileIcon(f.type, f.downloadUrl, f.appIcon, f.name, f.id)}
                      <div className="overflow-hidden">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${fileColor} uppercase tracking-wider mb-1`}>
                          {f.type}
                        </span>
                        <h3 className="text-xs font-bold text-slate-950 dark:text-white truncate max-w-[150px] leading-snug group-hover:text-blue-500 transition-colors" title={f.name}>
                          {f.name}
                        </h3>
                      </div>
                    </div>

                    {/* Star Favorite Button */}
                    <button
                      onClick={() => onToggleFavorite(f.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isFav 
                          ? 'bg-amber-50 border-amber-200/50 text-amber-500 dark:bg-amber-500/10 dark:border-amber-500/20' 
                          : 'bg-white border-slate-100 dark:bg-slate-950 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500'
                      }`}
                      title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      id={`fav-btn-${f.id}`}
                    >
                      <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Description if present */}
                  {f.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50/50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                      {f.description}
                    </p>
                  )}

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    <div className="flex flex-col">
                      <span>Tamanho</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold">{formatBytes(f.size)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span>Data</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold">{formatDate(f.uploadedAt).split(',')[0]}</span>
                    </div>
                    <div className="flex flex-col">
                      <span>Enviado por</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold truncate max-w-[100px]">{f.uploaderEmail.split('@')[0]}</span>
                    </div>
                    <div className="flex flex-col">
                      <span>Downloads</span>
                      <span className="text-slate-800 dark:text-slate-300 font-bold flex items-center gap-1">
                        <Download size={10} className="text-slate-400" />
                        {f.downloadsCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Control actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    <div className="flex items-center gap-1.5">
                      {/* Copy Link */}
                      <button
                        onClick={() => copyDownloadLink(f.id)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          copiedId === f.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Copiar Link de Download"
                        id={`copy-btn-${f.id}`}
                      >
                        {copiedId === f.id ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                      </button>

                      {/* Edit/Update File (if owner) */}
                      {isOwner && (
                        <button
                          onClick={() => onEditFile(f)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white border border-blue-500/15 rounded-xl transition-all cursor-pointer"
                          title="Atualizar Aplicativo"
                          id={`edit-btn-${f.id}`}
                        >
                          <Pencil size={14} />
                        </button>
                      )}

                      {/* Delete File (if owner) */}
                      {isOwner && (
                        <button
                          onClick={() => onDeleteFile(f.id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/15 rounded-xl transition-all cursor-pointer"
                          title="Excluir Arquivo"
                          id={`del-btn-${f.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Open Download Page Action Button */}
                    <button
                      onClick={() => handleOpenDownloadPage(f.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm shadow-blue-500/10"
                      id={`open-download-${f.id}`}
                    >
                      <span>Baixar</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* LIST VIEW */
          <motion.div 
            layout
            className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800"
            id="files-list"
          >
            {filteredFiles.map((f) => {
              const isOwner = user && f.uploadedBy === user.uid;
              const isFav = favorites.includes(f.id);
              const fileColor = getFileTypeColor(f.type);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  key={f.id}
                  className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-[#0F172A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  id={`file-row-${f.id}`}
                >
                  {/* File Metadata Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getFileIcon(f.type, f.downloadUrl, f.appIcon, f.name, f.id)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-950 dark:text-white truncate max-w-[180px] sm:max-w-xs group-hover:text-blue-500 transition-colors" title={f.name}>
                          {f.name}
                        </h3>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-bold border ${fileColor} uppercase tracking-wider`}>
                          {f.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        <span>{formatBytes(f.size)}</span>
                        <span>•</span>
                        <span>{formatDate(f.uploadedAt).split(',')[0]}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{f.uploaderEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    {/* Downloads tag */}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-50 dark:bg-[#0F172A] rounded-lg">
                      <Download size={10} />
                      <span>{f.downloadsCount || 0} dl</span>
                    </div>

                    {/* Favorite */}
                    <button
                      onClick={() => onToggleFavorite(f.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isFav 
                          ? 'bg-amber-50 border-amber-200/50 text-amber-500 dark:bg-amber-500/10 dark:border-amber-500/20' 
                          : 'bg-white border-slate-100 dark:bg-[#0F172A] dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500'
                      }`}
                      id={`fav-row-btn-${f.id}`}
                    >
                      <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={() => copyDownloadLink(f.id)}
                      className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                        copiedId === f.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-slate-100 dark:bg-[#0F172A] dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      id={`copy-row-btn-${f.id}`}
                    >
                      {copiedId === f.id ? <ClipboardCheck size={13} /> : <Copy size={13} />}
                    </button>

                    {/* Edit File */}
                    {isOwner && (
                      <button
                        onClick={() => onEditFile(f)}
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/15 rounded-lg text-blue-500 hover:text-white transition-all cursor-pointer"
                        id={`edit-row-btn-${f.id}`}
                        title="Atualizar Aplicativo"
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Delete File */}
                    {isOwner && (
                      <button
                        onClick={() => onDeleteFile(f.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/15 rounded-lg text-rose-500 hover:text-white transition-all cursor-pointer"
                        id={`del-row-btn-${f.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {/* Open Download Page Action Button */}
                    <button
                      onClick={() => handleOpenDownloadPage(f.id)}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors shadow-sm shadow-blue-500/10"
                      id={`open-download-row-${f.id}`}
                      title="Abrir Página de Download"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
