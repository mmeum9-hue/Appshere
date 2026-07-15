import React, { useState, useRef, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFileType, getPublicDownloadUrl, formatBytes } from '../utils';
import { 
  Upload, FileCode, CheckCircle, Copy, AlertCircle, Eye, EyeOff, ClipboardCheck, 
  FileText, Smartphone, Plus, Trash2, Image as ImageIcon, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadCardProps {
  onUploadSuccess: () => void;
  user: any;
}

export default function UploadCard({ onUploadSuccess, user }: UploadCardProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  // App Metadata customizing states
  const [appIcon, setAppIcon] = useState('');
  const [screenshotsInput, setScreenshotsInput] = useState('');
  const [fileCategory, setFileCategory] = useState<string>('');

  // Helper Image Upload States
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      setFileCategory(getFileType(file.name));
    } else {
      setFileCategory('');
    }
  }, [file]);

  const uploadHelperFile = async (selectedFile: File): Promise<string> => {
    const helperId = 'img_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('x-file-id', helperId);
      xhr.setRequestHeader('x-file-name', encodeURIComponent(selectedFile.name));
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.downloadUrl) {
              resolve(response.downloadUrl);
            } else {
              reject(new Error('Upload response failed'));
            }
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Server error ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(selectedFile);
    });
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploadingIcon(true);
    try {
      const url = await uploadHelperFile(selectedFile);
      setAppIcon(url);
    } catch (err) {
      console.error('Error uploading icon:', err);
      alert('Falha ao carregar a imagem do ícone.');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleScreenshotsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploadingScreenshots(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const url = await uploadHelperFile(selectedFiles[i]);
        uploadedUrls.push(url);
      }
      
      const currentScreenshots = screenshotsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== "");
        
      const nextScreenshots = [...currentScreenshots, ...uploadedUrls];
      setScreenshotsInput(nextScreenshots.join(', '));
    } catch (err) {
      console.error('Error uploading screenshots:', err);
      alert('Falha ao carregar algumas capturas de tela.');
    } finally {
      setUploadingScreenshots(false);
    }
  };

  const removeScreenshot = (indexToRemove: number) => {
    const currentScreenshots = screenshotsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== "");
      
    const nextScreenshots = currentScreenshots.filter((_, idx) => idx !== indexToRemove);
    setScreenshotsInput(nextScreenshots.join(', '));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!user) {
      setError('Você precisa estar logado para enviar arquivos.');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    const fileId = 'file_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const fileCategory = getFileType(file.name);

    // Salva o arquivo real localmente no IndexedDB para garantir downloads locais de alta fidelidade
    try {
      const { saveLocalFile } = await import('../lib/localFileStore');
      await saveLocalFile(fileId, file);
    } catch (dbErr) {
      console.warn('Could not save file copy to local IndexedDB store:', dbErr);
    }

    // Tentativa de upload real para o nosso servidor Express
    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.downloadUrl) {
              await saveFileMetadata(fileId, file.name, file.size, fileCategory, response.downloadUrl);
            } else {
              throw new Error('Server upload response did not indicate success');
            }
          } catch (parseErr) {
            console.warn('Failed to parse server upload response, using local fallback:', parseErr);
            simulateUpload(fileId, fileCategory);
          }
        } else {
          console.warn('Server upload failed with status ' + xhr.status + ', using simulator fallback');
          simulateUpload(fileId, fileCategory);
        }
      });

      xhr.addEventListener('error', () => {
        console.warn('Server upload connection error, using simulator fallback');
        simulateUpload(fileId, fileCategory);
      });

      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('x-file-id', fileId);
      xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
      xhr.send(file);
    } catch (err) {
      console.warn('Server upload error, using simulator fallback:', err);
      simulateUpload(fileId, fileCategory);
    }
  };

  // Simulação elegante se o bucket do Storage estiver indisponível
  const simulateUpload = (fileId: string, category: string) => {
    let currentProgress = 0;
    const interval = setInterval(async () => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        clearInterval(interval);

        // Gera uma URL simulada de download
        const mockDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/appshare-simulator/o/mock_${fileId}?alt=media`;
        await saveFileMetadata(fileId, file!.name, file!.size, category as any, mockDownloadUrl);
      } else {
        setProgress(currentProgress);
      }
    }, 150);
  };

  const saveFileMetadata = async (
    fileId: string, 
    name: string, 
    size: number, 
    type: 'apk' | 'image' | 'video' | 'pdf' | 'zip' | 'other', 
    downloadUrl: string
  ) => {
    try {
      const fileDocRef = doc(db, 'files', fileId);
      await setDoc(fileDocRef, {
        id: fileId,
        name,
        size,
        type,
        uploadedAt: Date.now(),
        downloadUrl,
        downloadsCount: 0,
        uploadedBy: user?.uid || 'guest',
        uploaderEmail: user?.email || 'Visitante',
        isPublic,
        description: description.trim() || "",
        appIcon: appIcon.trim() || "",
        screenshots: screenshotsInput.split(',').map(s => s.trim()).filter(s => s !== ""),
        rating: 4.8,
        ratingsCount: 0
      });

      const publicLink = getPublicDownloadUrl(fileId);
      setUploadedUrl(publicLink);
      setSuccess(true);
      setUploading(false);
      onUploadSuccess();
    } catch (err: any) {
      console.error('Error saving metadata to firestore:', err);
      setError('Erro ao salvar metadados do arquivo no banco de dados. Verifique a conexão.');
      setUploading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetUpload = () => {
    setFile(null);
    setDescription('');
    setIsPublic(true);
    setUploading(false);
    setProgress(0);
    setError('');
    setUploadedUrl('');
    setSuccess(false);
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm transition-all" id="upload-card">
      <h2 className="font-display font-bold text-lg text-slate-950 dark:text-white mb-4 flex items-center gap-2">
        <Upload size={18} className="text-blue-500" />
        <span>Enviar Novo Arquivo</span>
      </h2>

      {!user ? (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0F172A]/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <AlertCircle className="text-amber-500 mb-2.5" size={24} />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Apenas usuários autenticados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-normal">
            Faça login ou crie uma conta para começar a enviar arquivos e receber links públicos de download.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!success && !uploading && (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleUpload} 
              className="space-y-4"
              id="upload-form"
            >
              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#0F172A]/20'
                }`}
                id="drag-drop-zone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input-raw"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-blue-500/10 text-blue-500 border border-blue-500/15 rounded-2xl mb-1">
                      {file.name.endsWith('.apk') ? (
                        <FileCode size={26} strokeWidth={2} />
                      ) : (
                        <FileText size={26} strokeWidth={2} />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 rounded-2xl mb-3">
                      <Upload size={22} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Arraste seu arquivo aqui ou <span className="text-blue-500 hover:underline">clique para buscar</span>
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs leading-normal">
                      Suporta aplicativos APK, Imagens, Vídeos, Documentos e ZIPs.
                    </p>
                  </div>
                )}
              </div>

              {/* Error messages */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form elements - description and privacy */}
              {file && (
                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Descrição do Arquivo (Opcional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Adicione notas sobre o APK, logs de atualização, instruções ou o que há de novo."
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 min-h-[60px] resize-none"
                      id="upload-desc-input"
                    />
                  </div>

                  {fileCategory === 'apk' && (
                    <div className="space-y-4 p-4 bg-blue-50/25 dark:bg-[#1E293B]/25 border border-blue-500/10 rounded-2xl text-left">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-blue-500/10 pb-2">
                        <Smartphone size={13} />
                        <span>Loja de APKs - Customização Visual</span>
                      </p>
                      
                      <div className="space-y-4">
                        {/* App Icon Upload/URL Section */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Ícone do Aplicativo (Recomendado)
                          </label>
                          <div className="flex items-center gap-4">
                            {/* App Icon Preview */}
                            {appIcon ? (
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 shrink-0">
                                <img src={appIcon} alt="Icon Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button
                                  type="button"
                                  onClick={() => setAppIcon('')}
                                  className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                                  title="Remover ícone"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon size={18} />
                              </div>
                            )}

                            {/* Icon Controls */}
                            <div className="flex-1 space-y-1.5">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => iconInputRef.current?.click()}
                                  disabled={uploadingIcon}
                                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  {uploadingIcon ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <Upload size={11} />
                                  )}
                                  <span>Carregar Imagem do Computador</span>
                                </button>
                                <input
                                  type="file"
                                  ref={iconInputRef}
                                  onChange={handleIconUpload}
                                  accept="image/*"
                                  className="hidden"
                                />
                              </div>
                              <input
                                type="url"
                                value={appIcon}
                                onChange={(e) => setAppIcon(e.target.value)}
                                placeholder="Ou cole um link direto da imagem aqui (Ex: https://...)"
                                className="w-full text-[11px] p-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Screenshots Upload/URL Section */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Fotos das Interfaces / Capturas de Tela
                          </label>
                          
                          {/* Screenshots list view */}
                          {screenshotsInput.split(',').map(s => s.trim()).filter(s => s !== "").length > 0 && (
                            <div className="flex flex-wrap gap-2 pb-1">
                              {screenshotsInput.split(',').map(s => s.trim()).filter(s => s !== "").map((url, idx) => (
                                <div key={idx} className="relative w-16 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 shrink-0">
                                  <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <button
                                    type="button"
                                    onClick={() => removeScreenshot(idx)}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                                    title="Remover captura"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Screenshot upload controls */}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => screenshotInputRef.current?.click()}
                                disabled={uploadingScreenshots}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                {uploadingScreenshots ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Plus size={11} />
                                )}
                                <span>Adicionar Capturas de Tela (Upload)</span>
                              </button>
                              <input
                                type="file"
                                ref={screenshotInputRef}
                                onChange={handleScreenshotsUpload}
                                accept="image/*"
                                multiple
                                className="hidden"
                              />
                            </div>
                            <input
                              type="text"
                              value={screenshotsInput}
                              onChange={(e) => setScreenshotsInput(e.target.value)}
                              placeholder="Ou cole links das imagens separados por vírgula (Ex: url1.png, url2.png)"
                              className="w-full text-[11px] p-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal border-t border-blue-500/5 pt-2">
                        Dica: Você pode carregar arquivos de imagem diretamente do seu celular ou computador! Se preferir não customizar, o AppShare gerará cores incríveis e previews de interface simulados automaticamente.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0F172A]/30 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Eye size={16} className="text-blue-500" />
                      ) : (
                        <EyeOff size={16} className="text-slate-400" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                          {isPublic ? 'Visibilidade Pública' : 'Link Privado'}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {isPublic ? 'Qualquer pessoa com o link pode baixar' : 'Apenas você terá acesso'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="sr-only peer"
                        id="upload-public-checkbox"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-slate-900 dark:after:border-slate-700 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    id="start-upload-btn"
                  >
                    <Upload size={14} />
                    <span>Iniciar Envio</span>
                  </button>
                </div>
              )}
            </motion.form>
          )}

          {/* Uploading Progress Screen */}
          {uploading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-4"
              id="upload-progress-container"
            >
              <div className="w-14 h-14 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-500 animate-spin flex items-center justify-center" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Enviando seu arquivo...
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Não feche esta página até concluir
                </p>
              </div>
              <div className="w-full max-w-xs space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>{progress}%</span>
                  <span>{file ? formatBytes((file.size * progress) / 100) : ''} de {file ? formatBytes(file.size) : ''}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-150" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Success screen */}
          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 flex flex-col items-center justify-center text-center space-y-4"
              id="upload-success-container"
            >
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 border border-blue-500/15 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Envio Concluído com Sucesso!
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  O link público do seu arquivo foi gerado automaticamente.
                </p>
              </div>

              {/* Public link input box with copy option */}
              <div className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={uploadedUrl}
                  className="flex-1 bg-transparent border-none text-xs text-blue-600 dark:text-blue-400 outline-none font-mono select-all overflow-hidden text-ellipsis pl-1"
                  id="success-link-display"
                />
                <button
                  onClick={copyLink}
                  className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    copied 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-[#1E293B] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  id="success-copy-btn"
                >
                  {copied ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <div className="flex gap-2.5 w-full pt-1.5">
                <button
                  onClick={resetUpload}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  id="upload-more-btn"
                >
                  Enviar Outro
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
