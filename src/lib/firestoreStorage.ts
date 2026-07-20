import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 600KB chunk size of binary data (turns into ~800KB base64 string, safe for 1MB Firestore document limit)
const CHUNK_SIZE = 600000;

// Maximum size allowed for Firestore chunked storage (100MB) for robust storage fallback
export const MAX_CHUNKS_FILE_SIZE = 104857600; 

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
 * Uploads a file in chunks to Firestore in parallel for maximum speed.
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

  let completedChunks = 0;
  const CONCURRENCY = 5; // Upload up to 5 chunks in parallel for high speed

  // Function to upload a specific chunk
  const uploadChunk = async (chunkIndex: number) => {
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

    completedChunks++;
    const progress = Math.round((completedChunks / totalChunks) * 100);
    onProgress(progress);
  };

  // Run with parallel execution using a sliding concurrency pool
  const chunkIndexes = Array.from({ length: totalChunks }, (_, i) => i);
  const queue = [...chunkIndexes];
  
  const workers = Array(Math.min(CONCURRENCY, totalChunks)).fill(null).map(async () => {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index !== undefined) {
        await uploadChunk(index);
      }
    }
  });

  await Promise.all(workers);

  console.log(`Firestore chunked upload completed for fileId: ${fileId}`);
  return `firestore-chunks://${fileId}`;
}

/**
 * Downloads and re-assembles file chunks from Firestore using parallel workers.
 */
export async function downloadFileFromFirestore(
  fileId: string,
  fileName: string,
  mimeType: string,
  onProgress: (pct: number) => void
): Promise<Blob> {
  console.log(`Starting Firestore chunked download for fileId: ${fileId}`);

  // 1. Fetch chunk 0 first to determine the total count of chunks
  const chunk0DocId = `${fileId}_chunk_0`;
  const chunk0Snap = await getDoc(doc(db, 'file_chunks', chunk0DocId));

  if (!chunk0Snap.exists()) {
    throw new Error(`Arquivo não encontrado ou corrompido: chunk inicial não encontrado.`);
  }

  const chunk0Data = chunk0Snap.data();
  const totalChunks = chunk0Data.totalChunks || 1;

  const base64Chunks: string[] = new Array(totalChunks);
  base64Chunks[0] = chunk0Data.data;

  let completedCount = 1;
  onProgress(Math.round((completedCount / totalChunks) * 100));

  if (totalChunks > 1) {
    // Fetch remaining chunks in parallel
    const CONCURRENCY = 6;
    const remainingIndexes = Array.from({ length: totalChunks - 1 }, (_, i) => i + 1);
    const queue = [...remainingIndexes];

    const workers = Array(Math.min(CONCURRENCY, queue.length)).fill(null).map(async () => {
      while (queue.length > 0) {
        const index = queue.shift();
        if (index !== undefined) {
          const chunkDocId = `${fileId}_chunk_${index}`;
          const snap = await getDoc(doc(db, 'file_chunks', chunkDocId));
          if (!snap.exists()) {
            throw new Error(`Arquivo corrompido ou incompleto: chunk ${index} não encontrado.`);
          }
          base64Chunks[index] = snap.data().data;
          completedCount++;
          onProgress(Math.round((completedCount / totalChunks) * 100));
        }
      }
    });

    await Promise.all(workers);
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
