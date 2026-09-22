/**
 * Formats a millisecond duration for countdown displays.
 * @param {number} ms
 * @param {'mmss'|'long'} [style='mmss'] - 'mmss' -> "04:05", 'long' -> "1h 5m" / "4m 5s"
 * @returns {string}
 */
export const formatCountdown = (ms, style = 'mmss') => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (style === 'long') {
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
};
