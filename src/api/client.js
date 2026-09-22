import axios from 'axios';

import { API_BASE_URL } from '@/utils/config';

// One timeout shared by both axios instances so auth and API calls can't drift.
const REQUEST_TIMEOUT_MS = 10000;

export class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.accessToken = null;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.listeners = new Set();

    this.authApi = axios.create({ baseURL, timeout: REQUEST_TIMEOUT_MS, withCredentials: true });
    this.api = axios.create({ baseURL, timeout: REQUEST_TIMEOUT_MS, withCredentials: true });

    this._initInterceptors();
  }

  setToken(token) {
    this.accessToken = token;
    this.listeners.forEach((cb) => {
      try {
        cb(token);
      } catch (err) {
        console.error('Token listener error:', err);
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
    this._processQueue(new axios.AxiosError('Auth cleared', 'ERR_CANCELED'));
  }

  _processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
    this.failedQueue = [];
  }

  _initInterceptors() {
    this.api.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.set('Authorization', `Bearer ${this.accessToken}`);
      }
      return config;
    });

    this.api.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;

        if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
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
        // interceptors and therefore never re-enters this flow.

        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            return this.api(originalRequest);
          });
        }

        this.isRefreshing = true;

        try {
          const { data } = await this.authApi.post('/auth/refresh-token');
          const newToken = data.access_token;

          this.setToken(newToken);
          this._processQueue(null, newToken);

          originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          return this.api(originalRequest);
        } catch (refreshErr) {
          this._processQueue(refreshErr);
          this.clearAuth();
          return Promise.reject(refreshErr);
        } finally {
          this.isRefreshing = false;
        }
      }
    );
  }
}

export const apiClient = new ApiClient();
