import { afterEach, describe, expect, it } from "vitest";

import {
  ASSET_PATTERNS,
  detectClientPlatform,
  pickAssetUrl,
} from "./clientDownload";

const setNavigator = ({
  userAgent = "",
  userAgentData,
  maxTouchPoints = 0,
}) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
  Object.defineProperty(window.navigator, "userAgentData", {
    value: userAgentData,
    configurable: true,
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
};

const UA = {
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  macos:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  linux:
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
};

const release = {
  tag_name: "v0.1.0",
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
    { name: "SHA256SUMS", browser_download_url: "https://x/sums" },
    {
      name: "boltmesh-0.1.0+1-linux.deb.sigstore.json",
      browser_download_url: "https://x/sig",
    },
    {
      name: "boltmesh-v0.1.0.spdx.json",
      browser_download_url: "https://x/sbom",
    },
  ],
};

afterEach(() => {
  setNavigator({});
});

describe("detectClientPlatform", () => {
  it("detects Windows", () => {
    setNavigator({ userAgent: UA.windows });
    expect(detectClientPlatform()).toBe("windows");
  });

  it("detects macOS", () => {
    setNavigator({ userAgent: UA.macos });
    expect(detectClientPlatform()).toBe("macos");
  });

  it("detects Linux", () => {
    setNavigator({ userAgent: UA.linux });
    expect(detectClientPlatform()).toBe("linux");
  });

  it("detects Android before the Linux token in its user agent", () => {
    setNavigator({ userAgent: UA.android });
    expect(detectClientPlatform()).toBe("android");
  });

  it("detects iOS before the macOS token in its user agent", () => {
    setNavigator({ userAgent: UA.ipad });
    expect(detectClientPlatform()).toBe("ios");
  });

  it("treats iPadOS desktop mode as iOS, not macOS", () => {
    setNavigator({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 5 });
    expect(detectClientPlatform()).toBe("ios");
  });

  it("prefers the high-entropy userAgentData platform", () => {
    setNavigator({
      userAgent: UA.linux,
      userAgentData: { platform: "Windows" },
    });
    expect(detectClientPlatform()).toBe("windows");
  });

  it("falls back to other for an unrecognised user agent", () => {
    setNavigator({ userAgent: "curl/8.5.0" });
    expect(detectClientPlatform()).toBe("other");
  });
});

describe("pickAssetUrl", () => {
  it("matches each installer by suffix", () => {
    expect(pickAssetUrl(release, ASSET_PATTERNS.windows)).toBe("https://x/exe");
    expect(pickAssetUrl(release, ASSET_PATTERNS.linuxDeb)).toBe(
      "https://x/deb",
    );
    expect(pickAssetUrl(release, ASSET_PATTERNS.linuxRpm)).toBe(
      "https://x/rpm",
    );
  });

  it("never mistakes an SBOM, checksum or signature for an installer", () => {
    const urls = Object.values(ASSET_PATTERNS).map((pattern) =>
      pickAssetUrl(release, pattern),
    );
    expect(urls).not.toContain("https://x/sums");
    expect(urls).not.toContain("https://x/sig");
    expect(urls).not.toContain("https://x/sbom");
  });

  it("returns null when the release carries no matching asset", () => {
    expect(pickAssetUrl(release, /-macos\.dmg$/i)).toBeNull();
    expect(pickAssetUrl(undefined, ASSET_PATTERNS.windows)).toBeNull();
    expect(pickAssetUrl({ assets: [] }, ASSET_PATTERNS.windows)).toBeNull();
  });
});
