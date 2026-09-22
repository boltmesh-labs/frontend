// 1. Single source of truth map for O(1) lookups
export const PLATFORM_MAP = {
  android: 'Android',
  ios: 'iOS',
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  other: 'Other',
};

// 2. Options array derived directly from the map
export const PLATFORM_OPTIONS = Object.entries(PLATFORM_MAP).map(([value, label]) => ({
  value,
  label,
}));

// 3. Helper function with case-insensitive fallback
export const getPlatformLabel = (platformKey) => {
  if (!platformKey) return '—';
  const key = String(platformKey).toLowerCase();
  return PLATFORM_MAP[key] || platformKey;
};
