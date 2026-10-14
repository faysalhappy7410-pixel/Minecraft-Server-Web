import {
  collection,
  DocumentData,
  Firestore,
  getDocs,
} from 'firebase/firestore';
import {
  deleteObject,
  FirebaseStorage,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  StorageReference,
} from 'firebase/storage';

export interface StorageImageItem {
  fullPath: string; // e.g., 'cms/game_modes/1728876400000_pvp.png'
  name: string; // e.g., '1728876400000_pvp.png'
  bucket: string;
  downloadUrl: string;
  sizeBytes: number;
  contentType?: string;
  timeCreated?: string;
  updated?: string;
  folder: string; // e.g., 'cms/game_modes' or 'users/...'
  isOrphan: boolean;
  matchedReference?: {
    collection: string;
    docId: string;
    field: string;
    url: string;
  };
}

export interface FirestoreImageReference {
  collection: string;
  docId: string;
  field: string;
  url: string;
  rawPath?: string;
  fileName?: string;
}

export interface FirestoreScanSummary {
  scannedAt: string;
  totalDocsScanned: number;
  totalActiveImageRefs: number;
  collectionBreakdown: Record<string, { docs: number; images: number }>;
  activeReferences: FirestoreImageReference[];
  activeUrls: Set<string>;
  activePaths: Set<string>;
  activeFilenames: Set<string>;
}

export interface CleanupScanReport {
  scannedAt: string;
  totalStorageFiles: number;
  totalStorageBytes: number;
  usedImages: StorageImageItem[];
  orphanImages: StorageImageItem[];
  orphanBytes: number;
  firestoreSummary: {
    totalDocsScanned: number;
    totalActiveImageRefs: number;
    collectionBreakdown: Record<string, { docs: number; images: number }>;
  };
  errors: string[];
}

// Canonical collections to scan for active images
export const COLLECTIONS_TO_SCAN = [
  'leaderboards',
  'challengers',
  'warps',
  'game_modes', // Warps & Realms CMS collection
  'users',
  'events',
  'news',
  'gallery',
  'staff',
  'stories',
  'site_settings',
  'testimonials',
  'commands',
  'rules',
  'faqs',
  'social_links',
];

/**
 * Extracts storage path and clean filename from a Firebase Storage download URL or raw path
 */
export function parseStoragePathFromUrl(rawUrl: string): { storagePath?: string; fileName?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') return {};
  const trimmed = rawUrl.trim();

  // 1. Firebase Storage URL format:
  // https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[encodedPath]?alt=media&token=...
  if (trimmed.includes('/o/')) {
    try {
      const parts = trimmed.split('/o/');
      if (parts.length > 1) {
        const pathPart = parts[1].split('?')[0];
        const decodedPath = decodeURIComponent(pathPart);
        const fileName = decodedPath.split('/').pop() || decodedPath;
        return { storagePath: decodedPath, fileName };
      }
    } catch {
      // Fall through
    }
  }

  // 2. Google Cloud Storage URI format: gs://bucket/path/to/file.png
  if (trimmed.startsWith('gs://')) {
    const withoutGs = trimmed.replace(/^gs:\/\/[^/]+\//, '');
    const fileName = withoutGs.split('/').pop() || withoutGs;
    return { storagePath: withoutGs, fileName };
  }

  // 3. Relative or absolute local path: /cms/warps/file.png or cms/warps/file.png
  if (trimmed.startsWith('/cms/') || trimmed.startsWith('cms/') || trimmed.startsWith('/users/') || trimmed.startsWith('users/')) {
    const normalized = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const cleanPath = normalized.split('?')[0];
    const fileName = cleanPath.split('/').pop() || cleanPath;
    return { storagePath: cleanPath, fileName };
  }

  // 4. Any other URL with an image filename
  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname;
    const fileName = pathname.split('/').pop();
    if (fileName && fileName.includes('.')) {
      return { fileName };
    }
  } catch {
    // If not a standard URL, check if string has filename pattern
    const lastPart = trimmed.split('/').pop();
    if (lastPart && lastPart.includes('.')) {
      return { fileName: lastPart.split('?')[0] };
    }
  }

  return {};
}

/**
 * Recursively inspects a document object to find all image URLs and references
 */
function extractDocImageReferences(
  collectionName: string,
  docId: string,
  data: DocumentData
): FirestoreImageReference[] {
  const refs: FirestoreImageReference[] = [];

  function walk(current: unknown, path = '') {
    if (!current) return;
    if (typeof current === 'string') {
      const val = current.trim();
      const lowerVal = val.toLowerCase();
      const lowerPath = path.toLowerCase();

      const isImageIndicatorKey =
        lowerPath.includes('image') ||
        lowerPath.includes('avatar') ||
        lowerPath.includes('banner') ||
        lowerPath.includes('photo') ||
        lowerPath.includes('skin') ||
        lowerPath.includes('icon') ||
        lowerPath.includes('proof') ||
        lowerPath.includes('screenshot');

      const isStorageOrImageUrl =
        val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('gs://') ||
        val.startsWith('/cms/') ||
        val.startsWith('cms/') ||
        val.startsWith('/users/') ||
        val.startsWith('users/') ||
        val.startsWith('data:image/');

      const hasImageExtension =
        /\.(png|jpe?g|webp|gif|svg|bmp|ico)(\?.*)?$/i.test(val);

      if ((isStorageOrImageUrl && (hasImageExtension || isImageIndicatorKey || val.includes('firebasestorage'))) || (isImageIndicatorKey && val.length > 3)) {
        const { storagePath, fileName } = parseStoragePathFromUrl(val);
        refs.push({
          collection: collectionName,
          docId,
          field: path,
          url: val,
          rawPath: storagePath,
          fileName,
        });
      }
    } else if (Array.isArray(current)) {
      current.forEach((item, idx) => walk(item, `${path}[${idx}]`));
    } else if (typeof current === 'object') {
      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        walk(value, path ? `${path}.${key}` : key);
      }
    }
  }

  walk(data);
  return refs;
}

/**
 * Step 1: Scan Firestore database collections (Leaderboard, Challengers, Warps, Users, CMS)
 * to collect all active image URLs and references.
 */
export async function scanFirestoreActiveImages(db: Firestore): Promise<FirestoreScanSummary> {
  const summary: FirestoreScanSummary = {
    scannedAt: new Date().toISOString(),
    totalDocsScanned: 0,
    totalActiveImageRefs: 0,
    collectionBreakdown: {},
    activeReferences: [],
    activeUrls: new Set<string>(),
    activePaths: new Set<string>(),
    activeFilenames: new Set<string>(),
  };

  for (const colName of COLLECTIONS_TO_SCAN) {
    try {
      const snap = await getDocs(collection(db, colName));
      const docsCount = snap.size;
      let colImagesCount = 0;

      snap.forEach((docSnap) => {
        summary.totalDocsScanned += 1;
        const data = docSnap.data();
        const extracted = extractDocImageReferences(colName, docSnap.id, data);

        for (const item of extracted) {
          colImagesCount += 1;
          summary.totalActiveImageRefs += 1;
          summary.activeReferences.push(item);

          if (item.url) summary.activeUrls.add(item.url);
          if (item.rawPath) {
            summary.activePaths.add(item.rawPath);
            summary.activePaths.add(item.rawPath.toLowerCase());
          }
          if (item.fileName) {
            summary.activeFilenames.add(item.fileName);
            summary.activeFilenames.add(item.fileName.toLowerCase());
          }
        }
      });

      summary.collectionBreakdown[colName] = {
        docs: docsCount,
        images: colImagesCount,
      };
    } catch {
      // Collection may be empty or not yet seeded; record as 0
      summary.collectionBreakdown[colName] = { docs: 0, images: 0 };
    }
  }

  return summary;
}

/**
 * Recursively list all StorageReference items under a given folder in Firebase Storage
 */
async function listAllRecursive(targetRef: StorageReference, depth = 0): Promise<StorageReference[]> {
  if (depth > 5) return []; // safety limit
  const results: StorageReference[] = [];

  try {
    const listRes = await listAll(targetRef);
    results.push(...listRes.items);

    for (const prefix of listRes.prefixes) {
      const subItems = await listAllRecursive(prefix, depth + 1);
      results.push(...subItems);
    }
  } catch {
    // If listing subfolder is prohibited or empty, continue gracefully
  }

  return results;
}

/**
 * Step 2 & 3: Cross-check storage files against Firestore active references
 * to identify used vs orphan images.
 */
export async function scanFirebaseStorageImages(
  storage: FirebaseStorage,
  firestoreScan: FirestoreScanSummary
): Promise<CleanupScanReport> {
  const errors: string[] = [];
  const foundRefsMap = new Map<string, StorageReference>();

  // List of primary root folders and known categories to inspect
  const searchRoots = [
    '', // root
    'cms',
    'cms/game_modes',
    'cms/warps',
    'cms/leaderboards',
    'cms/challengers',
    'cms/events',
    'cms/news',
    'cms/gallery',
    'cms/staff',
    'cms/stories',
    'users',
    'warps',
    'leaderboards',
    'challengers',
    'uploads',
  ];

  for (const rootPath of searchRoots) {
    try {
      const folderRef = ref(storage, rootPath);
      const items = await listAllRecursive(folderRef);
      for (const item of items) {
        if (!foundRefsMap.has(item.fullPath)) {
          foundRefsMap.set(item.fullPath, item);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (rootPath === '' && !errors.includes(msg)) {
        errors.push(`Root storage inspection: ${msg}`);
      }
    }
  }

  const allStorageRefs = Array.from(foundRefsMap.values());
  const usedImages: StorageImageItem[] = [];
  const orphanImages: StorageImageItem[] = [];
  let totalStorageBytes = 0;
  let orphanBytes = 0;

  // Retrieve metadata & download URL in parallel batches
  const BATCH_SIZE = 8;
  for (let i = 0; i < allStorageRefs.length; i += BATCH_SIZE) {
    const batch = allStorageRefs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (fileRef) => {
        let sizeBytes = 0;
        let contentType: string | undefined;
        let timeCreated: string | undefined;
        let updated: string | undefined;
        let downloadUrl = '';

        try {
          const meta = await getMetadata(fileRef);
          sizeBytes = meta.size || 0;
          contentType = meta.contentType;
          timeCreated = meta.timeCreated;
          updated = meta.updated;
        } catch {
          // Metadata fetch fallback
        }

        try {
          downloadUrl = await getDownloadURL(fileRef);
        } catch {
          downloadUrl = '';
        }

        totalStorageBytes += sizeBytes;

        const fullPath = fileRef.fullPath;
        const fileName = fileRef.name;
        const lowerFullPath = fullPath.toLowerCase();
        const lowerFileName = fileName.toLowerCase();
        const encodedFullPath = encodeURIComponent(fullPath);

        // Check if this file is actively referenced in Firestore
        let isUsed = false;
        let matchedRef: FirestoreImageReference | undefined;

        // 1. Direct path or normalized path match
        if (
          firestoreScan.activePaths.has(fullPath) ||
          firestoreScan.activePaths.has(lowerFullPath) ||
          firestoreScan.activeFilenames.has(fileName) ||
          firestoreScan.activeFilenames.has(lowerFileName)
        ) {
          isUsed = true;
          matchedRef = firestoreScan.activeReferences.find(
            (r) =>
              r.rawPath === fullPath ||
              r.rawPath?.toLowerCase() === lowerFullPath ||
              r.fileName === fileName ||
              r.fileName?.toLowerCase() === lowerFileName
          );
        }

        // 2. Direct download URL match
        if (!isUsed && downloadUrl && firestoreScan.activeUrls.has(downloadUrl)) {
          isUsed = true;
          matchedRef = firestoreScan.activeReferences.find((r) => r.url === downloadUrl);
        }

        // 3. Substring check across all active URLs
        if (!isUsed) {
          for (const refItem of firestoreScan.activeReferences) {
            const raw = refItem.url;
            if (
              raw.includes(encodedFullPath) ||
              raw.includes(fullPath) ||
              (fileName.length > 5 && raw.includes(fileName))
            ) {
              isUsed = true;
              matchedRef = refItem;
              break;
            }
          }
        }

        const pathSegments = fullPath.split('/');
        const folder = pathSegments.length > 1 ? pathSegments.slice(0, -1).join('/') : 'root';

        const itemData: StorageImageItem = {
          fullPath,
          name: fileName,
          bucket: fileRef.bucket,
          downloadUrl,
          sizeBytes,
          contentType,
          timeCreated,
          updated,
          folder,
          isOrphan: !isUsed,
          matchedReference: matchedRef
            ? {
                collection: matchedRef.collection,
                docId: matchedRef.docId,
                field: matchedRef.field,
                url: matchedRef.url,
              }
            : undefined,
        };

        if (isUsed) {
          usedImages.push(itemData);
        } else {
          orphanImages.push(itemData);
          orphanBytes += sizeBytes;
        }
      })
    );
  }

  return {
    scannedAt: new Date().toISOString(),
    totalStorageFiles: allStorageRefs.length,
    totalStorageBytes,
    usedImages,
    orphanImages,
    orphanBytes,
    firestoreSummary: {
      totalDocsScanned: firestoreScan.totalDocsScanned,
      totalActiveImageRefs: firestoreScan.totalActiveImageRefs,
      collectionBreakdown: firestoreScan.collectionBreakdown,
    },
    errors,
  };
}

/**
 * Step 4: Safely delete a single orphan image from Firebase Storage
 */
export async function deleteStorageImage(storage: FirebaseStorage, fullPath: string): Promise<void> {
  const fileRef = ref(storage, fullPath);
  await deleteObject(fileRef);
}

/**
 * Step 4: Safely purge a list of orphan images from Firebase Storage with progress tracking
 */
export async function purgeOrphanStorageImages(
  storage: FirebaseStorage,
  imagesToPurge: StorageImageItem[],
  onProgress?: (progress: { completed: number; total: number; currentPath: string }) => void
): Promise<{
  successCount: number;
  failureCount: number;
  freedBytes: number;
  errors: Array<{ path: string; error: string }>;
}> {
  let successCount = 0;
  let failureCount = 0;
  let freedBytes = 0;
  const errors: Array<{ path: string; error: string }> = [];

  for (let i = 0; i < imagesToPurge.length; i++) {
    const item = imagesToPurge[i];
    onProgress?.({
      completed: i,
      total: imagesToPurge.length,
      currentPath: item.fullPath,
    });

    try {
      await deleteStorageImage(storage, item.fullPath);
      successCount++;
      freedBytes += item.sizeBytes;
    } catch (err) {
      failureCount++;
      errors.push({
        path: item.fullPath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  onProgress?.({
    completed: imagesToPurge.length,
    total: imagesToPurge.length,
    currentPath: 'Complete',
  });

  return {
    successCount,
    failureCount,
    freedBytes,
    errors,
  };
}

/**
 * Helper to format byte counts into human-readable strings (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
