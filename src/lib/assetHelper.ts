import defaultBackground from '../assets/images/pro_players_ender_bg_1791687106870.jpg';
import defaultLogo from '../../public/pro-players-logo.png';

export const FALLBACK_BACKGROUND_URL = defaultBackground || '/ender-bg.jpg';
export const FALLBACK_LOGO_URL = defaultLogo || '/pro-players-logo.png';

/**
 * Normalizes image paths so that paths saved as `/src/assets/images/...`
 * or relative paths are properly resolved in both Vite development and
 * production builds (/assets/images/... or public assets).
 */
export function normalizeAssetUrl(url?: string | null, fallback = FALLBACK_BACKGROUND_URL): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const clean = url.trim();

  // Handle /src/assets/images/... paths stored in Firestore
  if (clean.startsWith('/src/assets/images/')) {
    return clean.replace('/src/assets/images/', '/assets/images/');
  }

  // Handle src/assets/images/... without leading slash
  if (clean.startsWith('src/assets/images/')) {
    return '/' + clean.replace('src/assets/images/', 'assets/images/');
  }

  return clean;
}
