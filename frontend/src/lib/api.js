/**
 * Resolves API base URL for desktop, LAN, and ngrok/mobile access.
 * - Use VITE_API_URL=/api with Vite proxy (recommended for ngrok → frontend tunnel)
 * - Or set VITE_API_URL=https://your-backend.ngrok.app/api for a separate API tunnel
 */
export function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const { hostname } = window.location;
  const onLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (envUrl.startsWith('/')) {
    return envUrl.replace(/\/$/, '') || '/api';
  }

  if (envUrl && /localhost|127\.0\.0\.1/i.test(envUrl) && !onLocalhost) {
    return '/api';
  }

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Hosted frontend without VITE_API_URL at build time (e.g. Vercel env missing)
  if (!onLocalhost) {
    return 'https://gadkille-backend-clean.onrender.com/api';
  }

  return '/api';
}

/** Origin for API-served media (/images, /uploads) */
export function getApiOrigin() {
  const base = getApiBaseUrl();
  if (base.startsWith('http')) {
    return base.replace(/\/api\/?$/i, '');
  }
  return window.location.origin;
}

/**
 * Resolve image/video paths for dev and production.
 * - Absolute URLs (https://...) unchanged
 * - /images/ and /uploads/ → API host (Render backend)
 * - Other root paths (/hero-fort.png) → frontend static files
 */
export function resolveMediaUrl(path) {
  if (!path) return '';
  const value = String(path).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/(images|uploads)\//i.test(value)) {
    return `${getApiOrigin()}${value}`;
  }
  if (value.startsWith('/')) return value;
  return value;
}

/** Full URL to start Google OAuth (must hit the backend, not the static frontend host). */
export function getGoogleAuthUrl() {
  const base = `${getApiOrigin()}/api/auth/google`;
  const returnTo = encodeURIComponent(window.location.origin);
  return `${base}?returnTo=${returnTo}`;
}
