import axios from "axios";

import { API_BASE_URL } from "@/utils/config";

// One timeout shared by both axios instances so auth and API calls can't drift.
const REQUEST_TIMEOUT_MS = 10000;

// 401 TOKEN_ROTATION_RACE means a concurrent client rotated the refresh cookie
// first. The backend deliberately preserves the cookie for this code (see
// exception_handlers.py), so the session is still alive and only the winner's
// Set-Cookie has yet to reach the cookie jar. Retrying immediately would
// resubmit the same stale cookie and earn the same 401, hence the delay.
// Attempts are bounded so a session that is genuinely dead still terminates.
const RACE_RETRY_DELAY_MS = 200;
const RACE_RETRY_ATTEMPTS = 2;

const isRotationRace = (error) =>
  error?.response?.status === 401 &&
  error.response.data?.code === "TOKEN_ROTATION_RACE";

// The backend reserves 401 on this endpoint for a session that is genuinely
// dead, and clears the refresh cookie with it (except on the soft-retry cases
// already retried above). Everything else that can go wrong here — a network
// blip, a timeout, a 5xx, the 30/min refresh rate limit, the CSRF origin
// check — says nothing about the session, so the in-memory token has to
// survive it: dropping it bounces the user to the login screen while a
// perfectly good refresh cookie is still sitting in the jar.
const isSessionDead = (error) => error?.response?.status === 401;

export class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.accessToken = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.listeners = new Set();

    this.authApi = axios.create({
      baseURL,
      timeout: REQUEST_TIMEOUT_MS,
      withCredentials: true,
    });
    this.api = axios.create({
      baseURL,
      timeout: REQUEST_TIMEOUT_MS,
      withCredentials: true,
    });

    this._initInterceptors();
  }

  setToken(token) {
    // Re-applying the same token (redundant boot refresh, repeated clearAuth)
    // must not re-notify: listeners re-derive state from the token, so a no-op
    // change would only trigger redundant work downstream.
    if (this.accessToken === token) return;
    this.accessToken = token;
    this.listeners.forEach((cb) => {
      try {
        cb(token);
      } catch (err) {
        console.error("Token listener error:", err);
      }
    });
  }

  onTokenRefreshed(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  clearAuth() {
    this.setToken(null);
    this.isRefreshing = false;
  }

  // Single entry point for every refresh in the app (401 interceptor,
  // AuthProvider boot, OAuthCallback). Concurrent callers share the in-flight
  // request instead of each presenting the same cookie, which is what provokes
  // a rotation race in the first place. Every caller awaiting the shared
  // promise rejects with it, but auth is only cleared when the backend
  // reported a dead session (401) — a transient failure stays retryable.
  refresh() {
    if (!this.refreshPromise) {
      this.isRefreshing = true;
      this.refreshPromise = this._postRefresh()
        .then((token) => {
          this.setToken(token);
          return token;
        })
        .catch((error) => {
          if (isSessionDead(error)) {
            this.clearAuth();
          }
          throw error;
        })
        .finally(() => {
          this.isRefreshing = false;
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  async _postRefresh() {
    for (let attempt = 0; ; attempt++) {
      try {
        const { data } = await this.authApi.post("/auth/refresh-token");
        if (!data?.access_token) {
          throw new Error("Refresh response did not include an access token.");
        }
        return data.access_token;
      } catch (error) {
        // Another client won the rotation: the cookie it just set is still
        // valid, so give it a beat to land and present that one instead.
        if (!isRotationRace(error) || attempt >= RACE_RETRY_ATTEMPTS) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, RACE_RETRY_DELAY_MS),
        );
      }
    }
  }

  _initInterceptors() {
    this.api.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.set("Authorization", `Bearer ${this.accessToken}`);
      }
      return config;
    });

    this.api.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;

        if (
          !originalRequest ||
          error.response?.status !== 401 ||
          originalRequest._retry
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        // Any 401 on this instance is deliberately treated as "access token
        // expired". The backend reserves 401 exclusively for session-auth
        // failures (business rules return 400/403) and its global handler
        // clears the refresh cookie on terminal 401s, so every 401 here
        // warrants exactly one refresh attempt — including when no token is
        // held in memory, which is how a valid cookie session silently
        // restores itself after a full page reload (see client.test.js).
        // Login/refresh calls go through this.authApi, which has no
        // interceptors and therefore never re-enters this flow. A concurrent
        // rotation reported by the backend is retried inside refresh() rather
        // than being taken as a dead session.

        const token = await this.refresh();
        originalRequest.headers.set("Authorization", `Bearer ${token}`);
        return this.api(originalRequest);
      },
    );
  }
}

export const apiClient = new ApiClient();
