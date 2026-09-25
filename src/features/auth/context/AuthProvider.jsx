import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { AuthContext } from './AuthContext';

// Decodes JWT claims for UX only (identity display, role-gated navigation).
// The signature is intentionally NOT verified here — every request is
// re-validated server-side, so these values must never gate data on their own.
const parseUser = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    // Add missing padding if needed
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync state locally (does NOT trigger apiClient listeners again)
  const applyTokenState = useCallback((token) => {
    setAccessTokenState(token);
    setUser(parseUser(token));
  }, []);

  // Update both apiClient and local React state
  const updateAuthState = useCallback(
    (token) => {
      if (token) {
        apiClient.setToken(token); // Triggers listener -> applyTokenState
      } else {
        apiClient.clearAuth();
      }
      applyTokenState(token);
    },
    [applyTokenState]
  );

  // Subscribe to automatic token updates originating from ApiClient
  useEffect(() => {
    const unsubscribe = apiClient.onTokenRefreshed((newToken) => {
      applyTokenState(newToken);
    });

    return () => {
      unsubscribe?.();
    };
  }, [applyTokenState]);

  const logout = useCallback(async () => {
    await apiClient.api.post('/auth/logout');
    updateAuthState(null);
  }, [updateAuthState]);

  const updateUser = useCallback((nextUser) => {
    setUser((prev) => {
      if (!prev || !nextUser) return prev;
      return {
        ...prev,
        id: nextUser.id ?? prev.id,
        role: nextUser.role ?? prev.role,
      };
    });
  }, []);

  // Initial boot-up: perform silent refresh. Boot must run exactly once per
  // page load: the guard stops StrictMode's double-mounted effect from firing
  // two concurrent refreshes (same pattern as processedRef in OAuthCallback),
  // where a racing second call could clear a just-established session when
  // refresh cookies rotate.
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    apiClient.authApi
      .post('/auth/refresh-token')
      .then(({ data }) => updateAuthState(data.access_token))
      .catch(() => updateAuthState(null))
      .finally(() => setLoading(false));
  }, [updateAuthState]);

  const value = useMemo(
    () => ({ accessToken, setAccessToken: updateAuthState, user, loading, logout, updateUser }),
    [accessToken, updateAuthState, user, loading, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
