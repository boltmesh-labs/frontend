import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./AuthContext";

// State syncs exclusively through the onTokenRefreshed listener, so the mock
// routes setToken/clearAuth through the registered callback. The rest of the
// module (isSessionDead) stays real so the boot policy under test is the
// shipped one.
const hoisted = vi.hoisted(() => ({ listener: null }));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    apiClient: {
      api: { post: vi.fn() },
      refresh: vi.fn(),
      setToken: vi.fn((token) => hoisted.listener?.(token)),
      clearAuth: vi.fn(() => hoisted.listener?.(null)),
      onTokenRefreshed: vi.fn((cb) => {
        hoisted.listener = cb;
        return () => {
          hoisted.listener = null;
        };
      }),
    },
  };
});

const b64url = (value) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const makeToken = (payload) =>
  `${b64url({ alg: "none" })}.${b64url(payload)}.sig`;

const renderWithProvider = () => {
  let captured;
  const Probe = () => {
    captured = useAuth();
    return <div />;
  };
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  return { view, getContext: () => captured };
};

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("boots via silent refresh and parses the JWT identity", async () => {
    apiClient.refresh.mockResolvedValue(
      makeToken({ sub: "u1", role: "admin" }),
    );

    const { getContext } = renderWithProvider();

    await waitFor(() => expect(getContext().loading).toBe(false));
    expect(apiClient.refresh).toHaveBeenCalled();
    expect(getContext().accessToken).toBeTypeOf("string");
    expect(getContext().user).toEqual({ id: "u1", role: "admin" });
    expect(apiClient.setToken).toHaveBeenCalled();
  });

  it("clears auth when the silent refresh reports a dead session", async () => {
    // A 401 from the refresh endpoint means the backend cleared the
    // session cookie: terminal, so no transient retries.
    apiClient.refresh.mockRejectedValue({ response: { status: 401 } });

    const { getContext } = renderWithProvider();

    await waitFor(() => expect(getContext().loading).toBe(false));
    expect(apiClient.refresh).toHaveBeenCalledTimes(1);
    expect(apiClient.clearAuth).toHaveBeenCalled();
    expect(getContext().accessToken).toBeNull();
    expect(getContext().user).toBeNull();
  });

  it("retries a transient boot failure while keeping the gate closed", async () => {
    vi.useFakeTimers();
    try {
      // Two transient failures (no response verdict) then success.
      apiClient.refresh
        .mockRejectedValueOnce(new Error("network blip"))
        .mockRejectedValueOnce(new Error("network blip"))
        .mockResolvedValue(makeToken({ sub: "u1", role: "user" }));

      const { getContext } = renderWithProvider();

      // First failure plus its backoff (BOOT_RETRY_DELAY_MS): the
      // auth gate stays closed — a child query must not fire with a
      // null token — and exactly one retry has run.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(501);
      });
      expect(getContext().loading).toBe(true);
      expect(apiClient.refresh).toHaveBeenCalledTimes(2);

      // Second failure plus backoff, then the shared refresh succeeds.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(501);
      });
      expect(getContext().loading).toBe(false);
      expect(apiClient.refresh).toHaveBeenCalledTimes(3);
      expect(getContext().accessToken).toBeTypeOf("string");
      expect(getContext().user).toEqual({ id: "u1", role: "user" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up and clears auth after exhausting transient retries", async () => {
    vi.useFakeTimers();
    try {
      apiClient.refresh.mockRejectedValue(new Error("offline"));

      const { getContext } = renderWithProvider();

      // Initial attempt plus BOOT_RETRY_ATTEMPTS retries and their
      // backoffs (3 calls, 2 × BOOT_RETRY_DELAY_MS) all fit in one
      // advance.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1501);
      });

      expect(apiClient.refresh).toHaveBeenCalledTimes(3);
      expect(apiClient.clearAuth).toHaveBeenCalled();
      expect(getContext().loading).toBe(false);
      expect(getContext().accessToken).toBeNull();
      expect(getContext().user).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the session tokenless when the JWT cannot be parsed", async () => {
    apiClient.refresh.mockResolvedValue(".%%%.sig");

    const { getContext } = renderWithProvider();

    await waitFor(() => expect(getContext().loading).toBe(false));
    expect(getContext().accessToken).toBeTypeOf("string");
    expect(getContext().user).toBeNull();
  });

  it("clears local state after a successful logout", async () => {
    apiClient.refresh.mockResolvedValueOnce(
      makeToken({ sub: "u1", role: "user" }),
    );
    apiClient.api.post.mockResolvedValueOnce({ data: {} });

    const { getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    await act(async () => {
      await getContext().logout();
    });

    expect(apiClient.api.post).toHaveBeenCalledWith("/auth/logout");
    expect(apiClient.clearAuth).toHaveBeenCalled();
    expect(getContext().accessToken).toBeNull();
  });

  it("keeps the local session when logout fails", async () => {
    apiClient.refresh.mockResolvedValueOnce(
      makeToken({ sub: "u1", role: "user" }),
    );
    apiClient.api.post.mockRejectedValueOnce(new Error("network down"));

    const { getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    await act(async () => {
      await expect(getContext().logout()).rejects.toThrow("network down");
    });

    expect(apiClient.clearAuth).not.toHaveBeenCalled();
    expect(getContext().accessToken).toBeTypeOf("string");
    expect(getContext().user).toEqual({ id: "u1", role: "user" });
  });

  it("updateUser merges profile changes into the current identity", async () => {
    apiClient.refresh.mockResolvedValue(makeToken({ sub: "u1", role: "user" }));

    const { getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    act(() => getContext().updateUser({ id: "u1", role: "admin" }));

    expect(getContext().user).toEqual({ id: "u1", role: "admin" });
    // No previous user: merge must be a no-op rather than fabricate one.
    act(() => getContext().setAccessToken(null));
    act(() => getContext().updateUser({ id: "x", role: "admin" }));
    expect(getContext().user).toBeNull();
  });

  it("adopts tokens pushed by ApiClient-driven refreshes", async () => {
    let listener;
    apiClient.onTokenRefreshed.mockImplementationOnce((fn) => {
      listener = fn;
      return vi.fn();
    });
    // Dead session: boot completes immediately (no transient retries)
    // and leaves the context tokenless for the listener-driven update.
    apiClient.refresh.mockRejectedValue({ response: { status: 401 } });

    const { view, getContext } = renderWithProvider();
    await waitFor(() => expect(getContext().loading).toBe(false));

    act(() => listener(makeToken({ sub: "u9", role: "user" })));
    view.rerender(
      <AuthProvider>
        <div />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(getContext().user).toEqual({ id: "u9", role: "user" }),
    );
  });
});
