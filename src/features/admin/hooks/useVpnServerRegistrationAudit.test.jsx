import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { useVpnServerRegistrationAudit } from "./useVpnServerRegistrationAudit";

vi.mock("@/api/client", () => ({
  apiClient: { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } },
}));

const wrapper = ({ children }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useVpnServerRegistrationAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the paginated server registration audit log", async () => {
    const page = { data: [{ id: "log1" }], total_count: 1 };
    apiClient.api.get.mockResolvedValue({ data: page });

    const { result } = renderHook(
      () => useVpnServerRegistrationAudit({ skip: 0, limit: 20 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.api.get).toHaveBeenCalledWith(
      "/admin/audit/server-registration-logs",
      {
        params: { skip: 0, limit: 20 },
      },
    );
    expect(result.current.data).toEqual(page);
  });
});
