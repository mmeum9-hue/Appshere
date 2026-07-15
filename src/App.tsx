import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment,
  getDocs,
  where
} from 'firebase/firestore';
import { SharedFile } from './types';
import Navbar from './components/Navbar';
import Sidebar, { SidebarTab } from './components/Sidebar';
import UploadCard from './components/UploadCard';
import FileList from './components/FileList';
import DownloadPage from './components/DownloadPage';
import AuthPage from './components/AuthPage';
import { 
  FolderLock, Info, ArrowUpRight, HelpCircle, 
  Sparkles, CheckCircle, AlertCircle, X, FolderOpen, HardDrive, Star, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Safe localStorage wrapper to prevent crash in iframe sandboxes with blocked 3rd party storage
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`localStorage.getItem denied or failed for key "${key}":`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`localStorage.setItem denied or failed for key "${key}":`, e);
    }
  }
};

export default function App() {
  // Configuração do tema Light/Dark
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Começa com dark por padrão no estilo moderno de compartilhamento
  });

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Detecta se a URL atual contém a página de download (e.g. ?d=fileId)
  const [downloadFileId, setDownloadFileId] = useState<string | null>(null);

  useEffect(() => {
    // Altera classe do documento para modo claro/escuro
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeStorage.setItem('theme', theme);
  }, [theme]);

  // Escuta alteração nos parâmetros de busca para ver se está na página de download
  useEffect(() => {
    const handleUrlQuery = () => {
      const params = new URLSearchParams(window.location.search);
      const dParam = params.get('d');
      if (dParam) {
        setDownloadFileId(dParam);
      } else {
        setDownloadFileId(null);
      }
    };

    handleUrlQuery();
    window.addEventListener('popstate', handleUrlQuery);
    return () => window.removeEventListener('popstate', handleUrlQuery);
  }, []);

  // Monitora autenticação de usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowAuthModal(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Carrega arquivos do Firestore em tempo real
  useEffect(() => {
    const q = query(collection(db, 'files'), orderBy('uploadedAt', 'desc'));
    let fired = false;

    // Timeout de segurança de 2.5 segundos em caso de Firestore offline/indisponível
    const fallbackTimeout = setTimeout(() => {
      if (!fired) {
        console.warn("Firestore is taking too long to respond. Loading mock/demo files for optimal experience.");
        loadMockFiles();
      }
    }, 2500);
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      fired = true;
      clearTimeout(fallbackTimeout);
      const filesList: SharedFile[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        filesList.push({
          id: docSnap.id,
          name: data.name,
          size: data.size,
          type: data.type,
          uploadedAt: data.uploadedAt,
          downloadUrl: data.downloadUrl,
          downloadsCount: data.downloadsCount || 0,
          uploadedBy: data.uploadedBy,
          uploaderEmail: data.uploaderEmail,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          description: data.description,
          appIcon: data.appIcon || '',
          screenshots: data.screenshots || [],
          rating: data.rating || 4.8,
          ratingsCount: data.ratingsCount || 0
        });
      });

      // Se o banco estiver vazio, semeamos alguns arquivos iniciais para demonstração
      if (filesList.length === 0) {
        await seedDemoFiles();
      } else {
        setFiles(filesList);
      }
    }, (error) => {
      fired = true;
      clearTimeout(fallbackTimeout);
      console.warn("Real-time files snapshot failed (probably rules or DB indexing). Using mockup demo files instead:", error);
      // Se der erro de regras, usamos simulação local de arquivos
      loadMockFiles();
    });

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Carrega favoritos do usuário atual
  useEffect(() => {
    if (!user) {
      // Carrega do localStorage para visitantes
      const localFavs = safeStorage.getItem('guest_favorites');
      setFavorites(localFavs ? JSON.parse(localFavs) : []);
      return;
    }

    // Carrega favoritos do Firestore
    const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const favList: string[] = [];
      querySnapshot.forEach((docSnap) => {
        favList.push(docSnap.data().fileId);
      });
      setFavorites(favList);
    }, (err) => {
      console.warn("Error reading favorites from firestore, using localstorage fallback:", err);
      const localFavs = safeStorage.getItem(`favs_${user.uid}`);
      setFavorites(localFavs ? JSON.parse(localFavs) : []);
    });

    return () => unsubscribe();
  }, [user]);

  // Função para semear arquivos de demonstração caso o banco esteja vazio
  const seedDemoFiles = async () => {
    const demoFiles = [
      {
        id: 'file_demo_whatsapp',
        name: 'WhatsApp_Messenger_v2.24.11.apk',
        size: 52100200,
        type: 'apk',
        uploadedAt: Date.now() - 3600000 * 4,
        downloadUrl: 'https://github.com/firebase/firebase-js-sdk/raw/master/README.md',
        downloadsCount: 148,
        uploadedBy: 'system_demo',
        uploaderEmail: 'suporte@appshare.com',
        isPublic: true,
        description: 'Nova versão oficial estável do WhatsApp Messenger. Adicionado novos recursos de canais e figurinhas com IA.',
        appIcon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
        screenshots: [
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&q=80&w=600'
        ]
      },
      {
        id: 'file_demo_minecraft',
        name: 'Minecraft_PocketEdition_v1.20.apk',
        size: 154800900,
        type: 'apk',
        uploadedAt: Date.now() - 3600000 * 24 * 2,
        downloadUrl: 'https://github.com/firebase/firebase-js-sdk/raw/master/README.md',
        downloadsCount: 524,
        uploadedBy: 'system_demo',
        uploaderEmail: 'games@appshare.com',
        isPublic: true,
        description: 'Minecraft Mobile completo com multijogador local ativado e todas as skins desbloqueadas para teste.',
        appIcon: 'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&q=80&w=200',
        screenshots: [
          'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1607988795691-3d0147b43231?auto=format&fit=crop&q=80&w=600'
        ]
      },
      {
        id: 'file_demo_wallpaper',
        name: 'Aesthetic_Futuristic_City_4K.png',
        size: 4510300,
        type: 'image',
        uploadedAt: Date.now() - 3600000 * 2,
        downloadUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1000',
        downloadsCount: 22,
        uploadedBy: 'system_demo',
        uploaderEmail: 'designer@appshare.com',
        isPublic: true,
        description: 'Papel de parede premium estilo Cyberpunk em alta definição 4K.'
      }
    ];

    try {
      for (const df of demoFiles) {
        await setDoc(doc(db, 'files', df.id), df);
      }
    } catch (err) {
      console.warn("Could not seed demo files to remote Firestore due to write permissions, loading locally:", err);
      setFiles(demoFiles as any);
    }
  };

  const loadMockFiles = () => {
    setFiles([
      {
        id: 'file_demo_whatsapp',
        name: 'WhatsApp_Messenger_v2.24.11.apk',
        size: 52100200,
        type: 'apk',
        uploadedAt: Date.now() - 3600000 * 4,
        downloadUrl: 'https://github.com/firebase/firebase-js-sdk/raw/master/README.md',
        downloadsCount: 148,
        uploadedBy: 'system_demo',
        uploaderEmail: 'suporte@appshare.com',
        isPublic: true,
        description: 'Nova versão oficial estável do WhatsApp Messenger. Adicionado novos recursos de canais e figurinhas com IA.',
        appIcon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
        screenshots: [
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&q=80&w=600'
        ]
      },
      {
        id: 'file_demo_minecraft',
        name: 'Minecraft_PocketEdition_v1.20.apk',
        size: 154800900,
        type: 'apk',
        uploadedAt: Date.now() - 3600000 * 24 * 2,
        downloadUrl: 'https://github.com/firebase/firebase-js-sdk/raw/master/README.md',
        downloadsCount: 524,
        uploadedBy: 'system_demo',
        uploaderEmail: 'games@appshare.com',
        isPublic: true,
        description: 'Minecraft Mobile completo com multijogador local ativado e todas as skins desbloqueadas para teste.',
        appIcon: 'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&q=80&w=200',
        screenshots: [
          'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1607988795691-3d0147b43231?auto=format&fit=crop&q=80&w=600'
        ]
      },
      {
        id: 'file_demo_wallpaper',
        name: 'Aesthetic_Futuristic_City_4K.png',
        size: 4510300,
        type: 'image',
        uploadedAt: Date.now() - 3600000 * 2,
        downloadUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1000',
        downloadsCount: 22,
        uploadedBy: 'system_demo',
        uploaderEmail: 'designer@appshare.com',
        isPublic: true,
        description: 'Papel de parede premium estilo Cyberpunk em alta definição 4K.'
      }
    ]);
  };

  // Alterna arquivo como favorito
  const handleToggleFavorite = async (fileId: string) => {
    if (!user) {
      // Visitante: Salva no localStorage
      let newFavs = [...favorites];
      if (newFavs.includes(fileId)) {
        newFavs = newFavs.filter(id => id !== fileId);
        showToast('Removido dos favoritos locais!', 'info');
      } else {
        newFavs.push(fileId);
        showToast('Salvo nos favoritos locais! Faça login para salvar na nuvem.', 'success');
      }
      setFavorites(newFavs);
      safeStorage.setItem('guest_favorites', JSON.stringify(newFavs));
      return;
    }

    // Usuário autenticado: salva no Firestore
    const favId = `${user.uid}_${fileId}`;
    try {
      const favDocRef = doc(db, 'favorites', favId);
      if (favorites.includes(fileId)) {
        await deleteDoc(favDocRef);
        showToast('Removido dos favoritos na nuvem!', 'info');
      } else {
        await setDoc(favDocRef, {
          id: favId,
          userId: user.uid,
          fileId: fileId,
          createdAt: Date.now()
        });
        showToast('Salvo nos favoritos na nuvem!', 'success');
      }
    } catch (err) {
      console.warn("Could not write favorite to Firestore, using localstorage fallback:", err);
      let newFavs = [...favorites];
      if (newFavs.includes(fileId)) {
        newFavs = newFavs.filter(id => id !== fileId);
      } else {
        newFavs.push(fileId);
      }
      setFavorites(newFavs);
      safeStorage.setItem(`favs_${user.uid}`, JSON.stringify(newFavs));
      showToast('Favorito atualizado localmente!', 'success');
    }
  };

  // Exclui arquivo do Firestore
  const handleDeleteFile = async (fileId: string) => {
    try {
      const docRef = doc(db, 'files', fileId);
      await deleteDoc(docRef);

      // Também remove de qualquer favorito
      if (user) {
        const favRef = doc(db, 'favorites', `${user.uid}_${fileId}`);
        await deleteDoc(favRef).catch(() => {});
      }

      showToast('Arquivo excluído com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      // Fallback local se estiver em modo simulado
      setFiles(prev => prev.filter(f => f.id !== fileId));
      showToast('Arquivo removido localmente!', 'success');
    }
  };

  // Incrementa contagem de download
  const handleDownloadIncrement = async (fileId: string) => {
    try {
      const docRef = doc(db, 'files', fileId);
      await updateDoc(docRef, {
        downloadsCount: increment(1)
      });
    } catch (err) {
      console.warn("Firestore increment failed, updating local state only:", err);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, downloadsCount: (f.downloadsCount || 0) + 1 } : f));
    }
  };

  // Exibe toast temporário
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleScrollToUpload = () => {
    setMobileMenuOpen(false);
    setShowUploadModal(true);
  };

  // Filtra arquivos favoritos se a tab atual for 'favorites'
  const displayFiles = files.filter(f => {
    if (activeTab === 'favorites') {
      return favorites.includes(f.id);
    }
    if (activeTab === 'my-uploads') {
      return user && f.uploadedBy === user.uid;
    }
    // Para visitantes ou aba geral, apenas arquivos públicos (ou os dele se logado)
    if (f.isPublic) return true;
    if (user && f.uploadedBy === user.uid) return true;
    return false;
  });

  const handleBackToApp = () => {
    // Remove query parameter ?d= de forma limpa na barra do navegador sem dar reload total
    const baseUrl = window.location.origin + window.location.pathname;
    window.history.pushState({}, '', baseUrl);
    setDownloadFileId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin mb-4" />
        <p className="font-display font-medium text-sm text-slate-300">
          Inicializando AppShare...
        </p>
      </div>
    );
  }

  // Se estiver acessando um link público direto de download (?d=fileId)
  if (downloadFileId) {
    return (
      <div className={theme}>
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
          <DownloadPage fileId={downloadFileId} onBackToApp={handleBackToApp} />
        </div>
      </div>
    );
  }

  return (
    <div className={theme}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
        {/* Toast Notifier */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900" id="global-toast">
            {toast.type === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info size={18} className="text-blue-500 shrink-0" />}
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {toast.message}
            </span>
          </div>
        )}

        {/* Auth Page View as Fullscreen overlay if clicked trigger */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <AuthPage 
              onSuccess={() => {
                setShowAuthModal(false);
                showToast('Login efetuado com sucesso!', 'success');
              }}
              onSkip={() => {
                setShowAuthModal(false);
                showToast('Navegando como visitante.', 'info');
              }}
            />
          </div>
        )}

        {/* Upload Modal Overlay */}
        <AnimatePresence>
          {showUploadModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      Enviar Novo Arquivo
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Compartilhe APKs, imagens, vídeos ou documentos com a comunidade.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body with scroll */}
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                  <UploadCard 
                    user={user} 
                    onUploadSuccess={() => {
                      setShowUploadModal(false);
                      showToast('Arquivo registrado com sucesso!', 'success');
                    }} 
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Header Navigation */}
        <Navbar 
          user={user}
          theme={theme}
          setTheme={setTheme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onLoginClick={() => setShowAuthModal(true)}
          onMenuToggle={() => setMobileMenuOpen(prev => !prev)}
          onUploadClick={handleScrollToUpload}
        />

        {/* Mobile Drawer Navigation overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 md:hidden"
              />

              {/* Side drawer panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col z-50 md:hidden shadow-2xl transition-colors duration-300"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-display font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Navegação
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Navigation Options */}
                <nav className="mt-6 flex-1 space-y-2">
                  <button
                    onClick={() => {
                      setActiveTab('all');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <FolderOpen size={18} />
                    <span>Todos os Arquivos</span>
                  </button>

                  {user && (
                    <button
                      onClick={() => {
                        setActiveTab('my-uploads');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                        activeTab === 'my-uploads'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <HardDrive size={18} />
                      <span>Meus Envios</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveTab('favorites');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                      activeTab === 'favorites'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Star size={18} />
                    <span>Meus Favoritos</span>
                  </button>
                </nav>

                {/* Footer of Drawer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  {user ? (
                    <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {user.displayName?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden text-left">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {user.displayName || 'Usuário'}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowAuthModal(true);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Fazer Login</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Core Layout Structure */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col md:flex-row gap-6 py-6">
          {/* Left Navigation Rails */}
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
          />

          {/* Primary View Feed */}
          <main className="flex-1 space-y-6" id="main-content-flow">
            {/* Quick Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm">
              <div>
                <h1 className="font-display font-bold text-lg text-slate-950 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-emerald-400" size={18} />
                  <span>
                    {activeTab === 'all' && 'Nuvem de Aplicativos'}
                    {activeTab === 'my-uploads' && 'Meus Aplicativos'}
                    {activeTab === 'favorites' && 'Aplicativos Favoritos'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activeTab === 'all' && 'Explore arquivos APK e mídias compartilhadas pela comunidade.'}
                  {activeTab === 'my-uploads' && 'Gerencie os APKs e mídias que você enviou para a nuvem.'}
                  {activeTab === 'favorites' && 'Acompanhe seus aplicativos favoritos e atalhos de download.'}
                </p>
              </div>

              {/* Guest Notification Banner */}
              {!user && (
                <div className="px-4 py-2.5 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    MODO VISITANTE ATIVO
                  </span>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Cadastrar
                  </button>
                </div>
              )}
            </div>

            {/* Core Dynamic Content Switch */}
            <div className="space-y-6">
              {/* File Listing Container */}
              <FileList 
                files={displayFiles}
                user={user}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onDeleteFile={handleDeleteFile}
                onDownloadIncrement={handleDownloadIncrement}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
              />
            </div>
          </main>
        </div>

        {/* Humble and minimalist footer */}
        <footer className="py-6 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <span>&copy; {new Date().getFullYear()} AppShare Cloud. Todos os direitos reservados.</span>
            <div className="flex items-center gap-4">
              <span>Hospedado no Cloud Run</span>
              <span>•</span>
              <span>Conexão Segura SSL</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
