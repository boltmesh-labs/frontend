// Exported so callers that leave the SPA entirely (e.g. Login's OAuth provider
// redirect) reuse the exact same base URL as axios instead of reaching into
// apiClient.authApi.defaults.baseURL.
const DEFAULT_API_BASE_URL = 'http://localhost:8000/v1';
const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

const getApiBaseUrl = () => {
  if (!configuredApiBaseUrl) {
    if (import.meta.env.PROD) {
      throw new Error('VITE_API_URL must be configured for production builds.');
    }
    return DEFAULT_API_BASE_URL;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(configuredApiBaseUrl);
  } catch {
    throw new Error('VITE_API_URL must be a valid absolute URL.');
  }

  if (import.meta.env.PROD && parsedUrl.protocol !== 'https:') {
    throw new Error('VITE_API_URL must use HTTPS in production.');
  }

  return configuredApiBaseUrl.replace(/\/$/, '');
};

export const API_BASE_URL = getApiBaseUrl();
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
