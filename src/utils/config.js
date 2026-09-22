// Exported so callers that leave the SPA entirely (e.g. Login's OAuth provider
// redirect) reuse the exact same base URL as axios instead of reaching into
// apiClient.authApi.defaults.baseURL.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';
export const COMPANY_NAME = import.meta.env.VITE_APP_COMPANY_NAME || 'BoltMesh VPN';
export const SUPPORT_EMAIL = import.meta.env.VITE_APP_SUPPORT_EMAIL || 'support@example.com';

export const DEFAULT_PAGE_SIZE = 10;

// sessionStorage key carrying the post-login destination across the OAuth
// round-trip: written by Login before the provider redirect, consumed and
// cleared by OAuthCallback.
export const OAUTH_REDIRECT_FROM_KEY = 'oauth_redirect_from';

/**
 * Guards redirect targets against open-redirect vectors. Only same-app
 * absolute paths ("/dashboard") are allowed; protocol-relative URLs
 * ("//evil.com"), scheme-bearing strings, and non-strings fall back.
 */
export const sanitizeRedirectPath = (path, fallback = '/dashboard') => {
  if (typeof path !== 'string') return fallback;
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
};
