import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/api/queryClient";
import { detectClientPlatform } from "@/utils/clientDownload";
import { ClientDownload } from "./ClientDownload";

vi.mock("@/utils/clientDownload", async (importOriginal) => ({
  ...(await importOriginal()),
  detectClientPlatform: vi.fn(),
}));

const RELEASES_URL = "https://github.com/boltmesh-labs/client/releases/latest";

const release = {
  assets: [
    {
      name: "boltmesh-0.1.0+1-linux.deb",
      browser_download_url: "https://x/deb",
    },
    {
      name: "boltmesh-0.1.0+1-linux.rpm",
      browser_download_url: "https://x/rpm",
    },
    {
      name: "boltmesh-0.1.0+1-windows-setup.exe",
      browser_download_url: "https://x/exe",
    },
  ],
};

const fetchMock = vi.fn();

const renderControl = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ClientDownload />
    </QueryClientProvider>,
  );

const mockPlatform = (platform) =>
  vi.mocked(detectClientPlatform).mockReturnValue(platform);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClientDownload", () => {
  it("links Windows visitors straight to the installer", async () => {
    mockPlatform("windows");
    fetchMock.mockResolvedValue({ ok: true, json: async () => release });
    renderControl();

    const link = screen.getByRole("link", { name: /download for windows/i });
    await waitFor(() => expect(link).toHaveAttribute("href", "https://x/exe"));
    expect(screen.getByRole("link", { name: /all releases/i })).toHaveAttribute(
      "href",
      RELEASES_URL,
    );
  });

  it("offers both Linux packages, since a browser cannot tell deb from rpm", async () => {
    mockPlatform("linux");
    fetchMock.mockResolvedValue({ ok: true, json: async () => release });
    renderControl();

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /\.deb/i })).toHaveAttribute(
        "href",
        "https://x/deb",
      ),
    );
    expect(screen.getByRole("link", { name: /\.rpm/i })).toHaveAttribute(
      "href",
      "https://x/rpm",
    );
  });

  it("sends platforms without an installer to the releases page", async () => {
    mockPlatform("macos");
    fetchMock.mockResolvedValue({ ok: true, json: async () => release });
    renderControl();

    expect(
      screen.getByRole("link", { name: /download boltmesh client/i }),
    ).toHaveAttribute("href", RELEASES_URL);
    // Nothing to resolve on these platforms, so the API is never called.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the releases page when the lookup fails", async () => {
    mockPlatform("windows");
    fetchMock.mockRejectedValue(new Error("offline"));
    renderControl();

    const link = screen.getByRole("link", { name: /download for windows/i });
    expect(link).toHaveAttribute("href", RELEASES_URL);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(link).toHaveAttribute("href", RELEASES_URL);
  });
});
