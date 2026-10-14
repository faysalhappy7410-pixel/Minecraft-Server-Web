// Official PRO PLAYERS Firebase Configuration
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);

function resolveConfigValue(envVal: string | undefined, fallbackVal: string): string {
  if (envVal && envVal.trim() !== '' && !envVal.startsWith('YOUR_')) {
    return envVal.trim();
  }
  return fallbackVal;
}

export const firebaseConfig = {
  apiKey: resolveConfigValue(
    env.VITE_FIREBASE_API_KEY,
    'AIzaSyCorFqMJsIeOXBjvQOnos6qGcR5vIJJ2-o'
  ),
  authDomain: resolveConfigValue(
    env.VITE_FIREBASE_AUTH_DOMAIN,
    'pro-players-152e9.firebaseapp.com'
  ),
  projectId: resolveConfigValue(
    env.VITE_FIREBASE_PROJECT_ID,
    'pro-players-152e9'
  ),
  storageBucket: resolveConfigValue(
    env.VITE_FIREBASE_STORAGE_BUCKET,
    'pro-players-152e9.firebasestorage.app'
  ),
  messagingSenderId: resolveConfigValue(
    env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    '673328220395'
  ),
  appId: resolveConfigValue(
    env.VITE_FIREBASE_APP_ID,
    '1:673328220395:web:112afdfb394e46c0df56ae'
  ),
  measurementId: resolveConfigValue(
    env.VITE_FIREBASE_MEASUREMENT_ID,
    'G-YMWNW6ZXKC'
  ),
};

// Hardcoded Master Admin / Super Admin Emails
export const SUPER_ADMIN_EMAILS: readonly string[] = [
  'faysalhappy7410@gmail.com',
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some(
    (adminEmail) => adminEmail.trim().toLowerCase() === normalized
  );
}

export default firebaseConfig;
