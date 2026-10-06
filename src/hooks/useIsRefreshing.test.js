import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { useIsRefreshing } from "./useIsRefreshing";

vi.mock("@/api/client", () => ({
  apiClient: {
    isRefreshing: false,
    onRefreshStateChange: vi.fn(),
  },
}));

describe("useIsRefreshing", () => {
  let listener;
  let unsubscribe;

  beforeEach(() => {
    apiClient.isRefreshing = false;
    listener = null;
    unsubscribe = vi.fn();
    apiClient.onRefreshStateChange.mockReset().mockImplementation((cb) => {
      listener = cb;
      return unsubscribe;
    });
  });

  it("seeds from the current refresh state at mount", () => {
    apiClient.isRefreshing = true;

    const { result } = renderHook(() => useIsRefreshing());

    expect(result.current).toBe(true);
  });

  it("updates as the client reports refresh transitions", () => {
    const { result } = renderHook(() => useIsRefreshing());
    expect(result.current).toBe(false);

    act(() => listener(true));
    expect(result.current).toBe(true);

    act(() => listener(false));
    expect(result.current).toBe(false);
  });

  it("unsubscribes from the client on unmount", () => {
    const { unmount } = renderHook(() => useIsRefreshing());

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
