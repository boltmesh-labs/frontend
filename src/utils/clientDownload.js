// The client's release pipeline (client/.github/workflows/release.yml) uploads
// fastforge artifacts named by flutter_app_packager's template
// `{name}-{build_name}+{build_number}-{platform}[-setup].{ext}`, so a release
// carries e.g. `boltmesh-0.1.0+1-windows-setup.exe` and
// `boltmesh-0.1.0+1-linux.deb`. The version is part of every name, which rules
// out the versionless `releases/latest/download/<name>` shortcut: the asset URL
// has to be read back from the API.
export const CLIENT_REPO = "boltmesh-labs/client";

export const RELEASES_URL = `https://github.com/${CLIENT_REPO}/releases/latest`;

export const LATEST_RELEASE_URL = `https://api.github.com/repos/${CLIENT_REPO}/releases/latest`;

// Suffix matches, not exact names: the version in each filename moves with
// every tag, and a release also carries SBOMs, SHA256SUMS and cosign bundles
// that must not be mistaken for an installer.
export const ASSET_PATTERNS = {
  windows: /-windows-setup\.exe$/i,
  linuxDeb: /-linux\.deb$/i,
  linuxRpm: /-linux\.rpm$/i,
};

/**
 * Resolves the visitor's OS from the browser alone. Android is checked before
 * Linux and iOS before macOS because their user agents contain the other
 * token. iPadOS 13+ drops the "iPad" token entirely and reports MacIntel, so
 * the touch-point count is what separates it from a real Mac.
 */
export const detectClientPlatform = () => {
  const source = navigator.userAgentData?.platform || navigator.userAgent || "";

  if (/android/i.test(source)) return "android";
  if (/iphone|ipad|ipod/i.test(source)) return "ios";
  if (/mac/i.test(source) && navigator.maxTouchPoints > 1) return "ios";
  if (/win/i.test(source)) return "windows";
  if (/mac/i.test(source)) return "macos";
  if (/linux|x11/i.test(source)) return "linux";
  return "other";
};

export const pickAssetUrl = (release, pattern) =>
  release?.assets?.find((asset) => pattern.test(asset.name))
    ?.browser_download_url ?? null;
