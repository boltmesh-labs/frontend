import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, isSessionDead } from "@/api/client";
import { AuthContext } from "./AuthContext";

// Decodes JWT claims for UX only (identity display, role-gated navigation).
// The signature is intentionally NOT verified here — every request is
// re-validated server-side, so these values must never gate data on their own.
const parseUser = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    // Add missing padding if needed
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
};

// Boot refresh policy: only a 401 means the session is dead
// (see isSessionDead). Transient failures are retried with a short
// backoff while the route guards keep showing their loaders.
const BOOT_RETRY_ATTEMPTS = 2;
const BOOT_RETRY_DELAY_MS = 500;

// The timeout id is intentionally not tracked for cleanup: StrictMode's
// double-mount would clear the pending retry and leave the boot gate
// closed forever in dev.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthProvider = ({ children }) => {
  // `setAccessTokenState`, not `setAccessToken`: the latter is this provider's
  // public context API (it writes through to apiClient as well as React state),
  // so the raw useState setter is deliberately named to avoid shadowing it.
  // eslint-disable-next-line @eslint-react/use-state
  const [accessToken, setAccessTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync state locally (does NOT trigger apiClient listeners again)
  const applyTokenState = useCallback((token) => {
    setAccessTokenState(token);
    setUser(parseUser(token));
  }, []);

  // Sync apiClient only; the onTokenRefreshed listener above is the single
  // path that applies token changes to React state.
  const updateAuthState = useCallback((token) => {
    if (token) {
      apiClient.setToken(token);
    } else {
      apiClient.clearAuth();
    }
  }, []);

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
    await apiClient.api.post("/auth/logout");
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

  // Initial boot-up: perform silent refresh. The call goes through
  // apiClient.refresh(), so boot shares any refresh already in flight
  // (the interceptor after a 401, OAuthCallback) instead of racing it
  // with a second rotation of the same cookie. The ref still runs boot
  // exactly once per page load, keeping StrictMode's double-mounted
  // effect from applying the result twice.
  //
  // Failure policy mirrors apiClient's: only a 401 means the session
  // is dead. A transient failure (network blip, 5xx, the refresh rate
  // limit) says nothing about the session, so boot retries the shared
  // refresh while the route guards keep showing their loaders —
  // dropping to /login here would bounce the user while the refresh
  // cookie is still valid, and any query that 401s afterwards would
  // silently re-authenticate them on the login page.
  //
  // No cleanup/cancellation: StrictMode's double-mount reuses the same
  // fiber, so discarding the result in a cleanup would leave the boot
  // gate closed forever in dev.
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const boot = async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const token = await apiClient.refresh();
          updateAuthState(token);
          return;
        } catch (error) {
          if (isSessionDead(error) || attempt >= BOOT_RETRY_ATTEMPTS) {
            updateAuthState(null);
            return;
          }
          await sleep(BOOT_RETRY_DELAY_MS);
        }
      }
    };

    boot().finally(() => setLoading(false));
  }, [updateAuthState]);

  const value = useMemo(
    () => ({
      accessToken,
      setAccessToken: updateAuthState,
      user,
      loading,
      logout,
      updateUser,
    }),
    [accessToken, updateAuthState, user, loading, logout, updateUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};
