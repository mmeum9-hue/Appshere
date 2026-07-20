import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 600KB chunk size of binary data (turns into ~800KB base64 string, safe for 1MB Firestore document limit)
const CHUNK_SIZE = 600000;

// Maximum size allowed for Firestore chunked storage (15MB) to preserve quota
export const MAX_CHUNKS_FILE_SIZE = 15728640; 

/**
 * Converts a Blob/File slice to a base64 string natively and efficiently
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('Failed to read file slice as Base64'));
        return;
      }
      // Extract the raw base64 string from data URL
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a base64 string to a Blob natively using optimized fetch
 */
export async function base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Uploads a file in chunks to Firestore.
 * Naming scheme of chunk documents is `${fileId}_chunk_${index}` for index-free fast sequential retrieval.
 */
export async function uploadFileToFirestore(
  fileId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<string> {
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  console.log(`Starting Firestore chunked upload for ${file.name} (${totalSize} bytes, ${totalChunks} chunks)`);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const slice = file.slice(start, end);

    const base64Data = await blobToBase64(slice);
    const chunkDocId = `${fileId}_chunk_${chunkIndex}`;

    // Upload chunk document
    await setDoc(doc(db, 'file_chunks', chunkDocId), {
      fileId,
      chunkIndex,
      totalChunks,
      data: base64Data,
      uploadedAt: Date.now()
    });

    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    onProgress(progress);
  }

  console.log(`Firestore chunked upload completed for fileId: ${fileId}`);
  return `firestore-chunks://${fileId}`;
}

/**
 * Downloads and re-assembles file chunks from Firestore.
 */
export async function downloadFileFromFirestore(
  fileId: string,
  fileName: string,
  mimeType: string,
  onProgress: (pct: number) => void
): Promise<Blob> {
  console.log(`Starting Firestore chunked download for fileId: ${fileId}`);

  const base64Chunks: string[] = [];
  let chunkIndex = 0;
  let totalChunks = 1; // Updated dynamically from the first chunk

  while (chunkIndex < totalChunks) {
    const chunkDocId = `${fileId}_chunk_${chunkIndex}`;
    const chunkDocRef = doc(db, 'file_chunks', chunkDocId);
    const chunkDocSnap = await getDoc(chunkDocRef);

    if (!chunkDocSnap.exists()) {
      throw new Error(`Arquivo corrompido ou incompleto: chunk ${chunkIndex} não encontrado.`);
    }

    const chunkData = chunkDocSnap.data();
    base64Chunks.push(chunkData.data);
    totalChunks = chunkData.totalChunks || 1;

    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    onProgress(progress);

    chunkIndex++;
  }

  console.log(`All ${totalChunks} chunks retrieved, reassembling binary data...`);

  // Convert all base64 chunks back to individual blobs and concatenate
  const blobPromises = base64Chunks.map(base64 => base64ToBlob(base64, mimeType));
  const blobs = await Promise.all(blobPromises);

  return new Blob(blobs, { type: mimeType });
}

/**
 * Deletes all file chunks from Firestore for a given file.
 */
export async function deleteFileFromFirestore(fileId: string, estimatedChunks: number = 30): Promise<void> {
  console.log(`Deleting Firestore chunks for fileId: ${fileId}`);
  for (let chunkIndex = 0; chunkIndex < estimatedChunks; chunkIndex++) {
    const chunkDocId = `${fileId}_chunk_${chunkIndex}`;
    const chunkDocRef = doc(db, 'file_chunks', chunkDocId);
    try {
      const snap = await getDoc(chunkDocRef);
      if (snap.exists()) {
        await deleteDoc(chunkDocRef);
      } else {
        // Sequentially named chunks, if one doesn't exist, we've likely hit the end
        break;
      }
    } catch (err) {
      console.warn(`Could not delete chunk ${chunkDocId}:`, err);
    }
  }
}
