import { useEffect, useState } from "react";

import { apiClient } from "@/api/client";

/**
 * Subscribes to the shared ApiClient's in-flight refresh flag.
 *
 * `apiClient.isRefreshing` is a plain field, so reading it in a component
 * captures one render's value and never re-renders when a token refresh
 * starts or finishes. This hook bridges the client's refresh-state
 * notifications into React state, letting UI show a "refreshing session…"
 * indicator while a 401 retry or the boot refresh is in flight.
 *
 * @returns {boolean} true while a token refresh is in progress
 */
export const useIsRefreshing = () => {
  // Seeded from the live flag so a refresh already in flight at mount (the
  // AuthProvider boot refresh) is reflected on the first render.
  const [isRefreshing, setIsRefreshing] = useState(apiClient.isRefreshing);

  useEffect(() => {
    const unsubscribe = apiClient.onRefreshStateChange(setIsRefreshing);
    return () => {
      unsubscribe();
    };
  }, []);

  return isRefreshing;
};
