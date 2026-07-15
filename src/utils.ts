import { SharedFile } from './types';

// Formata bytes para tamanhos legíveis (KB, MB, GB, etc.)
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Formata data timestamp para formato local do Brasil
export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Determina o tipo de arquivo baseado na extensão do nome
export function getFileType(fileName: string): 'apk' | 'image' | 'video' | 'pdf' | 'zip' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'other';
  if (ext === 'apk') return 'apk';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  return 'other';
}

// Retorna uma cor de fundo para o tipo de arquivo
export function getFileTypeColor(type: string): string {
  switch (type) {
    case 'apk': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'image': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'video': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'pdf': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'zip': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  }
}

// Retorna um tema visual consistente baseado no ID do arquivo/aplicativo para gradientes e cores
export function getAppAestheticTheme(id: string) {
  const sum = (id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const options = [
    { gradient: 'from-blue-600 to-indigo-700', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/15', color: 'text-blue-500', button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' },
    { gradient: 'from-emerald-600 to-teal-700', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15', color: 'text-emerald-500', button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' },
    { gradient: 'from-rose-600 to-pink-700', bg: 'bg-rose-500/10 text-rose-500 border-rose-500/15', color: 'text-rose-500', button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' },
    { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/15', color: 'text-amber-500', button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' },
    { gradient: 'from-purple-600 to-violet-700', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/15', color: 'text-purple-500', button: 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' },
    { gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/15', color: 'text-cyan-500', button: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20' }
  ];
  return options[sum % options.length];
}

// Gera um link de página de download pública no estilo MediaFire
// Usaremos um link baseado em hash para funcionar perfeitamente no ambiente SPA do AI Studio
export function getPublicDownloadUrl(fileId: string): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?d=${fileId}`;
}
