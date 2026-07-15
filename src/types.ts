export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: 'apk' | 'image' | 'video' | 'pdf' | 'zip' | 'other';
  uploadedAt: number; // timestamp
  downloadUrl: string;
  downloadsCount: number;
  uploadedBy: string;
  uploaderEmail: string;
  isPublic: boolean;
  description?: string;
  isFavorite?: boolean;
  appIcon?: string;
  screenshots?: string[];
  rating?: number;
  ratingsCount?: number;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  createdAt: number;
  status: 'active' | 'suspended';
}

export interface AppStats {
  totalFiles: number;
  totalDownloads: number;
  totalUsers: number;
  totalStorageBytes: number;
}
