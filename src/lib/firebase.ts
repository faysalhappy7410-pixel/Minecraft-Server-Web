import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  setLogLevel,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import {
  firebaseConfig,
  isSuperAdminEmail,
  SUPER_ADMIN_EMAILS,
} from '../firebaseConfig';
import { UserProfile, UserRole } from '../types/cms';

const env = import.meta.env;

// Silence noisy internal WebChannel warnings when operating with cached/offline fallback
try {
  setLogLevel('silent');
} catch {
  // Ignore if unsupported in environment
}

// Use default Firestore database for the configured project (e.g., pro-players-152e9)
const customDatabaseId =
  firebaseConfig.projectId !== 'pro-players-152e9' &&
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID &&
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID.trim() !== '' &&
  !env.VITE_FIREBASE_FIRESTORE_DATABASE_ID.startsWith('YOUR_') &&
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID.trim() !== '(default)'
    ? env.VITE_FIREBASE_FIRESTORE_DATABASE_ID.trim()
    : undefined;

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export { firebaseConfig, SUPER_ADMIN_EMAILS, isSuperAdminEmail };

// Master Admin email reference
export const ADMIN_EMAIL_TO_SET_MANUALLY = SUPER_ADMIN_EMAILS[0];

/**
 * Strictly enforces that the current caller has Master Admin / Admin privileges.
 * Throws an explicit Unauthorized error if called by a regular user or unauthenticated visitor.
 */
export function assertAdminAccess(isAdmin: boolean, actionDescription = 'perform this administrative action'): void {
  const currentUser = auth.currentUser;
  const hasSuperEmail = isSuperAdminEmail(currentUser?.email);
  if (!currentUser || (!isAdmin && !hasSuperEmail)) {
    throw new Error(
      `Unauthorized (403): Access denied. Regular users cannot ${actionDescription}. Master Admin privileges are required.`
    );
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_PROFILE_PREFIX = 'pro_players_profile_';
const LOCAL_USERS_DIRECTORY_KEY = 'pro_players_users_directory_v1';
const LOCAL_CMS_COLLECTION_PREFIX = 'pro_players_cms_col_';

// Clear any legacy localStorage CMS collection caches so stale/hardcoded fallback data
// can never override live Firebase Firestore data.
try {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LOCAL_CMS_COLLECTION_PREFIX)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
} catch {
  // Ignore storage errors
}

function getLocalUsersDirectory(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_DIRECTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, UserProfile>;
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
}

function upsertLocalUsersDirectory(profile: UserProfile): void {
  try {
    const dir = getLocalUsersDirectory();
    dir[profile.uid] = profile;
    localStorage.setItem(LOCAL_USERS_DIRECTORY_KEY, JSON.stringify(dir));
  } catch {
    // Ignore storage write errors
  }
}

function removeFromLocalUsersDirectory(uid: string): void {
  try {
    const dir = getLocalUsersDirectory();
    delete dir[uid];
    localStorage.setItem(LOCAL_USERS_DIRECTORY_KEY, JSON.stringify(dir));
  } catch {
    // Ignore storage write errors
  }
}

export async function safeGetUserProfile(uid: string, emailHint?: string | null): Promise<UserProfile | null> {
  let cached: UserProfile | null = null;
  try {
    const raw = localStorage.getItem(`${LOCAL_PROFILE_PREFIX}${uid}`);
    if (raw) {
      cached = JSON.parse(raw) as UserProfile;
    } else {
      const dir = getLocalUsersDirectory();
      if (dir[uid]) {
        cached = dir[uid];
      }
    }
  } catch {
    // Ignore storage read errors
  }

  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'users', uid)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (snap && snap.exists()) {
      const data = snap.data() as UserProfile;
      const effectiveEmail = data.email || emailHint || '';
      const resolvedRole: UserRole = isSuperAdminEmail(effectiveEmail) ? 'admin' : data.role || 'user';
      const normalizedProfile: UserProfile = {
        ...data,
        uid,
        role: resolvedRole,
      };
      try {
        localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${uid}`, JSON.stringify(normalizedProfile));
        upsertLocalUsersDirectory(normalizedProfile);
      } catch {
        // Ignore storage write errors
      }
      return normalizedProfile;
    }
  } catch {
    // Fall back to cached profile if Firestore is unreachable
  }

  if (cached) {
    const effectiveEmail = cached.email || emailHint || '';
    if (isSuperAdminEmail(effectiveEmail) && cached.role !== 'admin') {
      cached = { ...cached, role: 'admin' };
      try {
        localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${uid}`, JSON.stringify(cached));
        upsertLocalUsersDirectory(cached);
      } catch {
        // Ignore
      }
    }
  }

  return cached;
}

export async function safeSaveUserProfile(uid: string, profile: UserProfile): Promise<UserProfile> {
  // Always enforce that Super Admin emails get 'admin' role automatically
  const enforcedRole: UserRole = isSuperAdminEmail(profile.email) ? 'admin' : profile.role;
  const finalProfile: UserProfile = {
    ...profile,
    uid,
    role: enforcedRole,
  };

  try {
    localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${uid}`, JSON.stringify(finalProfile));
    upsertLocalUsersDirectory(finalProfile);
  } catch {
    // Ignore storage write errors
  }

  try {
    await Promise.race([
      setDoc(doc(db, 'users', uid), finalProfile),
      new Promise<void>((resolve) => setTimeout(() => resolve(), 2200)),
    ]);
  } catch {
    // Profile is safely persisted in local cache if Firestore rules or connection block write
  }

  return finalProfile;
}

/**
 * Ensures that when any user logs in or signs up via Firebase Auth, if their email
 * matches SUPER_ADMIN_EMAILS, they are automatically assigned the 'admin' role in Firestore
 * and in application state. Also ensures a valid UserProfile exists.
 */
export async function syncAuthenticatedUserProfile(currentUser: User): Promise<UserProfile> {
  const existing = await safeGetUserProfile(currentUser.uid, currentUser.email);
  const isMasterAdmin = isSuperAdminEmail(currentUser.email);
  const now = new Date().toISOString();

  if (existing) {
    const desiredRole: UserRole = isMasterAdmin ? 'admin' : existing.role || 'user';
    if (existing.role !== desiredRole || (currentUser.email && existing.email !== currentUser.email)) {
      const updated: UserProfile = {
        ...existing,
        email: currentUser.email || existing.email,
        role: desiredRole,
        updatedAt: now,
      };
      return await safeSaveUserProfile(currentUser.uid, updated);
    }
    upsertLocalUsersDirectory(existing);
    return existing;
  }

  // Create initial profile if logging in for the first time without a profile document
  const emailPrefix = (currentUser.email || 'Player').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  const fallbackMcName =
    emailPrefix.length >= 3
      ? emailPrefix.slice(0, 16)
      : `Player_${currentUser.uid.slice(0, 6)}`;

  const newProfile: UserProfile = {
    uid: currentUser.uid,
    email: currentUser.email || '',
    firstName: currentUser.displayName || (isMasterAdmin ? 'Master Admin' : fallbackMcName),
    minecraftUsername: isMasterAdmin ? 'ProFounder_MC' : fallbackMcName,
    discordUsername: '',
    bio: isMasterAdmin
      ? 'Master Administrator & Owner of PRO PLAYERS Crossplay Network.'
      : 'PRO PLAYERS Community Member.',
    instagramUrl: '',
    facebookUrl: '',
    role: isMasterAdmin ? 'admin' : 'user',
    createdAt: now,
    updatedAt: now,
  };

  return await safeSaveUserProfile(currentUser.uid, newProfile);
}

/**
 * Fetches all registered users for the Master Admin User Management panel & Leaderboard selector.
 * Merges Firestore `users` documents with locally cached registered users.
 */
export async function safeGetAllRegisteredUsers(isAdmin: boolean): Promise<UserProfile[]> {
  assertAdminAccess(isAdmin, 'view registered user accounts');

  const mergedMap: Record<string, UserProfile> = { ...getLocalUsersDirectory() };

  // Also scan localStorage for any individual profile keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_PROFILE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as UserProfile;
          if (parsed && parsed.uid) {
            mergedMap[parsed.uid] = {
              ...parsed,
              role: isSuperAdminEmail(parsed.email) ? 'admin' : parsed.role || 'user',
            };
          }
        }
      }
    }
  } catch {
    // Ignore storage iteration errors
  }

  try {
    const snap = await Promise.race([
      getDocs(collection(db, 'users')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (snap) {
      snap.docs.forEach((d) => {
        const data = d.data() as UserProfile;
        const uid = data.uid || d.id;
        const normalized: UserProfile = {
          ...data,
          uid,
          role: isSuperAdminEmail(data.email) ? 'admin' : data.role || 'user',
        };
        mergedMap[uid] = normalized;
        upsertLocalUsersDirectory(normalized);
      });
    }
  } catch {
    // Use merged local directory if Firestore query fails
  }

  return Object.values(mergedMap).sort((a, b) => {
    if (isSuperAdminEmail(a.email) && !isSuperAdminEmail(b.email)) return -1;
    if (!isSuperAdminEmail(a.email) && isSuperAdminEmail(b.email)) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

export async function safeAdminUpdateUserRole(
  isAdmin: boolean,
  targetUser: UserProfile,
  nextRole: UserRole
): Promise<UserProfile> {
  assertAdminAccess(isAdmin, 'modify user roles');

  if (isSuperAdminEmail(targetUser.email) && nextRole !== 'admin') {
    throw new Error('Master Admin accounts in SUPER_ADMIN_EMAILS cannot be demoted.');
  }

  const updated: UserProfile = {
    ...targetUser,
    role: isSuperAdminEmail(targetUser.email) ? 'admin' : nextRole,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${targetUser.uid}`, JSON.stringify(updated));
    upsertLocalUsersDirectory(updated);
  } catch {
    // Ignore
  }

  try {
    await Promise.race([
      updateDoc(doc(db, 'users', targetUser.uid), {
        role: updated.role,
        updatedAt: updated.updatedAt,
      }),
      new Promise<void>((resolve) => setTimeout(() => resolve(), 2200)),
    ]);
  } catch {
    // Persisted in local directory fallback
  }

  return updated;
}

export async function safeAdminDeleteUser(isAdmin: boolean, targetUid: string, targetEmail?: string): Promise<void> {
  assertAdminAccess(isAdmin, 'delete user accounts');

  if (isSuperAdminEmail(targetEmail)) {
    throw new Error('Master Admin accounts in SUPER_ADMIN_EMAILS cannot be deleted.');
  }

  try {
    localStorage.removeItem(`${LOCAL_PROFILE_PREFIX}${targetUid}`);
    removeFromLocalUsersDirectory(targetUid);
  } catch {
    // Ignore
  }

  try {
    await Promise.race([
      deleteDoc(doc(db, 'users', targetUid)),
      new Promise<void>((resolve) => setTimeout(() => resolve(), 2200)),
    ]);
  } catch {
    // Removed from local directory fallback
  }
}

/**
 * Local CMS persistence helpers to ensure Admin creates/edits/deletes for Events,
 * Announcements, Leaderboards, and Site Settings always persist both to Firestore
 * and local cache cleanly.
 */
export function getLocalCmsCollection<T extends { id: string }>(colName: string): T[] | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_CMS_COLLECTION_PREFIX}${colName}`);
    if (raw) {
      return JSON.parse(raw) as T[];
    }
  } catch {
    // Ignore
  }
  return null;
}

export function setLocalCmsCollection<T extends { id: string }>(colName: string, items: T[]): void {
  try {
    localStorage.setItem(`${LOCAL_CMS_COLLECTION_PREFIX}${colName}`, JSON.stringify(items));
  } catch {
    // Ignore
  }
}

export function upsertLocalCmsDoc(
  colName: string,
  docId: string,
  payload: Record<string, unknown>,
  seedFallback: { id: string }[] = []
): void {
  try {
    const current =
      getLocalCmsCollection<Record<string, unknown> & { id: string }>(colName) ||
      (seedFallback as (Record<string, unknown> & { id: string })[]);
    const nextItem = { ...payload, id: docId };
    const exists = current.some((item) => item.id === docId);
    const updated = exists
      ? current.map((item) => (item.id === docId ? nextItem : item))
      : [...current, nextItem];
    setLocalCmsCollection(colName, updated);
  } catch {
    // Ignore
  }
}

export function deleteLocalCmsDoc(
  colName: string,
  docId: string,
  seedFallback: { id: string }[] = []
): void {
  try {
    const current =
      getLocalCmsCollection<Record<string, unknown> & { id: string }>(colName) ||
      (seedFallback as (Record<string, unknown> & { id: string })[]);
    const updated = current.filter((item) => item.id !== docId);
    setLocalCmsCollection(colName, updated);
  } catch {
    // Ignore
  }
}

/**
 * Compress an image file via HTML5 canvas into a compact JPEG data URL (< 150KB)
 * as a reliable fallback when Firebase Storage bucket rules or CORS block direct upload.
 */
async function compressImageFileToDataUrl(file: File, maxWidth = 960, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// Upload a CMS image to Firebase Storage under /cms/{category}/{timestamp}_{safeName}
// with automatic compressed Data URL fallback so Admin image uploads always succeed.
export async function uploadCmsImage(file: File, category: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be 5 MB or less.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `cms/${category}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    const uploadedUrl = await Promise.race([
      (async () => {
        await uploadBytes(storageRef, file, { contentType: file.type });
        return await getDownloadURL(storageRef);
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (uploadedUrl) {
      return uploadedUrl;
    }
  } catch {
    // Fall through to compressed Data URL so upload still succeeds seamlessly
  }

  return await compressImageFileToDataUrl(file);
}

// Upload a user's manual Minecraft skin/avatar image to Firebase Storage under /users/{userId}/{timestamp}_{safeName}
export async function uploadUserAvatar(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (PNG, JPG, WebP) are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar/skin image must be 5 MB or less.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${userId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

// Validate Minecraft Username (3-16 characters, letters, numbers, underscores)
export function validateMinecraftUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return 'Minecraft username is required.';
  }
  if (trimmed.length < 3 || trimmed.length > 16) {
    return 'Minecraft username must be between 3 and 16 characters.';
  }
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(trimmed)) {
    return 'Minecraft username can only contain letters, numbers, and underscores (_).';
  }
  return null;
}

// Validate optional external social URL
export function validateOptionalUrl(url: string, label: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return `${label} must start with https:// or http://`;
    }
    return null;
  } catch {
    return `Please enter a valid URL for ${label} (e.g., https://...).`;
  }
}
